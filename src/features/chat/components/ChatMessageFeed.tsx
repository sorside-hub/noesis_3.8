import React, { useState } from 'react';
import { 
  Loader2, 
  ChevronDown, 
  ChevronRight, 
  Layers, 
  ExternalLink,
  Copy,
  Check,
  FilePlus,
  Pencil,
  BookOpen
} from 'lucide-react';
import { ChatMessageRecord } from '../../../lib/db';
import { ChatMode } from '../hooks/useChatLogic';
import { useNavigation } from '../../../context/NavigationContext';
import { useVault } from '../../../hooks/useVault';

interface ChatMessageFeedProps {
  messages: ChatMessageRecord[];
  renderedHtmlMap: Record<string, string>;
  expandedContexts?: Record<string, boolean>;
  toggleContextInspector?: (msgId: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  mode: ChatMode;
  activeNodeName?: string;
  vaultState?: ReturnType<typeof useVault>;
  isProcessing?: boolean;
  onEditMessage?: (userMsgId: string, newContent: string) => void;
}

export const ChatMessageFeed: React.FC<ChatMessageFeedProps> = ({
  messages,
  renderedHtmlMap,
  messagesEndRef,
  mode,
  activeNodeName,
  vaultState,
  isProcessing = false,
  onEditMessage
}) => {
  const { navigateToNote, navigateView } = useNavigation();
  
  // Local state for mutually exclusive active footer tab per message ('sources' | 'chunks' | null)
  const [activeTabMap, setActiveTabMap] = useState<Record<string, 'sources' | 'chunks' | null>>({});
  
  // Local state for copy notification
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Local state for inline user message editing
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<string>('');

  const toggleTab = (msgId: string, tab: 'sources' | 'chunks') => {
    setActiveTabMap((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === tab ? null : tab,
    }));
  };

