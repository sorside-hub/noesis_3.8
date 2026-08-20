import { useState, useMemo, useRef, useEffect, useCallback, MouseEvent } from 'react';
import { VaultData, FileNode, NoteMetadata } from '../../../types/vault';
import { getAllLocalKeyOverrides } from '../../../lib/ai/keyManager';
import { renderMarkdown } from '../../../lib/editor/markdownRenderer';
import { RAGPipeline, RagSyncStatus } from '../../rag/services/ragPipeline';
import { AutoDetectResult } from '../../../api-core/autoDetectHandler';

export type RightSidebarTab = 'PROPERTIES' | 'TASKS' | 'DISTIL' | 'CHAT' | 'BACKLINKS' | 'OUTGOING_LINKS' | 'OUTLINE';

interface UseRightSidebarLogicOptions {
  vault: VaultData;
  activeNode: FileNode | null;
  onSelectFile: (id: string) => void;
  onUpdateMetadata: (id: string, metadata: Partial<NoteMetadata>) => void;
  updateNoteContent?: (id: string, content: string) => void;
  updateNodeTitle?: (id: string, title: string) => void;
  createFolder?: (parentId: string | null, name: string) => string | null;
  moveNode?: (id: string, targetParentId: string | null) => void;
  onNavigateToHeading?: (lineIndex: number, text: string) => void;
}

