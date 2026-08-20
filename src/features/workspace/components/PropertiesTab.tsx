import React from 'react';
import {
  Folder,
  ChevronDown,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  Clock,
  FileText,
  FileCode,
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { FileNode } from '../../../types/vault';
import { ChipInput } from './ChipInput';
import { RagSyncStatus } from '../../rag/services/ragPipeline';

interface PropertiesTabProps {
  activeNode: FileNode;
  folderName: string;
  noteType: string;
  status: string;
  tags: string[];
  aliases: string[];
  isSyncingRag: boolean;
  ragSyncStatus: RagSyncStatus | null;
  formattedCreated: string;
  formattedModified: string;
  stats: {
    words: number;
    characters: number;
    readingTimeMinutes: number;
  };
  isAutoDetecting?: boolean;
  autoDetectError?: string | null;
  handleTypeChange: (val: string) => void;
  handleStatusChange: (val: string) => void;
  handleTagsChange: (newTags: string[]) => void;
  handleAliasesChange: (newAliases: string[]) => void;
  handleProcessRag: () => void;
  handleRemoveRag: () => void;
  handleRunAutoDetect?: () => void;
}

export const PropertiesTab: React.FC<PropertiesTabProps> = ({
  activeNode,
  folderName,
  noteType,
  status,
  tags,
  aliases,
  isSyncingRag,
  ragSyncStatus,
  formattedCreated,
  formattedModified,
  stats,
  isAutoDetecting,
  autoDetectError,
  handleTypeChange,
  handleStatusChange,
  handleTagsChange,
  handleAliasesChange,
  handleProcessRag,
  handleRemoveRag,
  handleRunAutoDetect,
}) => {
  return (
    <div className="space-y-3 animate-in fade-in duration-150">
      {/* 1. Header Info (Judul + Folder) */}
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-text-heading tracking-tight truncate">
          {activeNode.name}
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Folder size={13} className="text-text-muted shrink-0" />
          <span className="truncate">{folderName}</span>
        </div>
      </div>

      <div className="h-px bg-border-subtle my-1" />

      {/* 2. Note Type */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-text-muted tracking-wider uppercase">
          Note Type
        </label>
        <input
          type="text"
          value={noteType}
          onChange={(e) => handleTypeChange(e.target.value)}
          placeholder="e.g. Daily, Project, Concept"
          className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-xl text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-text-muted/40 focus:border-border-hover"
        />
      </div>

      {/* 3. Status Dropdown */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-text-muted tracking-wider uppercase">
          Status
        </label>
        <div className="relative">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-xl text-xs text-text-primary appearance-none focus:outline-none focus:ring-1 focus:ring-text-muted/40 focus:border-border-hover pr-8 cursor-pointer"
          >
            <option value="Inbox">Inbox</option>
            <option value="Idea">Idea</option>
            <option value="In Progress">In Progress</option>
            <option value="Draft">Draft</option>
            <option value="Completed">Completed</option>
            <option value="Archived">Archived</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>
      </div>

      {/* 4. Tags Input */}
      <ChipInput
        label="Tags"
        items={tags}
        onChange={handleTagsChange}
        placeholder="Add tag (e.g. journal)..."
        prefix="#"
        chipColorClass="bg-bg-hover text-text-primary border-border-default"
      />

      {/* 5. Aliases Input */}
      <ChipInput
        label="Aliases"
        items={aliases}
        onChange={handleAliasesChange}
        placeholder="Add alias (e.g. Daily Note)..."
        chipColorClass="bg-bg-hover text-text-secondary border-border-subtle"
        helperText="Alternative names for wikilink matching."
      />

      {/* 6. AI RAG Analysis */}
      <div className="space-y-2 py-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-heading tracking-wider uppercase">
          <Sparkles size={12} className="text-accent-primary" />
          <span>AI RAG Analysis</span>
        </div>
        
        <div className="flex flex-col gap-2 p-3 rounded-xl bg-bg-primary border border-border-default text-xs transition-all duration-200">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[12px]">
              {isSyncingRag ? (
                <>
                  <Loader2 size={13} className="animate-spin text-accent-primary" />
                  <span className="text-accent-primary font-medium">Processing...</span>
                </>
              ) : ragSyncStatus === 'synced' ? (
                <>
                  <CheckCircle2 size={13} className="text-status-success" />
                  <span className="text-status-success font-medium">Up to Date</span>
                </>
              ) : ragSyncStatus === 'error' ? (
                <>
                  <AlertCircle size={13} className="text-status-error" />
                  <span className="text-status-error font-medium">Sync Failed</span>
                </>
              ) : ragSyncStatus === 'out_of_sync' ? (
                <>
                  <AlertCircle size={13} className="text-status-warning" />
                  <span className="text-status-warning font-medium">Needs Update</span>
                </>
              ) : (
                <>
                  <AlertCircle size={13} className="text-text-muted" />
                  <span className="text-text-muted font-medium">Unprocessed</span>
                </>
              )}
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed">
              {ragSyncStatus === 'synced' 
                ? 'Catatan ini sudah terindeks dan siap digunakan oleh AI.'
                : ragSyncStatus === 'error'
                ? 'Gagal memproses. Cek API key, koneksi, atau limitasi model Anda.'
                : ragSyncStatus === 'out_of_sync'
                ? 'Catatan ini telah diubah. Silakan update agar AI mengenali perubahan terbaru.'
                : 'Proses catatan ini agar AI bisa membacanya sebagai konteks (RAG).'}
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={handleProcessRag}
              disabled={isSyncingRag || ragSyncStatus === 'synced'}
              className={twMerge(
                'flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all duration-150 shadow-2xs',
                isSyncingRag
                  ? 'bg-bg-hover text-text-muted cursor-not-allowed shadow-none opacity-60'
                  : ragSyncStatus === 'synced'
                  ? 'bg-bg-hover text-text-muted border border-border-subtle shadow-none cursor-default opacity-70'
                  : ragSyncStatus === 'error'
                  ? 'bg-status-error hover:opacity-90 text-white cursor-pointer'
                  : 'bg-accent-primary text-text-inverse hover:opacity-90 cursor-pointer'
              )}
            >
              <RefreshCw size={12} className={isSyncingRag ? 'animate-spin' : ''} />
              <span>
                {ragSyncStatus === 'unprocessed' ? 'Process AI' : ragSyncStatus === 'error' ? 'Retry Process' : ragSyncStatus === 'out_of_sync' ? 'Update AI' : 'Up to Date'}
              </span>
            </button>
            
            {ragSyncStatus && ragSyncStatus !== 'unprocessed' && (
              <button
                type="button"
                onClick={handleRemoveRag}
                disabled={isSyncingRag}
                className={twMerge(
                  'flex items-center justify-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer shadow-2xs border',
                  isSyncingRag
                    ? 'bg-bg-hover border-transparent text-text-muted cursor-not-allowed shadow-none opacity-60'
                    : 'bg-bg-surface hover:bg-status-error-bg border-border-default hover:border-status-error-border text-text-muted hover:text-status-error'
                )}
                title="Hapus dari Indeks AI"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-border-subtle" />

      {/* 6.5. AI Auto-Detect Section */}
      <div className="p-3 bg-bg-primary border border-border-default rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-heading">
            <Sparkles size={14} className="text-accent-primary" />
            <span>AI Auto-Detect</span>
          </div>
          <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded-full bg-bg-hover border border-border-subtle font-medium font-mono">
            Pair 2
          </span>
        </div>

        <p className="text-[11px] text-text-muted leading-snug">
          Analisis otomatis isi catatan untuk mengisi metadata, tags, dan menentukan folder yang paling sesuai.
        </p>

        {autoDetectError && (
          <p className="text-[11px] text-status-error font-medium">
            {autoDetectError}
          </p>
        )}

        <button
          type="button"
          onClick={handleRunAutoDetect}
          disabled={isAutoDetecting}
          className={twMerge(
            'w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer shadow-2xs',
            isAutoDetecting
              ? 'bg-accent-primary/50 text-text-inverse cursor-not-allowed'
              : 'bg-accent-primary text-text-inverse hover:opacity-90'
          )}
        >
          {isAutoDetecting ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Menganalisis Catatan...</span>
            </>
          ) : (
            <>
              <Sparkles size={13} />
              <span>Auto-Detect Metadata & Folder</span>
            </>
          )}
        </button>
      </div>

      <div className="h-px bg-border-subtle" />

      {/* 7. Created & Modified Dates */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between text-text-muted">
          <div className="flex items-center gap-2">
            <Calendar size={14} />
            <span>Created</span>
          </div>
          <span className="font-mono text-text-primary">{formattedCreated}</span>
        </div>
        <div className="flex items-center justify-between text-text-muted">
          <div className="flex items-center gap-2">
            <Clock size={14} />
            <span>Modified</span>
          </div>
          <span className="font-mono text-text-primary">{formattedModified}</span>
        </div>
      </div>

      <div className="h-px bg-border-subtle" />

      {/* 8. Document Statistics */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-text-muted tracking-wider uppercase">
          Document Statistics
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Words Card */}
          <div className="p-3 bg-bg-primary border border-border-default rounded-xl flex flex-col items-center justify-center text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
              <FileText size={13} />
              <span>Words</span>
            </div>
            <div className="text-xl font-bold text-text-heading mt-1">
              {stats.words}
            </div>
          </div>

          {/* Characters Card */}
          <div className="p-3 bg-bg-primary border border-border-default rounded-xl flex flex-col items-center justify-center text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
              <FileCode size={13} />
              <span>Characters</span>
            </div>
            <div className="text-xl font-bold text-text-heading mt-1">
              {stats.characters}
            </div>
          </div>
        </div>
        <p className="text-[10px] text-text-muted text-center">
          Estimated read time: <span className="font-semibold text-text-secondary">{stats.readingTimeMinutes} min</span>
        </p>
      </div>
    </div>
  );
};