  const handleCopy = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => {
      setCopiedMsgId(null);
    }, 2000);
  };

  const startEditing = (msgId: string, content: string) => {
    setEditingMsgId(msgId);
    setEditDraft(content);
  };

  const cancelEditing = () => {
    setEditingMsgId(null);
    setEditDraft('');
  };

  const submitEdit = (msgId: string) => {
    if (!editDraft.trim() || isProcessing) return;
    onEditMessage?.(msgId, editDraft.trim());
    setEditingMsgId(null);
    setEditDraft('');
  };

  const handleCreateNoteFromMsg = (msgContent: string) => {
    if (!vaultState) return;

    // Extract clean title from message text
    const cleanText = msgContent.replace(/[#*`_]/g, '').trim();
    const firstLine = cleanText.split('\n')[0] || 'Hasil Chat AI';
    const noteTitle = firstLine.length > 35 ? firstLine.substring(0, 35) + '...' : firstLine;

    const newNoteId = vaultState.createNote(null, `AI - ${noteTitle}`);
    if (newNoteId) {
      vaultState.updateNoteContent(newNoteId, msgContent);
      navigateToNote(newNoteId);
      navigateView('vault');
    }
  };

  // Safeguard: deduplicate messages by id to guarantee unique keys
  const uniqueMessages = Array.from(
    new Map<string, ChatMessageRecord>(messages.map((m) => [m.id, m])).values()
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-14 pb-6 flex flex-col">
      {uniqueMessages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center select-none py-8">
          {/* Logo Mode Terang */}
          <img
            src="/logo-light.webp"
            alt="Noesis Chat Rag"
            className="w-32 h-32 md:w-40 md:h-40 object-contain block dark:hidden pointer-events-none"
            referrerPolicy="no-referrer"
          />
          {/* Logo Mode Gelap */}
          <img
            src="/logo-dark.webp"
            alt="Noesis Chat Rag"
            className="w-32 h-32 md:w-40 md:h-40 object-contain hidden dark:block pointer-events-none"
            referrerPolicy="no-referrer"
          />

          <h2 className="mt-4 text-xl md:text-2xl font-bold text-text-heading tracking-tight">
            Noesis Chat Rag
          </h2>
        </div>
      ) : (
        <div className="max-w-3xl w-full mx-auto space-y-8 pb-10">
          {uniqueMessages.map((msg) => (
            <div key={msg.id} className="w-full space-y-3">
              {msg.role === 'user' ? (
                editingMsgId === msg.id ? (
                  /* Inline Editing Mode */
                  <div className="flex flex-col items-end w-full space-y-2">
                    <div className="w-full sm:max-w-[85%] bg-bg-surface border border-accent-primary/60 rounded-2xl p-3 shadow-md space-y-2.5">
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault();
                            submitEdit(msg.id);
                          }
                        }}
                        rows={Math.max(2, Math.min(8, editDraft.split('\n').length))}
                        className="w-full bg-bg-primary/60 border border-border-default rounded-xl p-2.5 text-sm text-text-primary outline-hidden focus:border-accent-primary resize-none font-sans leading-relaxed"
                        placeholder="Edit pesan Anda..."
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="px-3 py-1.5 rounded-lg border border-border-default bg-bg-primary hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors cursor-pointer font-medium"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => submitEdit(msg.id)}
                          disabled={!editDraft.trim() || isProcessing}
                          className="px-3.5 py-1.5 rounded-lg bg-text-primary text-bg-surface hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer font-medium shadow-xs"
                        >
                          Kirim Ulang
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard User Bubble with Edit & Copy buttons beneath, aligned right */
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex justify-end w-full">
                      <div className="bg-bg-surface border border-border-default text-text-primary rounded-2xl px-4 py-2.5 max-w-[85%] sm:max-w-[75%] shadow-xs text-sm font-sans leading-relaxed break-words whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>

                    {/* Action buttons below the bubble on the far right */}
                    <div className="flex items-center gap-1 pt-0.5">
                      {onEditMessage && (
                        <button
                          type="button"
                          onClick={() => startEditing(msg.id, msg.content)}
                          disabled={isProcessing}
                          className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer disabled:opacity-30"
                          title="Edit pesan"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
                        title={copiedMsgId === msg.id ? 'Tersalin!' : 'Salin pesan'}
                      >
                        {copiedMsgId === msg.id ? (
                          <Check size={12} className="text-accent-primary" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="w-full space-y-3 pt-1">
                  {msg.content ? (
                    <div
                      className="prose dark:prose-invert max-w-none text-text-primary text-sm font-sans leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: renderedHtmlMap[msg.id] || msg.content,
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-text-muted text-xs font-medium">
                      <Loader2 size={14} className="animate-spin text-text-secondary" />
                      <span>Menganalisis pertanyaan & menyusun jawaban...</span>
                    </div>
                  )}

                  {/* 1-Line Footer Bar with Sources, Inspection, Copy, and Create Note */}
                  {msg.role === 'assistant' && msg.content && (
                    <div className="mt-2 pt-2 border-t border-border-subtle space-y-2">
                      <div className="flex items-center justify-between gap-1.5 text-xs text-text-muted">
                        {/* Left side: Toggles for Sumber & Inspeksi (No icons, text only) */}
                        <div className="flex items-center gap-1.5">
                          {msg.sources && msg.sources.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleTab(msg.id, 'sources')}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
                                activeTabMap[msg.id] === 'sources'
                                  ? 'bg-bg-hover text-text-heading border-border-default font-semibold'
                                  : 'bg-bg-surface hover:bg-bg-hover border-border-subtle text-text-secondary hover:text-text-heading'
                              }`}
                            >
                              <span>Sumber ({msg.sources.length})</span>
                              {activeTabMap[msg.id] === 'sources' ? (
                                <ChevronDown size={11} />
                              ) : (
                                <ChevronRight size={11} />
                              )}
                            </button>
                          )}

                          {msg.chunks && msg.chunks.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleTab(msg.id, 'chunks')}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
                                activeTabMap[msg.id] === 'chunks'
                                  ? 'bg-bg-hover text-text-heading border-border-default font-semibold'
                                  : 'bg-bg-surface hover:bg-bg-hover border-border-subtle text-text-secondary hover:text-text-heading'
                              }`}
                            >
                              <span>Inspeksi ({msg.chunks.length})</span>
                              {activeTabMap[msg.id] === 'chunks' ? (
                                <ChevronDown size={11} />
                              ) : (
                                <ChevronRight size={11} />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Right side: Action Buttons (Icon-only for Salin & Jadikan Note) */}
                        <div className="flex items-center gap-1 ml-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="p-1.5 rounded-lg bg-bg-surface hover:bg-bg-hover border border-border-subtle text-text-secondary hover:text-text-heading transition-colors cursor-pointer text-xs shadow-2xs"
                            title={copiedMsgId === msg.id ? "Tersalin!" : "Salin balasan AI"}
                          >
                            {copiedMsgId === msg.id ? (
                              <Check size={13} className="text-accent-primary" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>

                          {vaultState && (
                            <button
                              type="button"
                              onClick={() => handleCreateNoteFromMsg(msg.content)}
                              className="p-1.5 rounded-lg bg-bg-surface hover:bg-bg-hover border border-border-subtle text-text-secondary hover:text-text-heading transition-colors cursor-pointer text-xs shadow-2xs"
                              title="Jadikan balasan AI ini sebagai Catatan Baru di Vault"
                            >
                              <FilePlus size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Section 1: Sumber List */}
                      {activeTabMap[msg.id] === 'sources' && msg.sources && msg.sources.length > 0 && (
                        <div className="p-3 bg-bg-surface border border-border-default rounded-xl space-y-2 text-xs animate-in fade-in duration-200">
                          <div className="text-[11px] font-semibold text-text-muted border-b border-border-subtle pb-1.5 flex items-center gap-1.5">
                            <BookOpen size={13} /> Catatan Vault Yang Dirujuk:
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {msg.sources.map((src, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => {
                                  navigateToNote(src.noteId);
                                  navigateView('vault');
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-primary hover:bg-bg-hover border border-border-default text-text-secondary hover:text-text-heading transition-colors cursor-pointer text-xs font-medium shadow-2xs"
                              >
                                <span>{src.noteTitle}</span>
                                <ExternalLink size={12} className="opacity-70" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expanded Section 2: Chunks Inspection Box */}
                      {activeTabMap[msg.id] === 'chunks' && msg.chunks && msg.chunks.length > 0 && (
                        <div className="p-3 bg-bg-surface border border-border-default rounded-xl space-y-2 text-xs animate-in fade-in duration-200">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-text-muted border-b border-border-subtle pb-1.5">
                            <span className="flex items-center gap-1.5">
                              <Layers size={13} /> Potongan Catatan Yang Digunakan AI
                            </span>
                            <span>{msg.chunks.length} Chunks</span>
                          </div>

                          <div className="space-y-2 pt-1">
                            {msg.chunks.map((chunk, cIdx) => (
                              <div
                                key={cIdx}
                                className="p-2.5 bg-bg-primary border border-border-subtle rounded-lg space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-text-heading truncate text-[11px]">
                                    {chunk.noteTitle}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigateToNote(chunk.noteId);
                                      navigateView('vault');
                                    }}
                                    title="Buka Catatan"
                                    className="text-text-muted hover:text-text-primary shrink-0 cursor-pointer"
                                  >
                                    <ExternalLink size={12} />
                                  </button>
                                </div>
                                <p className="text-[11px] text-text-secondary line-clamp-3 leading-relaxed font-mono">
                                  {chunk.snippet}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
};
