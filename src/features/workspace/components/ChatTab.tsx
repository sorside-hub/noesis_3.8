import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageSquare, Trash2 } from 'lucide-react';
import { FileNode, NoteMetadata } from '../../../types/vault';
import { useAiActions } from '../../editor/hooks/useAiActions';
import Markdown from 'react-markdown';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

interface ChatTabProps {
  activeNode: FileNode;
  onUpdateMetadata: (id: string, metadata: Partial<NoteMetadata>) => void;
}

export const ChatTab: React.FC<ChatTabProps> = ({ activeNode, onUpdateMetadata }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const { isLoading, error, executeAction } = useAiActions();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages from metadata when active node changes
  useEffect(() => {
    const history = (activeNode.metadata?.chatHistory as ChatMessage[]) || [];
    setMessages(history);
    setInput('');
  }, [activeNode.id]); // Deliberately not including metadata.chatHistory to avoid infinite loop while typing

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const updateMessages = (newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    onUpdateMetadata(activeNode.id, { chatHistory: newMessages });
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    const tempMessages = [...messages, userMessage];
    updateMessages(tempMessages);
    setInput('');

    // Append context of the note. Limit length if it's too big to avoid payload issues.
    // 30,000 characters is roughly 7,500 tokens, well within Gemini limits.
    const noteContent = activeNode.content || '';
    const safeContent = noteContent.length > 30000 ? noteContent.substring(0, 30000) + '\n\n[Content truncated due to length]' : noteContent;

    const result = await executeAction('ask', safeContent, userMessage.content);

    if (result) {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: result,
      };
      updateMessages([...tempMessages, aiMessage]);
    } else {
      // If error occurred (handled by hook, result is null)
      // Let's add an error message so it doesn't just get stuck or disappear silently
      const aiError: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: `❌ **Oops! An error occurred.**\n\nI couldn't process your request. Please check your API key or try again later.`,
      };
      updateMessages([...tempMessages, aiError]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    updateMessages([]);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header section */}
      <div className="flex items-center justify-between pb-2 border-b border-border-default/50">
        <h3 className="text-xs font-semibold text-text-heading flex items-center gap-1.5 uppercase tracking-wider">
          <MessageSquare size={14} className="text-accent-primary" />
          Ask Note
        </h3>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="p-1 text-text-muted hover:text-red-500 rounded-md transition-colors"
            title="Clear Chat"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-text-muted space-y-3 opacity-60">
            <MessageSquare size={32} />
            <p className="text-sm">Ask anything about this note.<br/>AI will read the content and answer.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-full`}
            >
              <div
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-accent-primary text-white rounded-br-none'
                    : 'bg-bg-elevated border border-border-default/50 text-text-primary rounded-bl-none'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="markdown-body text-sm prose-sm dark:prose-invert">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex items-start">
            <div className="bg-bg-elevated border border-border-default/50 text-text-primary rounded-xl rounded-bl-none px-4 py-3 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-accent-primary" />
              <span className="text-xs text-text-muted">AI is thinking...</span>
            </div>
          </div>
        )}
        {error && !isLoading && !messages.some(m => m.content.includes('Oops! An error occurred')) && (
          <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="pt-2 border-t border-border-default/50">
        <form 
          onSubmit={handleSend}
          className="relative flex items-center bg-bg-elevated border border-border-default rounded-xl focus-within:border-accent-primary/50 transition-colors"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this note..."
            className="w-full bg-transparent border-none resize-none px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none max-h-32 min-h-[44px] custom-scrollbar"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-accent-primary text-white disabled:opacity-50 disabled:bg-bg-primary disabled:text-text-muted hover:bg-accent-hover transition-colors"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
};