export function useRightSidebarLogic({
  vault,
  activeNode,
  onSelectFile,
  onUpdateMetadata,
  updateNoteContent,
  updateNodeTitle,
  createFolder,
  moveNode,
  onNavigateToHeading,
}: UseRightSidebarLogicOptions) {
  const [activeTab, setActiveTab] = useState<RightSidebarTab>('PROPERTIES');
  const [isTabMenuOpen, setIsTabMenuOpen] = useState(false);
  const tabMenuRef = useRef<HTMLDivElement>(null);

  const [isDistiling, setIsDistiling] = useState(false);
  const [distilError, setDistilError] = useState('');
  const [distilHtml, setDistilHtml] = useState('');
  const [isSyncingRag, setIsSyncingRag] = useState(false);
  const [ragSyncStatus, setRagSyncStatus] = useState<RagSyncStatus | null>(null);

  // Auto-Detect States
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [autoDetectError, setAutoDetectError] = useState<string | null>(null);
  const [autoDetectResult, setAutoDetectResult] = useState<AutoDetectResult | null>(null);
  const [isAutoDetectModalOpen, setIsAutoDetectModalOpen] = useState(false);


  // Check sync status whenever note or content changes
  useEffect(() => {
    if (!activeNode || activeNode.type !== 'file') {
      setRagSyncStatus(null);
      return;
    }
    let isMounted = true;
    const rag = new RAGPipeline();
    rag.getSyncStatus(activeNode.id, activeNode.content || '').then((status) => {
      if (isMounted) {
        setRagSyncStatus(status);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [activeNode?.id, activeNode?.content]);

  // Re-render markdown when distilResult changes
  useEffect(() => {
    if (activeNode?.metadata?.distilResult) {
      renderMarkdown(activeNode.metadata.distilResult as string, vault.nodes)
        .then(setDistilHtml)
        .catch(console.error);
    } else {
      setDistilHtml('');
    }
  }, [activeNode?.metadata?.distilResult, vault.nodes]);

  // Close tab menu when clicked outside
  useEffect(() => {
    if (!isTabMenuOpen) return;
    const handleClickOutside = (e: Event) => {
      if (tabMenuRef.current && !tabMenuRef.current.contains(e.target as Node)) {
        setIsTabMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isTabMenuOpen]);

  // Generate Distil AI Summary
  const handleGenerateDistil = async () => {
    if (!activeNode || !activeNode.content) return;
    setIsDistiling(true);
    setDistilError('');
    try {
      const customKeys = getAllLocalKeyOverrides();
      const response = await fetch('/api/distil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: activeNode.content, customKeys }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to distil content');
      }
      if (!data.success) {
        throw new Error(data.attempts?.[data.attempts.length - 1]?.error || 'AI generation failed');
      }
      onUpdateMetadata(activeNode.id, { distilResult: data.data.text, distilModel: data.data.modelUsed });
    } catch (err: any) {
      setDistilError(err.message);
    } finally {
      setIsDistiling(false);
    }
  };

  // Folder Path calculation
  const folderName = useMemo(() => {
    if (!activeNode || !activeNode.parentId) return 'Root Vault';
    const parent = vault.nodes[activeNode.parentId];
    return parent ? parent.name : 'Root Vault';
  }, [activeNode, vault.nodes]);

  // Document statistics calculation
  const stats = useMemo(() => {
    if (!activeNode || !activeNode.content) {
      return { words: 0, characters: 0, readingTimeMinutes: 1 };
    }
    const text = activeNode.content.trim();
    if (!text) {
      return { words: 0, characters: 0, readingTimeMinutes: 1 };
    }
    const words = text.split(/\s+/).filter(Boolean).length;
    const characters = text.length;
    const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));
    return { words, characters, readingTimeMinutes };
  }, [activeNode]);

  // Formatted dates
  const formattedCreated = useMemo(() => {
    if (!activeNode) return '-';
    const d = new Date(activeNode.createdAt);
    return d.toISOString().split('T')[0];
  }, [activeNode]);

  const formattedModified = useMemo(() => {
    if (!activeNode) return '-';
    const d = new Date(activeNode.updatedAt);
    return d.toISOString().split('T')[0];
  }, [activeNode]);

  // Metadata accessors
  const metadata: NoteMetadata = activeNode?.metadata || {};
  const tags = metadata.tags || [];
  const aliases = metadata.aliases || [];
  const noteType = metadata.noteType || '';
  const status = metadata.status || 'Idea';

  // Metadata Handlers
  const handleTypeChange = (val: string) => {
    if (!activeNode) return;
    onUpdateMetadata(activeNode.id, { noteType: val });
  };

  const handleStatusChange = (val: string) => {
    if (!activeNode) return;
    onUpdateMetadata(activeNode.id, { status: val });
  };

  const handleTagsChange = (newTags: string[]) => {
    if (!activeNode) return;
    onUpdateMetadata(activeNode.id, { tags: newTags });
  };

  const handleAliasesChange = (newAliases: string[]) => {
    if (!activeNode) return;
    onUpdateMetadata(activeNode.id, { aliases: newAliases });
  };

  // Auto-Detect Handler
  const handleRunAutoDetect = async () => {
    if (!activeNode) return;
    setIsAutoDetecting(true);
    setAutoDetectError(null);

    try {
      // 1. Build list of existing folders
      const existingFolders = Object.values(vault.nodes)
        .filter((n) => n.type === 'folder')
        .map((n) => {
          let path = n.name;
          let curr = n.parentId;
          while (curr && vault.nodes[curr]) {
            path = `${vault.nodes[curr].name}/${path}`;
            curr = vault.nodes[curr].parentId;
          }
          return {
            id: n.id,
            name: n.name,
            path,
            parentId: n.parentId,
          };
        });

      const customKeys = getAllLocalKeyOverrides();

      const response = await fetch('/api/auto-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeNode.name,
          content: activeNode.content || '',
          currentNoteType: noteType,
          existingFolders,
          customKeys,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal memproses Auto-Detect');
      }
      if (!data.success) {
        throw new Error(data.attempts?.[data.attempts.length - 1]?.error || 'Proses Auto-Detect gagal');
      }

      setAutoDetectResult(data.data.result);
      setIsAutoDetectModalOpen(true);
    } catch (err: any) {
      setAutoDetectError(err.message || 'Error saat Auto-Detect');
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const handleApplyAutoDetect = (customResult?: AutoDetectResult) => {
    const result = customResult || autoDetectResult;
    if (!activeNode || !result) return;

    // 1. Update Title if changed
    if (result.suggestedTitle && result.suggestedTitle !== activeNode.name && updateNodeTitle) {
      updateNodeTitle(activeNode.id, result.suggestedTitle);
    }

    // 2. Update Metadata
    onUpdateMetadata(activeNode.id, {
      noteType: result.noteType,
      tags: result.tags,
      aliases: result.aliases,
    });

    // 3. Move/Create Folder
    const decision = result.folderDecision;
    if (decision) {
      if (decision.action === 'existing' && decision.existingFolderId) {
        // Handle case where existingFolderId is returned as string "null"
        const existingParentId = decision.existingFolderId === 'null' ? null : decision.existingFolderId;
        if (existingParentId !== activeNode.parentId && moveNode) {
          moveNode(activeNode.id, existingParentId);
        }
      } else if (decision.action === 'new' && decision.newFolderName) {
        if (createFolder && moveNode) {
          const resolvedParentId = 
            decision.newFolderParentId && 
            decision.newFolderParentId !== 'null' && 
            decision.newFolderParentId !== 'undefined'
              ? decision.newFolderParentId
              : null;
              
          const newFolderId = createFolder(resolvedParentId, decision.newFolderName);
          if (newFolderId) {
            moveNode(activeNode.id, newFolderId);
          }
        }
      }
    }

    setIsAutoDetectModalOpen(false);
    setAutoDetectResult(null);
  };

  const handleDistilClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Handle Wikilink click
    const wikilinkEl = target.closest('[data-wikilink]') as HTMLElement | null;
    if (wikilinkEl) {
      const targetName = wikilinkEl.getAttribute('data-wikilink');
      if (targetName) {
        e.stopPropagation();
        const allNodes = Object.values(vault.nodes) as FileNode[];
        const matched = allNodes.find(
          (n) =>
            n.type === 'file' &&
            (n.name.toLowerCase() === targetName.toLowerCase() ||
              (n.metadata?.aliases || []).some((a) => a.toLowerCase() === targetName.toLowerCase()))
        );
        if (matched) {
          onSelectFile(matched.id);
        }
        return;
      }
    }

    // Handle Copy Code Button
    const copyBtn = target.closest('.copy-code-btn') as HTMLButtonElement | null;
    if (copyBtn) {
      e.stopPropagation();
      const rawCode = copyBtn.getAttribute('data-code');
      if (rawCode) {
        const codeText = decodeURIComponent(rawCode);
        navigator.clipboard.writeText(codeText).then(() => {
          const copyIcon = copyBtn.querySelector('.copy-icon');
          const checkIcon = copyBtn.querySelector('.check-icon');
          const copyText = copyBtn.querySelector('.copy-text');
          if (copyIcon && checkIcon && copyText) {
            copyIcon.classList.add('hidden');
            checkIcon.classList.remove('hidden');
            copyText.textContent = 'Copied!';
            setTimeout(() => {
              copyIcon.classList.remove('hidden');
              checkIcon.classList.add('hidden');
              copyText.textContent = 'Copy';
            }, 2000);
          }
        });
      }
    }
  };

  // Manual Sync to RAG Brain
  // Process AI RAG
  const handleProcessRag = async () => {
    if (!activeNode) return;
    setIsSyncingRag(true);
    try {
      const customKeys = getAllLocalKeyOverrides();
      const pipeline = new RAGPipeline(customKeys);
      const success = await pipeline.processNote(activeNode.id, activeNode.content || '');
      if (success) {
        setRagSyncStatus('synced');
      } else {
        setRagSyncStatus('error');
      }
    } catch (err) {
      console.error('Failed manual sync to brain:', err);
      setRagSyncStatus('error');
    } finally {
      setIsSyncingRag(false);
    }
  };

  // Remove from AI RAG
  const handleRemoveRag = async () => {
    if (!activeNode) return;
    setIsSyncingRag(true);
    try {
      const pipeline = new RAGPipeline();
      await pipeline.deleteNote(activeNode.id);
      setRagSyncStatus('unprocessed');
    } catch (err) {
      console.error('Failed to delete from brain:', err);
    } finally {
      setIsSyncingRag(false);
    }
  };

  // Backlinks calculation
  const backlinks = useMemo(() => {
    if (!activeNode) return [];
    const allNodes = Object.values(vault.nodes) as FileNode[];
    const currentName = activeNode.name.toLowerCase();
    const currentAliases = (activeNode.metadata?.aliases || []).map((a) => a.toLowerCase());

    return allNodes.filter((node) => {
      if (node.id === activeNode.id || node.type !== 'file' || !node.content) return false;
      const contentLower = node.content.toLowerCase();
      if (contentLower.includes(`[[${currentName}]]`)) return true;
      for (const al of currentAliases) {
        if (contentLower.includes(`[[${al}]]`)) return true;
      }
      return false;
    });
  }, [activeNode, vault.nodes]);

  // Outgoing Links calculation
  const outgoingLinks = useMemo(() => {
    if (!activeNode || !activeNode.content) return [];
    const wikiLinkRegex = /\[\[(.*?)\]\]/g;
    const links: { targetName: string; matchedNode: FileNode | null }[] = [];
    const seen = new Set<string>();

    let match;
    while ((match = wikiLinkRegex.exec(activeNode.content)) !== null) {
      const target = match[1].trim();
      if (!target || seen.has(target.toLowerCase())) continue;
      seen.add(target.toLowerCase());

      const allNodes = Object.values(vault.nodes) as FileNode[];
      const matched =
        allNodes.find(
          (n) =>
            n.type === 'file' &&
            (n.name.toLowerCase() === target.toLowerCase() ||
              (n.metadata?.aliases || []).some((al) => al.toLowerCase() === target.toLowerCase()))
        ) || null;

      links.push({
        targetName: target,
        matchedNode: matched,
      });
    }
    return links;
  }, [activeNode, vault.nodes]);

  // Outline / Headings collapse state
  const [collapsedHeadingIndices, setCollapsedHeadingIndices] = useState<Set<number>>(new Set());

  // Reset collapsed headings whenever active note changes
  useEffect(() => {
    setCollapsedHeadingIndices(new Set());
  }, [activeNode?.id]);

  const toggleHeadingCollapse = useCallback((lineIndex: number, e: MouseEvent) => {
    e.stopPropagation();
    setCollapsedHeadingIndices((prev) => {
      const next = new Set(prev);
      if (next.has(lineIndex)) {
        next.delete(lineIndex);
      } else {
        next.add(lineIndex);
      }
      return next;
    });
  }, []);

  // Outline calculation
  const outlineHeadings = useMemo(() => {
    if (!activeNode || !activeNode.content) return [];
    const lines = activeNode.content.split('\n');

    const rawHeadings: { level: number; text: string; lineIndex: number }[] = [];
    lines.forEach((line, idx) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        rawHeadings.push({
          level: match[1].length,
          text: match[2].trim(),
          lineIndex: idx,
        });
      }
    });

    const headings: { level: number; text: string; lineIndex: number; hasChildren: boolean }[] = [];
    rawHeadings.forEach((h, i) => {
      const nextH = rawHeadings[i + 1];
      const hasChildren = nextH ? nextH.level > h.level : false;
      headings.push({ ...h, hasChildren });
    });

    return headings;
  }, [activeNode]);

  return {
    activeTab,
    setActiveTab,
    isTabMenuOpen,
    setIsTabMenuOpen,
    tabMenuRef,
    isDistiling,
    distilError,
    distilHtml,
    isSyncingRag,
    ragSyncStatus,
    folderName,
    stats,
    formattedCreated,
    formattedModified,
    metadata,
    tags,
    aliases,
    noteType,
    status,
    backlinks,
    outgoingLinks,
    collapsedHeadingIndices,
    setCollapsedHeadingIndices,
    outlineHeadings,
    handleGenerateDistil,
    handleTypeChange,
    handleStatusChange,
    handleTagsChange,
    handleAliasesChange,
    handleDistilClick,
    handleRemoveRag,
    handleProcessRag,
    toggleHeadingCollapse,
    handleUpdateContent: (newContent: string) => {
      if (activeNode && updateNoteContent) {
        updateNoteContent(activeNode.id, newContent);
      }
    },
    isAutoDetecting,
    autoDetectError,
    autoDetectResult,
    isAutoDetectModalOpen,
    setIsAutoDetectModalOpen,
    handleRunAutoDetect,
    handleApplyAutoDetect,
  };
}
