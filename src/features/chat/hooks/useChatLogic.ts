import { useState, useRef, useEffect, useCallback } from 'react';
import { VaultData, FileNode } from '../../../types/vault';
import { renderMarkdown } from '../../../lib/editor/markdownRenderer';
import { RAGPipeline } from '../../rag/services/ragPipeline';
import { executeWithFailover } from '../../../lib/ai/failoverAdapter';
import { balancedCascade, speedCascade } from '../../../lib/ai/cascadeProfiles';
import { getAllLocalKeyOverrides } from '../../../lib/ai/keyManager';
import { ChatSessionRecord, ChatMessageRecord } from '../../../lib/db';
import { 
  getAllChatSessions, 
  createChatSession, 
  renameChatSession, 
  deleteChatSession, 
  getSessionMessages, 
  saveChatMessage,
  deleteChatMessages 
} from '../services/chatStorage';

export type ChatMode = 'rag' | 'current';
export type QueryIntent = 'CHITCHAT' | 'QUERY';

// Ultra-Fast Local Intent Classifier
function classifyQueryIntent(query: string): QueryIntent {
  const qLower = query.toLowerCase().trim();
  
  // Fast rule-based checks for instant zero-latency response on basic greetings
  const chitchatPatterns = [
    /^(halo|hai|hi|hello|pagi|siang|malam|sore|selamat|permisi|p|ping)$/i,
    /^(terima kasih|makasih|thanks|thank you|thx|ok|oke|siap|mantap|keren|sipp|sip)$/i,
    /^(siapa kamu|siapa namamu|bisa bantu apa|kamu siapa|fungsi kamu|apa tugasmu)\??$/i,
    /^(apa kabar|gimana kabar|sehat)\??$/i,
    /^(bye|dadah|sampai jumpa|goodbye)$/i
  ];

  if (chitchatPatterns.some((pattern) => pattern.test(qLower))) {
    return 'CHITCHAT';
  }

  // Short casual greeting phrases
  if (qLower.length < 15 && !/(apa|bagaimana|mengapa|kenapa|siapa|dimana|kapan|berapa|bisakah|tolong|cara|jelaskan|buatkan|berikan|sebutkan|\?)/i.test(qLower)) {
    if (/^(halo|hai|hi|hello|pagi|siang|malam|sore|p|ping|tes|test)/i.test(qLower)) {
      return 'CHITCHAT';
    }
  }

  return 'QUERY';
}

