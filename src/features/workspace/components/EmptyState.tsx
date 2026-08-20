import React from 'react';
import { Plus, Zap } from 'lucide-react';

interface EmptyStateProps {
  onCreateNote: () => void;
  onQuickCapture?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateNote, onQuickCapture }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-bg-primary px-6 text-center select-none">
      {/* Logo Mode Terang */}
      <img
        src="/logo-light.webp"
        alt="Vault Noesis"
        className="w-28 h-28 md:w-32 md:h-32 object-contain block dark:hidden pointer-events-none mb-3"
        referrerPolicy="no-referrer"
      />
      {/* Logo Mode Gelap */}
      <img
        src="/logo-dark.webp"
        alt="Vault Noesis"
        className="w-28 h-28 md:w-32 md:h-32 object-contain hidden dark:block pointer-events-none mb-3"
        referrerPolicy="no-referrer"
      />

      <h2 className="text-xl font-bold text-text-heading tracking-tight mb-1.5 font-sans">
        Vault Noesis
      </h2>

      <p className="text-xs text-text-muted max-w-xs leading-relaxed mb-6">
        Pilih catatan dari sidebar atau mulai tangkap ide baru.
      </p>

      {/* Action Hub */}
      <div className="grid grid-cols-2 gap-2.5 w-full max-w-sm">
        {/* New Note Button */}
        <button
          type="button"
          onClick={onCreateNote}
          className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-bg-surface hover:bg-bg-hover border border-border-default hover:border-border-subtle text-center transition-all duration-150 cursor-pointer group shadow-2xs"
        >
          <div className="w-9 h-9 rounded-full bg-text-primary text-bg-surface flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform mb-2.5">
            <Plus size={16} strokeWidth={2.2} />
          </div>
          <span className="text-xs font-semibold text-text-heading group-hover:text-text-primary">
            New Note
          </span>
          <span className="text-[11px] text-text-muted mt-0.5 line-clamp-1">
            Mulai lembar kosong
          </span>
        </button>

        {/* Quick Capture Button */}
        <button
          type="button"
          onClick={onQuickCapture || onCreateNote}
          className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-bg-surface hover:bg-bg-hover border border-border-default hover:border-border-subtle text-center transition-all duration-150 cursor-pointer group shadow-2xs relative overflow-hidden"
        >
          <div className="w-9 h-9 rounded-full bg-text-primary text-bg-surface flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform mb-2.5">
            <Zap size={16} strokeWidth={2.2} />
          </div>
          <span className="text-xs font-semibold text-text-heading group-hover:text-text-primary">
            Quick Capture
          </span>
          <span className="text-[11px] text-text-muted mt-0.5 line-clamp-1">
            Auto simpan ke 00-Inbox
          </span>
        </button>
      </div>
    </div>
  );
};
