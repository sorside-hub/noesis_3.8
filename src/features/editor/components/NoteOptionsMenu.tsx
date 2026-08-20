import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, FolderInput, Trash2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface NoteOptionsMenuProps {
  onMoveNote: () => void;
  onDeleteNote: () => void;
  variant?: 'inline' | 'floating';
  className?: string;
}

export const NoteOptionsMenu: React.FC<NoteOptionsMenuProps> = ({
  onMoveNote,
  onDeleteNote,
  variant = 'inline',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMoveClick = () => {
    setIsOpen(false);
    onMoveNote();
  };

  const handleDeleteClick = () => {
    setIsOpen(false);
    onDeleteNote();
  };

  return (
    <div className={twMerge('relative inline-flex items-center', className)} ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Opsi Catatan"
        aria-expanded={isOpen}
        aria-label="Opsi Catatan"
        className={twMerge(
          'flex items-center justify-center transition-all duration-150 cursor-pointer',
          variant === 'floating'
            ? 'p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-bg-hover/60'
            : 'w-7 h-7 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover',
          isOpen && (variant === 'floating' ? 'bg-bg-hover text-text-primary' : 'bg-bg-hover text-text-primary')
        )}
      >
        <MoreHorizontal size={15} />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          className={twMerge(
            'absolute z-50 bg-bg-surface border border-border-default rounded-xl shadow-xl py-1.5 min-w-[170px] backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-100',
            variant === 'floating'
              ? 'right-full mr-2.5 top-1/2 -translate-y-1/2'
              : 'right-0 top-full mt-1.5'
          )}
        >
          {/* Pindah Folder Action */}
          <button
            type="button"
            onClick={handleMoveClick}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-text-primary hover:bg-bg-hover hover:text-accent-primary transition-colors cursor-pointer text-left"
          >
            <FolderInput size={14} className="text-text-muted shrink-0" />
            <span>Pindah ke Folder...</span>
          </button>

          <div className="h-px bg-border-subtle my-1 mx-2" />

          {/* Hapus Catatan Action */}
          <button
            type="button"
            onClick={handleDeleteClick}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
          >
            <Trash2 size={14} className="text-red-500 shrink-0" />
            <span>Hapus Catatan</span>
          </button>
        </div>
      )}
    </div>
  );
};