export function useChatLogic(vault: VaultData, activeTabId: string | null) {
  // Sessions & Messages State
  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);

  // Context Inspector Expand States per Message ID
  const [expandedContexts, setExpandedContexts] = useState<Record<string, boolean>>({});

  // Input & Settings
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<ChatMode>('rag');
  const [topK, setTopK] = useState<number>(5);
  const [threshold, setThreshold] = useState<number>(0.35);
  const [isProcessing, setIsProcessing] = useState(false);
  const [renderedHtmlMap, setRenderedHtmlMap] = useState<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isProcessingRef = useRef(false);

  const activeNode = activeTabId && vault.nodes[activeTabId] ? (vault.nodes[activeTabId] as FileNode) : null;
  const allNodes = Object.values(vault.nodes) as FileNode[];

  // Rendered Markdown cache ref (id + content -> html)
  const renderedCacheRef = useRef<Map<string, { content: string; html: string }>>(new Map());

  // Auto-scroll messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load chat sessions on mount
  const loadSessions = useCallback(async () => {
    try {
      const list = await getAllChatSessions();
      setSessions(list);
      if (list.length > 0 && !activeSessionId) {
        setActiveSessionId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    }
  }, [activeSessionId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Load messages when activeSessionId changes
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    let isMounted = true;

    const loadMsgs = async () => {
      const msgs = await getSessionMessages(activeSessionId);
      if (isMounted) {
        setMessages((prev) => {
          const map = new Map<string, ChatMessageRecord>();
          // DB records first
          msgs.forEach((m) => map.set(m.id, m));
          // Preserve any in-memory active streaming/unsaved messages
          prev.forEach((m) => {
            if (m.sessionId === activeSessionId && !map.has(m.id)) {
              map.set(m.id, m);
            }
          });
          return Array.from(map.values());
        });
      }
    };

    loadMsgs();
    return () => {
      isMounted = false;
    };
  }, [activeSessionId]);

  // Render markdown for assistant messages with caching
  useEffect(() => {
    let isMounted = true;
    const processMarkdown = async () => {
      const newMap: Record<string, string> = {};
      for (const msg of messages) {
        if (msg.role === 'assistant' && msg.content) {
          const cached = renderedCacheRef.current.get(msg.id);
          if (cached && cached.content === msg.content) {
            newMap[msg.id] = cached.html;
          } else {
            try {
              const html = await renderMarkdown(msg.content, vault.nodes);
              renderedCacheRef.current.set(msg.id, { content: msg.content, html });
              newMap[msg.id] = html;
            } catch (err) {
              newMap[msg.id] = `<p>${msg.content}</p>`;
            }
          }
        }
      }
      if (isMounted) {
        setRenderedHtmlMap(newMap);
      }
    };

    processMarkdown();
    return () => {
      isMounted = false;
    };
  }, [messages, vault.nodes]);

  // Toggle Context Inspector Accordion per Message
  const toggleContextInspector = useCallback((msgId: string) => {
    setExpandedContexts((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  }, []);

  // Start new clean chat
  const handleNewChat = useCallback((onCloseSidebar?: () => void) => {
    setActiveSessionId(null);
    setMessages([]);
    if (onCloseSidebar) {
      onCloseSidebar();
    }
  }, []);

  // Send Message Logic
  const handleSend = useCallback(async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setInput('');
    setIsProcessing(true);

    let currentSessionId = activeSessionId;
    let isNewSessionCreated = false;

    if (!currentSessionId) {
      const autoTitle = query.length > 25 ? query.substring(0, 25) + '...' : query;
      const newSess = await createChatSession(autoTitle);
      currentSessionId = newSess.id;
      setActiveSessionId(newSess.id);
      setSessions((prev) => [newSess, ...prev]);
      isNewSessionCreated = true;
    }

    const userMsgId = `msg_${crypto.randomUUID()}_usr`;
    const userMsg: ChatMessageRecord = {
      id: userMsgId,
      sessionId: currentSessionId,
      role: 'user',
      content: query,
      createdAt: new Date().toISOString(),
    };

    const aiMsgId = `msg_${crypto.randomUUID()}_ai`;
    const aiMsg: ChatMessageRecord = {
      id: aiMsgId,
      sessionId: currentSessionId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };

    await saveChatMessage(userMsg);
    setMessages((prev) => {
      const map = new Map<string, ChatMessageRecord>();
      prev.forEach((m) => map.set(m.id, m));
      map.set(userMsg.id, userMsg);
      map.set(aiMsg.id, aiMsg);
      return Array.from(map.values());
    });

    const currentSession = sessions.find((s) => s.id === currentSessionId);
    if (!isNewSessionCreated && currentSession && currentSession.title === 'Percakapan Baru' && messages.length === 0) {
      const autoTitle = query.length > 25 ? query.substring(0, 25) + '...' : query;
      await renameChatSession(currentSessionId, autoTitle);
      setSessions((prev) =>
        prev.map((s) => (s.id === currentSessionId ? { ...s, title: autoTitle } : s))
      );
    }

    await runAiPipeline(query, aiMsg);
  }, [input, activeSessionId, sessions, messages.length, mode, topK, threshold, activeNode]);

  // Core AI Stream Pipeline (Reusable for both standard send and message editing)
  const runAiPipeline = useCallback(async (query: string, aiMsg: ChatMessageRecord) => {
    try {
      const customKeys = getAllLocalKeyOverrides();

      // Step 1: Run Zero-Latency Smart Intent Classifier
      const intent = classifyQueryIntent(query);

      let contextText = '';
      let sources: Array<{ noteId: string; noteTitle: string }> = [];
      let chunksToSave: Array<{ noteId: string; noteTitle: string; snippet: string }> = [];

      if (mode === 'rag') {
        if (intent !== 'CHITCHAT') {
          // Perform RAG search for non-chitchat queries with error fallback
          try {
            const pipeline = new RAGPipeline(customKeys);
            const results = await pipeline.searchSimilarChunks(query, topK, threshold);

            if (results.length > 0) {
              contextText = results
                .map((r) => `[Catatan "${r.noteTitle}"]:\n${r.snippet}`)
                .join('\n\n');

              const uniqueSourceMap = new Map<string, string>();
              results.forEach((r) => {
                uniqueSourceMap.set(r.noteId, r.noteTitle);
              });
              sources = Array.from(uniqueSourceMap.entries()).map(([noteId, noteTitle]) => ({
                noteId,
                noteTitle,
              }));

              chunksToSave = results.map((r) => ({
                noteId: r.noteId,
                noteTitle: r.noteTitle,
                snippet: r.snippet,
              }));
            }
          } catch (ragErr) {
            console.warn('[RAG] Pipeline search skipped due to error:', ragErr);
            // Non-fatal: proceed with zero context
          }
        }
      } else {
        // Catatan Aktif Mode
        if (activeNode && activeNode.content) {
          contextText = `[Catatan Aktif "${activeNode.name}"]:\n${activeNode.content}`;
          sources = [{ noteId: activeNode.id, noteTitle: activeNode.name }];
          chunksToSave = [
            {
              noteId: activeNode.id,
              noteTitle: activeNode.name,
              snippet: activeNode.content.substring(0, 300) + '...',
            },
          ];
        }
      }

      // Step 2: Build Socratic Persona Prompt based on HIT/MISS status
      let prompt = '';
      if (intent === 'CHITCHAT') {
        prompt = `Pengguna mengirim pesan sapaan atau obrolan santai: "${query}"
Jawablah secara ramah, hangat, dan menyenangkan dalam Bahasa Indonesia. Tawarkan bantuan untuk menjadi rekan diskusi atau menjawab pertanyaan terkait catatan Vault pengguna.`;
      } else if (contextText) {
        // HIT: Context Found
        prompt = `Anda adalah 'Rekan Diskusi & Brainstorming' (Second Brain AI) yang cerdas.
Anda bertugas membantu pengguna mengeksplorasi ide, dengan mengacu pada catatan Vault mereka.

INFORMASI DARI VAULT PENGGUNA:
---
${contextText}
---

PERTANYAAN PENGGUNA:
${query}

TUGAS ANDA:
1. Jadikan informasi dari Vault di atas sebagai rujukan utama.
2. Sintesis dan gabungkan informasi tersebut dengan pengetahuan umum Anda secara proporsional. Jangan mendominasi dengan informasi luar jika catatan Vault sudah kuat.
3. Jika ada hubungan konseptual yang menarik antara catatan dan pertanyaan pengguna (meskipun tidak sama persis), tunjukkan "benang merah" atau korelasi tersebut secara natural.
4. Di akhir jawaban, berikan 1 pertanyaan reflektif atau ide lanjutan untuk memancing pengguna melakukan brainstorming lebih dalam.
5. Gunakan Bahasa Indonesia yang ramah, profesional, dan format Markdown yang rapi.`;
      } else {
        // MISS: No Context Found
        prompt = `Anda adalah 'Rekan Diskusi & Brainstorming' (Second Brain AI) yang cerdas.
Anda bertugas membantu pengguna mengeksplorasi ide, dengan mengacu pada catatan Vault mereka.

PERTANYAAN PENGGUNA:
${query}

STATUS VAULT: Tidak ada catatan yang cukup relevan dengan topik ini di Vault pengguna.

TUGAS ANDA:
1. Jawablah secara jujur dan transparan di AWAL kalimat bahwa topik ini belum ada di catatan Vault mereka (contoh: "Di catatan Vault Anda belum ada bahasan tentang [Topik], namun berdasarkan pengetahuan saya...").
2. Jawab pertanyaan pengguna secara komprehensif menggunakan pengetahuan umum Anda.
3. Di akhir jawaban, berikan 1 pertanyaan reflektif untuk memicu diskusi atau menyarankan pengguna untuk mulai mengeksplorasi dan mencatat topik ini di Vault mereka.
4. Gunakan Bahasa Indonesia yang ramah, profesional, dan format Markdown yang rapi.`;
      }

      // Step 3: Stream response via Pair 1 (chat) + balancedCascade
      const failoverResult = await executeWithFailover(
        {
          pair: 'chat',
          cascade: balancedCascade,
          customKeys,
        },
        async (aiClient, _slotId, _role, model) => {
          const responseStream = await aiClient.models.generateContentStream({
            model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              temperature: 0.3,
            },
          });

          let fullContent = '';
          for await (const chunk of responseStream) {
            const textChunk = chunk.text;
            if (textChunk) {
              fullContent += textChunk;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsg.id ? { ...msg, content: fullContent } : msg
                )
              );
            }
          }
          return fullContent;
        }
      );

      const finalContent = failoverResult.success
        ? failoverResult.data || 'Jawaban tidak dapat dibuat.'
        : '⚠️ Maaf, gagal menghubungkan ke Gemini AI. Mohon periksa API Key Anda di menu Settings.';

      const finalAiMsg: ChatMessageRecord = {
        ...aiMsg,
        content: finalContent,
        sources,
        chunks: chunksToSave,
      };

      await saveChatMessage(finalAiMsg);
      setMessages((prev) =>
        prev.map((msg) => (msg.id === aiMsg.id ? finalAiMsg : msg))
      );
    } catch (err) {
      console.error('Chat error:', err);
      const errAiMsg: ChatMessageRecord = {
        ...aiMsg,
        content: '⚠️ Terjadi kesalahan saat memproses jawaban AI.',
      };
      await saveChatMessage(errAiMsg);
      setMessages((prev) =>
        prev.map((msg) => (msg.id === aiMsg.id ? errAiMsg : msg))
      );
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [mode, topK, threshold, activeNode]);

  // Edit User Message & Regenerate from that point
  const handleEditUserMessage = useCallback(async (userMsgId: string, newContent: string) => {
    const query = newContent.trim();
    if (!query || isProcessingRef.current || !activeSessionId) return;

    isProcessingRef.current = true;
    setIsProcessing(true);

    const msgIdx = messages.findIndex((m) => m.id === userMsgId);
    if (msgIdx === -1) {
      isProcessingRef.current = false;
      setIsProcessing(false);
      return;
    }

    // Delete subsequent messages from DB
    const subsequentMsgs = messages.slice(msgIdx + 1);
    const idsToDelete = subsequentMsgs.map((m) => m.id);
    if (idsToDelete.length > 0) {
      try {
        await deleteChatMessages(idsToDelete);
      } catch (err) {
        console.error('Failed to delete subsequent messages:', err);
      }
    }

    // Update the target user message
    const targetMsg = messages[msgIdx];
    const updatedUserMsg: ChatMessageRecord = {
      ...targetMsg,
      content: query,
      createdAt: new Date().toISOString(),
    };
    await saveChatMessage(updatedUserMsg);

    // Create new AI response placeholder
    const aiMsgId = `msg_${crypto.randomUUID()}_ai`;
    const newAiMsg: ChatMessageRecord = {
      id: aiMsgId,
      sessionId: activeSessionId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };

    const keptBefore = messages.slice(0, msgIdx);
    setMessages([...keptBefore, updatedUserMsg, newAiMsg]);

    await runAiPipeline(query, newAiMsg);
  }, [activeSessionId, messages, runAiPipeline]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return {
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    messages,
    setMessages,
    input,
    setInput,
    mode,
    setMode,
    topK,
    setTopK,
    threshold,
    setThreshold,
    isProcessing,
    renderedHtmlMap,
    expandedContexts,
    messagesEndRef,
    textareaRef,
    activeNode,
    handleSend,
    handleEditUserMessage,
    handleNewChat,
    toggleContextInspector
  };
}
