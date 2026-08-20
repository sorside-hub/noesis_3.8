import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, 
  Square, 
  Search, 
  CheckCircle2, 
  Circle, 
  ListFilter, 
  Plus, 
  CornerDownRight, 
  Sparkles,
  CheckCheck,
  RotateCcw
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { FileNode } from '../../../types/vault';

export interface NoteTask {
  id: string;
  lineIndex: number;
  raw: string;
  text: string;
  isCompleted: boolean;
  indent: number;
}

interface TasksTabProps {
  activeNode: FileNode | null;
  onUpdateContent: (newContent: string) => void;
  onNavigateToLine?: (lineIndex: number, text: string) => void;
}

type TaskFilterMode = 'ALL' | 'PENDING' | 'COMPLETED';

export const TasksTab: React.FC<TasksTabProps> = ({
  activeNode,
  onUpdateContent,
  onNavigateToLine,
}) => {
  const [filterMode, setFilterMode] = useState<TaskFilterMode>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [newTaskInput, setNewTaskInput] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  const content = activeNode?.content || '';

  // Extract all markdown tasks (- [ ] or - [x])
  const tasks = useMemo(() => {
    if (!content) return [];
    const lines = content.split('\n');
    const result: NoteTask[] = [];

    lines.forEach((line, index) => {
      const match = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s*(.*)$/);
      if (match) {
        const indentSpaces = match[1].length;
        const isCompleted = match[2].toLowerCase() === 'x';
        const taskText = match[3].trim();

        result.push({
          id: `task-${index}`,
          lineIndex: index,
          raw: line,
          text: taskText,
          isCompleted,
          indent: Math.floor(indentSpaces / 2),
        });
      }
    });

    return result;
  }, [content]);

  // Filter tasks based on status and search query
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterMode === 'PENDING' && t.isCompleted) return false;
      if (filterMode === 'COMPLETED' && !t.isCompleted) return false;
      if (searchQuery.trim()) {
        return t.text.toLowerCase().includes(searchQuery.toLowerCase().trim());
      }
      return true;
    });
  }, [tasks, filterMode, searchQuery]);

  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const pendingCount = totalCount - completedCount;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Toggle individual task
  const handleToggleTask = (task: NoteTask) => {
    const lines = content.split('\n');
    if (task.lineIndex >= 0 && task.lineIndex < lines.length) {
      const targetLine = lines[task.lineIndex];
      const newStatus = task.isCompleted ? ' ' : 'x';
      lines[task.lineIndex] = targetLine.replace(/\[([ xX])\]/, `[${newStatus}]`);
      onUpdateContent(lines.join('\n'));
    }
  };

  // Bulk action: Mark all complete
  const handleMarkAllComplete = () => {
    if (tasks.length === 0) return;
    const lines = content.split('\n');
    tasks.forEach((t) => {
      if (!t.isCompleted && t.lineIndex < lines.length) {
        lines[t.lineIndex] = lines[t.lineIndex].replace(/\[ \]/, '[x]');
      }
    });
    onUpdateContent(lines.join('\n'));
  };

  // Bulk action: Reset all to pending
  const handleResetAllPending = () => {
    if (tasks.length === 0) return;
    const lines = content.split('\n');
    tasks.forEach((t) => {
      if (t.isCompleted && t.lineIndex < lines.length) {
        lines[t.lineIndex] = lines[t.lineIndex].replace(/\[[xX]\]/, '[ ]');
      }
    });
    onUpdateContent(lines.join('\n'));
  };

  // Add new task to bottom of note
  const handleAddNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    const taskLine = `- [ ] ${newTaskInput.trim()}`;
    const newContent = content.trim() ? `${content}\n${taskLine}` : taskLine;
    onUpdateContent(newContent);
    setNewTaskInput('');
    setIsAddingTask(false);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header & Stats */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare size={13} className="text-accent-primary" />
              <span>Tasks & Checklist</span>
            </h3>
            <p className="text-[11px] text-text-muted">
              Kelola dan filter semua to-do list catatan aktif
            </p>
          </div>
          {totalCount > 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleMarkAllComplete}
                className="p-1 text-text-muted hover:text-emerald-500 hover:bg-bg-hover rounded-md transition-colors cursor-pointer"
                title="Mark all complete"
              >
                <CheckCheck size={14} />
              </button>
              <button
                type="button"
                onClick={handleResetAllPending}
                className="p-1 text-text-muted hover:text-amber-500 hover:bg-bg-hover rounded-md transition-colors cursor-pointer"
                title="Reset all to pending"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {totalCount > 0 && (
          <div className="p-3 bg-bg-hover/50 border border-border-default rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-text-secondary">
                Progress ({completedCount}/{totalCount})
              </span>
              <span className="font-semibold text-text-primary">
                {completionPercentage}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-bg-surface rounded-full overflow-hidden border border-border-subtle">
              <div
                className="h-full bg-accent-primary transition-all duration-300 rounded-full"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-2">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-bg-hover/60 border border-border-subtle rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={twMerge(
              'flex-1 py-1 px-2 rounded-lg font-medium transition-all text-center cursor-pointer',
              filterMode === 'ALL'
                ? 'bg-bg-surface text-text-primary shadow-xs font-semibold'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('PENDING')}
            className={twMerge(
              'flex-1 py-1 px-2 rounded-lg font-medium transition-all text-center cursor-pointer',
              filterMode === 'PENDING'
                ? 'bg-bg-surface text-amber-600 dark:text-amber-400 shadow-xs font-semibold'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('COMPLETED')}
            className={twMerge(
              'flex-1 py-1 px-2 rounded-lg font-medium transition-all text-center cursor-pointer',
              filterMode === 'COMPLETED'
                ? 'bg-bg-surface text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            Done ({completedCount})
          </button>
        </div>

        {/* Task Search Input */}
        {totalCount > 4 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tugas..."
              className="w-full pl-8 pr-3 py-1.5 bg-bg-surface border border-border-default rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
        {filteredTasks.length === 0 ? (
          <div className="py-8 text-center space-y-2 border border-dashed border-border-default rounded-xl p-4">
            <ListFilter className="w-8 h-8 text-text-muted mx-auto stroke-1" />
            <div className="text-xs text-text-muted">
              {totalCount === 0
                ? 'Belum ada task to-do (- [ ]) di catatan ini.'
                : filterMode === 'PENDING'
                ? 'Semua task sudah selesai!'
                : 'Tidak ada task yang cocok dengan filter.'}
            </div>
            {totalCount === 0 && (
              <button
                type="button"
                onClick={() => {
                  const sample = `- [ ] Rencana task pertama\n- [ ] Task kedua yang perlu diselesaikan`;
                  onUpdateContent(content.trim() ? `${content}\n\n${sample}` : sample);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-primary text-text-inverse text-xs rounded-lg font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <Plus size={13} />
                <span>Tambahkan Contoh Task</span>
              </button>
            )}
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={twMerge(
                'group flex items-start gap-2.5 p-2 rounded-xl border transition-all text-xs cursor-pointer',
                task.isCompleted
                  ? 'bg-bg-hover/30 border-border-subtle opacity-75'
                  : 'bg-bg-surface border-border-default hover:border-border-hover shadow-xs'
              )}
              style={{ marginLeft: `${Math.min(task.indent * 12, 36)}px` }}
            >
              {/* Checkbox Trigger */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleTask(task);
                }}
                className="mt-0.5 text-text-muted hover:text-accent-primary transition-colors cursor-pointer shrink-0"
                title={task.isCompleted ? 'Mark uncompleted' : 'Mark completed'}
              >
                {task.isCompleted ? (
                  <CheckCircle2 size={16} className="text-emerald-500 fill-emerald-500/20" />
                ) : (
                  <Circle size={16} className="text-text-muted hover:text-accent-primary" />
                )}
              </button>

              {/* Task Text & Line Navigation */}
              <div
                className="flex-1 min-w-0"
                onClick={() => onNavigateToLine?.(task.lineIndex, task.text)}
                title="Klik untuk loncat ke baris task di editor"
              >
                <p
                  className={twMerge(
                    'leading-relaxed break-words',
                    task.isCompleted
                      ? 'line-through text-text-muted font-normal'
                      : 'text-text-primary font-medium'
                  )}
                >
                  {task.text || <span className="italic text-text-muted">Task kosong</span>}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="flex items-center gap-0.5">
                    <CornerDownRight size={10} />
                    Baris {task.lineIndex + 1}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Add Task Input */}
      {isAddingTask ? (
        <form onSubmit={handleAddNewTask} className="space-y-2 pt-1">
          <input
            type="text"
            value={newTaskInput}
            onChange={(e) => setNewTaskInput(e.target.value)}
            placeholder="Tulis deskripsi task baru..."
            autoFocus
            className="w-full px-3 py-1.5 bg-bg-surface border border-accent-primary rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => {
                setIsAddingTask(false);
                setNewTaskInput('');
              }}
              className="px-2.5 py-1 text-xs text-text-muted hover:text-text-primary rounded-md hover:bg-bg-hover transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!newTaskInput.trim()}
              className="px-3 py-1 bg-accent-primary text-text-inverse text-xs rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
            >
              Tambah Task
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAddingTask(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-border-default hover:border-accent-primary/60 rounded-xl text-xs font-medium text-text-secondary hover:text-accent-primary hover:bg-accent-primary/5 transition-all cursor-pointer"
        >
          <Plus size={13} />
          <span>Tambah Task Baru</span>
        </button>
      )}
    </div>
  );
};
