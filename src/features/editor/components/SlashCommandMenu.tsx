import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  Heading1, 
  Heading2, 
  Heading3, 
  CheckSquare, 
  List, 
  ListOrdered, 
  TextQuote, 
  Code, 
  Table, 
  Minus, 
  Calendar, 
  Clock, 
  Highlighter, 
  Link, 
  Info,
  Lightbulb,
  AlertTriangle,
  Flame,
  CheckCircle2,
  HelpCircle,
  Sigma,
  Sparkles
} from 'lucide-react';

export interface SlashCommand {
  id: string;
  title: string;
  description: string;
  category: 'AI' | 'Headings' | 'Lists & Tasks' | 'Blocks' | 'Inserts';
  keywords: string[];
  icon: React.ReactNode;
  action: () => { text: string; cursorOffset?: number; isAiTrigger?: boolean };
}

interface SlashCommandMenuProps {
  query: string;
  position: { top: number; left: number };
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  query,
  position,
  onSelect,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  const commands: SlashCommand[] = useMemo(() => [
    // AI
    {
      id: 'ai',
      title: 'Ask AI',
      description: 'Generate or edit content with AI',
      category: 'AI',
      keywords: ['ai', 'ask', 'generate', 'write', 'sparkles'],
      icon: <Sparkles className="w-4 h-4 text-accent-primary" />,
      action: () => ({ text: '', isAiTrigger: true }),
    },
    // Headings
    {
      id: 'h1',
      title: 'Heading 1',
      description: 'Big section heading',
      category: 'Headings',
      keywords: ['h1', 'heading', 'title', 'large', 'header', '#'],
      icon: <Heading1 className="w-4 h-4 text-accent-primary" />,
      action: () => ({ text: '# ' }),
    },
    {
      id: 'h2',
      title: 'Heading 2',
      description: 'Medium section heading',
      category: 'Headings',
      keywords: ['h2', 'heading', 'subtitle', 'medium', '##'],
      icon: <Heading2 className="w-4 h-4 text-accent-primary" />,
      action: () => ({ text: '## ' }),
    },
    {
      id: 'h3',
      title: 'Heading 3',
      description: 'Small section heading',
      category: 'Headings',
      keywords: ['h3', 'heading', 'small', 'sub', '###'],
      icon: <Heading3 className="w-4 h-4 text-accent-primary" />,
      action: () => ({ text: '### ' }),
    },

    // Lists & Tasks
    {
      id: 'todo',
      title: 'To-do Task',
      description: 'Interactive checkbox task item',
      category: 'Lists & Tasks',
      keywords: ['todo', 'task', 'check', 'checkbox', 'done', 'list', '[]'],
      icon: <CheckSquare className="w-4 h-4 text-emerald-500" />,
      action: () => ({ text: '- [ ] ' }),
    },
    {
      id: 'bullet',
      title: 'Bullet List',
      description: 'Simple unordered list item',
      category: 'Lists & Tasks',
      keywords: ['bullet', 'list', 'point', 'unordered', '-'],
      icon: <List className="w-4 h-4 text-sky-500" />,
      action: () => ({ text: '- ' }),
    },
    {
      id: 'numbered',
      title: 'Numbered List',
      description: 'Ordered sequential list item',
      category: 'Lists & Tasks',
      keywords: ['number', 'ordered', 'list', '1.', 'sequence'],
      icon: <ListOrdered className="w-4 h-4 text-sky-500" />,
      action: () => ({ text: '1. ' }),
    },

    // Blocks & Callouts
    {
      id: 'callout-note',
      title: 'Callout: Note',
      description: 'Standard note alert box',
      category: 'Blocks',
      keywords: ['callout', 'note', 'info', 'box', 'admonition', 'blue'],
      icon: <Info className="w-4 h-4 text-blue-500" />,
      action: () => ({ text: '> [!NOTE]\n> ', cursorOffset: 10 }),
    },
    {
      id: 'callout-tip',
      title: 'Callout: Tip',
      description: 'Helpful tip or advice box',
      category: 'Blocks',
      keywords: ['tip', 'hint', 'advice', 'idea', 'green', 'callout'],
      icon: <Lightbulb className="w-4 h-4 text-emerald-500" />,
      action: () => ({ text: '> [!TIP]\n> ', cursorOffset: 9 }),
    },
    {
      id: 'callout-warning',
      title: 'Callout: Warning',
      description: 'Caution or warning alert box',
      category: 'Blocks',
      keywords: ['warning', 'caution', 'alert', 'warn', 'amber', 'callout'],
      icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      action: () => ({ text: '> [!WARNING]\n> ', cursorOffset: 13 }),
    },
    {
      id: 'callout-danger',
      title: 'Callout: Danger',
      description: 'Critical error or destructive warning',
      category: 'Blocks',
      keywords: ['danger', 'error', 'bug', 'critical', 'red', 'callout'],
      icon: <Flame className="w-4 h-4 text-rose-500" />,
      action: () => ({ text: '> [!DANGER]\n> ', cursorOffset: 12 }),
    },
    {
      id: 'callout-success',
      title: 'Callout: Success',
      description: 'Positive completion or check box',
      category: 'Blocks',
      keywords: ['success', 'check', 'done', 'passed', 'green', 'callout'],
      icon: <CheckCircle2 className="w-4 h-4 text-teal-500" />,
      action: () => ({ text: '> [!SUCCESS]\n> ', cursorOffset: 13 }),
    },
    {
      id: 'callout-question',
      title: 'Callout: Question',
      description: 'FAQ, inquiry, or question box',
      category: 'Blocks',
      keywords: ['question', 'faq', 'help', 'ask', 'purple', 'callout'],
      icon: <HelpCircle className="w-4 h-4 text-indigo-500" />,
      action: () => ({ text: '> [!QUESTION]\n> ', cursorOffset: 14 }),
    },
    {
      id: 'quote',
      title: 'Quote Block',
      description: 'Capture quotation or cite source',
      category: 'Blocks',
      keywords: ['quote', 'cite', 'blockquote', '>'],
      icon: <TextQuote className="w-4 h-4 text-indigo-500" />,
      action: () => ({ text: '> ' }),
    },
    {
      id: 'codeblock',
      title: 'Code Block',
      description: 'Multi-line code snippet with syntax',
      category: 'Blocks',
      keywords: ['code', 'snippet', 'pre', 'typescript', 'javascript', 'python', '```'],
      icon: <Code className="w-4 h-4 text-purple-500" />,
      action: () => ({ text: '```\n\n```', cursorOffset: 4 }),
    },
    {
      id: 'table',
      title: 'Table',
      description: '2x2 Markdown table structure',
      category: 'Blocks',
      keywords: ['table', 'grid', 'column', 'row'],
      icon: <Table className="w-4 h-4 text-teal-500" />,
      action: () => ({ 
        text: '| Column 1 | Column 2 |\n| :--- | :--- |\n| Item 1 | Item 2 |\n',
        cursorOffset: 2 
      }),
    },
    {
      id: 'math',
      title: 'Math Formula',
      description: 'LaTeX math block',
      category: 'Blocks',
      keywords: ['math', 'latex', 'formula', 'equation', '$$'],
      icon: <Sigma className="w-4 h-4 text-rose-500" />,
      action: () => ({ text: '$$\n\n$$', cursorOffset: 3 }),
    },
    {
      id: 'divider',
      title: 'Divider',
      description: 'Horizontal divider rule',
      category: 'Blocks',
      keywords: ['divider', 'line', 'hr', 'separator', '---'],
      icon: <Minus className="w-4 h-4 text-text-muted" />,
      action: () => ({ text: '---\n' }),
    },

    // Inserts & Formatting
    {
      id: 'highlight',
      title: 'Highlight Text',
      description: 'Yellow marker highlight (==text==)',
      category: 'Inserts',
      keywords: ['highlight', 'mark', 'yellow', 'stabilo', '=='],
      icon: <Highlighter className="w-4 h-4 text-amber-400" />,
      action: () => ({ text: '====', cursorOffset: 2 }),
    },
    {
      id: 'wikilink',
      title: 'Wikilink Note',
      description: 'Internal link to another note ([[Note]])',
      category: 'Inserts',
      keywords: ['link', 'wikilink', 'page', 'note', '[[', 'internal'],
      icon: <Link className="w-4 h-4 text-accent-primary" />,
      action: () => ({ text: '[[]]', cursorOffset: 2 }),
    },
    {
      id: 'date',
      title: "Today's Date",
      description: 'Insert date in YYYY-MM-DD format',
      category: 'Inserts',
      keywords: ['date', 'today', 'now', 'calendar', 'time'],
      icon: <Calendar className="w-4 h-4 text-emerald-500" />,
      action: () => {
        const today = new Date().toISOString().split('T')[0];
        return { text: today };
      },
    },
    {
      id: 'time',
      title: 'Current Time',
      description: 'Insert current time in HH:MM format',
      category: 'Inserts',
      keywords: ['time', 'clock', 'now', 'timestamp'],
      icon: <Clock className="w-4 h-4 text-emerald-500" />,
      action: () => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return { text: timeStr };
      },
    },
  ], []);

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return commands;
    return commands.filter((cmd) => {
      const titleMatch = cmd.title.toLowerCase().includes(q);
      const descMatch = cmd.description.toLowerCase().includes(q);
      const keywordMatch = cmd.keywords.some((k) => k.toLowerCase().includes(q));
      return titleMatch || descMatch || keywordMatch;
    });
  }, [commands, query]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => 
          filteredCommands.length > 0 ? (prev - 1 + filteredCommands.length) % filteredCommands.length : 0
        );
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (filteredCommands.length > 0 && filteredCommands[selectedIndex]) {
          e.preventDefault();
          e.stopPropagation();
          onSelect(filteredCommands[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [filteredCommands, selectedIndex, onSelect, onClose]);

  // Click outside to dismiss
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (filteredCommands.length === 0) {
    return null;
  }

  // Adjust popup position if it overflows the viewport
  const adjustedTop = Math.min(position.top, window.innerHeight - 340);
  const adjustedLeft = Math.min(position.left, window.innerWidth - 300);

  return (
    <div
      ref={menuRef}
      onMouseDown={(e) => e.preventDefault()} // Prevent editor blur
      style={{
        position: 'fixed',
        top: `${Math.max(12, adjustedTop)}px`,
        left: `${Math.max(12, adjustedLeft)}px`,
      }}
      className="z-50 w-72 max-h-80 overflow-y-auto bg-bg-surface border border-border-default rounded-xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-100 select-none custom-scrollbar"
    >
      <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border-default/40 pb-1 mb-1">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-accent-primary" />
          Slash Commands
        </span>
        <span className="text-[9px] font-mono text-text-disabled lowercase">
          {query ? `/${query}` : 'type to filter'}
        </span>
      </div>

      <div className="space-y-0.5">
        {filteredCommands.map((cmd, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={cmd.id}
              ref={isSelected ? selectedItemRef : null}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(cmd);
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                isSelected
                  ? 'bg-accent-primary text-white font-medium shadow-sm'
                  : 'text-text-primary hover:bg-bg-hover'
              }`}
            >
              <div
                className={`flex-none p-1.5 rounded-md ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-bg-primary border border-border-default/50'
                }`}
              >
                {cmd.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="truncate">{cmd.title}</span>
                  {cmd.id === 'todo' && (
                    <span className={`text-[10px] font-mono ${isSelected ? 'text-white/80' : 'text-text-disabled'}`}>
                      []
                    </span>
                  )}
                </div>
                <p
                  className={`text-[10px] truncate ${
                    isSelected ? 'text-white/80' : 'text-text-muted'
                  }`}
                >
                  {cmd.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
