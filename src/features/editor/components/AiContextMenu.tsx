import React, { useState, useRef, useEffect } from 'react';
import { 
  Wand2, 
  AlignLeft, 
  MessageSquare, 
  Globe, 
  Maximize,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { EditorActionType, useAiActions } from '../hooks/useAiActions';

interface AiContextMenuProps {
  position: { top: number; left: number };
  selectedText: string;
  onActionComplete: (result: string) => void;
  onClose: () => void;
}

export const AiContextMenu: React.FC<AiContextMenuProps> = ({ 
  position, 
  selectedText, 
  onActionComplete,
  onClose
}) => {
  const { isLoading, error, executeAction } = useAiActions();
  const [customPrompt, setCustomPrompt] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleAction = async (action: EditorActionType, extraContext?: string) => {
    const result = await executeAction(action, selectedText, extraContext);
    if (result) {
      onActionComplete(result);
    }
  };

  const handleSubmitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    handleAction('custom', customPrompt);
  };

  const topPos = Math.max(10, position.top - 60);

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 flex flex-col gap-2 bg-bg-surface border border-border-default rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      style={{ top: topPos, left: Math.max(10, position.left) }}
    >
      <div className="flex items-center px-1 py-1 gap-1 border-b border-border-default bg-bg-primary/50 backdrop-blur-sm">
        <button 
          onClick={() => handleAction('grammar')}
          disabled={isLoading}
          className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
          title="Fix Grammar"
        >
          <Wand2 size={16} />
        </button>
        <button 
          onClick={() => handleAction('summarize')}
          disabled={isLoading}
          className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
          title="Summarize"
        >
          <AlignLeft size={16} />
        </button>
        <button 
          onClick={() => handleAction('tone')}
          disabled={isLoading}
          className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
          title="Change Tone"
        >
          <MessageSquare size={16} />
        </button>
        <button 
          onClick={() => handleAction('translate')}
          disabled={isLoading}
          className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
          title="Translate to English"
        >
          <Globe size={16} />
        </button>
        <button 
          onClick={() => handleAction('expand')}
          disabled={isLoading}
          className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
          title="Expand"
        >
          <Maximize size={16} />
        </button>
      </div>
      
      <form onSubmit={handleSubmitCustom} className="flex items-center px-2 pb-2 pt-1 gap-2">
        <input
          type="text"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Ask AI to modify..."
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-48"
          disabled={isLoading}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
        />
        <button 
          type="submit" 
          disabled={isLoading || !customPrompt.trim()}
          className="p-1 text-text-secondary hover:text-text-primary disabled:opacity-50"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
        </button>
      </form>
      
      {error && (
        <div className="px-2 pb-2 text-xs text-red-500 max-w-[240px] truncate">
          {error}
        </div>
      )}
    </div>
  );
};
