import React, { useState, useRef, useEffect } from 'react';
import { 
  Wand2, 
  AlignLeft, 
  MessageSquare, 
  Globe, 
  Maximize,
  ArrowRight,
  Loader2,
  X
} from 'lucide-react';
import { EditorActionType, useAiActions } from '../hooks/useAiActions';

interface AiContextMenuProps {
  position?: { top: number; left: number };
  selectedText: string;
  onActionComplete: (result: string) => void;
  onClose: () => void;
}

export const AiContextMenu: React.FC<AiContextMenuProps> = ({ 
  selectedText, 
  onActionComplete,
  onClose
}) => {
  const { isLoading, error, executeAction } = useAiActions();
  const [customPrompt, setCustomPrompt] = useState('');
  const [activeAction, setActiveAction] = useState<EditorActionType | 'custom' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Delay listener registration slightly so initial touch/mouse event of selection doesn't immediately close the menu
    const timer = setTimeout(() => {
      const handleClickOutside = (e: Event) => {
        if (isLoading) return;
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          onClose();
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      cleanupRef.current = () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }, 200);

    return () => {
      clearTimeout(timer);
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [onClose, isLoading]);

  const handleAction = async (action: EditorActionType, extraContext?: string) => {
    setActiveAction(action);
    const result = await executeAction(action, selectedText, extraContext);
    if (result) {
      onActionComplete(result);
    }
    setActiveAction(null);
  };

  const handleSubmitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    setActiveAction('custom');
    handleAction('custom', customPrompt);
  };

  const getLoadingText = () => {
    switch (activeAction) {
      case 'grammar': return 'Memperbaiki grammar...';
      case 'summarize': return 'Merangkum teks...';
      case 'tone': return 'Menyesuaikan gaya bahasa...';
      case 'translate': return 'Menerjemahkan teks...';
      case 'expand': return 'Mengembangkan teks...';
      case 'custom': return 'Memproses instruksi khusus...';
      default: return 'AI sedang memproses...';
    }
  };

  return (
    <div 
      ref={menuRef}
      className="fixed bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-sm sm:max-w-md bg-bg-surface/95 dark:bg-bg-surface/90 backdrop-blur-md border border-border-default rounded-2xl shadow-2xl p-2.5 animate-in fade-in slide-in-from-bottom-3 duration-150 select-none"
    >
      {isLoading && activeAction ? (
        <div className="flex items-center justify-center gap-3 py-3 px-2 animate-in fade-in zoom-in-95 duration-200">
          <Loader2 className="animate-spin text-accent-primary shrink-0" size={16} />
          <span className="text-sm font-medium bg-gradient-to-r from-accent-primary to-accent-hover bg-clip-text text-transparent">
            {getLoadingText()}
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Top Header Row with quick action buttons & close button */}
          <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-border-default/60">
            <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-1 shrink-0">
                AI Edit:
              </span>
              <button 
                type="button"
                onClick={() => handleAction('grammar')}
                className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0 font-medium"
                title="Fix Grammar"
              >
                <Wand2 size={13} />
                <span>Grammar</span>
              </button>
              <button 
                type="button"
                onClick={() => handleAction('summarize')}
                className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0 font-medium"
                title="Summarize"
              >
                <AlignLeft size={13} />
                <span>Summarize</span>
              </button>
              <button 
                type="button"
                onClick={() => handleAction('tone')}
                className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0 font-medium"
                title="Tone"
              >
                <MessageSquare size={13} />
                <span>Tone</span>
              </button>
              <button 
                type="button"
                onClick={() => handleAction('translate')}
                className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0 font-medium"
                title="Translate"
              >
                <Globe size={13} />
                <span>Translate</span>
              </button>
              <button 
                type="button"
                onClick={() => handleAction('expand')}
                className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0 font-medium"
                title="Expand"
              >
                <Maximize size={13} />
                <span>Expand</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-hover transition-colors shrink-0 cursor-pointer ml-1"
              title="Close AI Menu"
            >
              <X size={15} />
            </button>
          </div>
          
          {/* Custom Instruction Input */}
          <form onSubmit={handleSubmitCustom} className="flex items-center gap-2 bg-bg-elevated/70 border border-border-default/60 rounded-xl px-2.5 py-1.5 focus-within:border-border-default transition-colors">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ask AI to modify selected text..."
              className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none w-full"
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose();
              }}
            />
            <button 
              type="submit" 
              disabled={!customPrompt.trim()}
              className="p-1 rounded-md bg-accent-primary text-white hover:bg-accent-hover disabled:opacity-40 disabled:bg-bg-primary disabled:text-text-muted transition-colors cursor-pointer shrink-0"
            >
              <ArrowRight size={13} />
            </button>
          </form>
        </div>
      )}
      
      {error && (
        <div className="px-1 text-xs text-red-500 font-medium">
          {error}
        </div>
      )}
    </div>
  );
};
