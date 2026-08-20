import React, { useEffect } from 'react';
import { Send } from 'lucide-react';

interface ChatInputAreaProps {
  input: string;
  setInput: (val: string) => void;
  isProcessing: boolean;
  onSend: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  placeholder: string;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  input,
  setInput,
  isProcessing,
  onSend,
  textareaRef,
  placeholder
}) => {
  // Auto-resize textarea height as content grows or resets
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      if (input) {
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
      }
    }
  }, [input, textareaRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Optional desktop shortcut: Ctrl+Enter or Cmd+Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSend();
      return;
    }
    // Regular Enter: allows default browser newline creation (no send, no preventDefault)
  };

  return (
    <div className="shrink-0 w-full px-4 pb-4 lg:pb-6 pt-2 bg-gradient-to-t from-bg-primary via-bg-primary/90 to-transparent">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-end gap-2 bg-bg-surface border border-border-default hover:border-border-hover focus-within:border-border-hover focus-within:ring-1 focus-within:ring-text-muted/30 rounded-2xl p-2 px-4 shadow-md transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent border-0 outline-hidden text-sm text-text-primary placeholder:text-text-muted resize-none max-h-32 py-1.5 font-sans leading-relaxed"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!input.trim() || isProcessing}
            className="p-2.5 rounded-xl bg-text-primary text-bg-surface hover:opacity-90 disabled:opacity-30 transition-all cursor-pointer shrink-0 mb-0.5 shadow-xs"
            title="Kirim Pesan (atau tekan Ctrl+Enter)"
          >
            <Send size={15} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
};
