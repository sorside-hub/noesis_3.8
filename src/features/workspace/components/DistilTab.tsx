import React, { MouseEvent } from 'react';
import { Sparkles } from 'lucide-react';
import { FileNode } from '../../../types/vault';

interface DistilTabProps {
  activeNode: FileNode;
  isDistiling: boolean;
  distilError: string;
  distilHtml: string;
  distilResult?: string;
  distilModel?: string;
  onGenerateDistil: () => void;
  onDistilClick: (e: MouseEvent<HTMLDivElement>) => void;
}

export const DistilTab: React.FC<DistilTabProps> = ({
  activeNode,
  isDistiling,
  distilError,
  distilHtml,
  distilResult,
  distilModel,
  onGenerateDistil,
  onDistilClick,
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="space-y-1">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={13} className="text-accent-primary" />
          Distil AI
        </h3>
        <p className="text-[11px] text-text-muted">
          Buat ringkasan dan poin penting dari catatan ini menggunakan AI.
        </p>
      </div>

      <button
        type="button"
        disabled={isDistiling || !activeNode.content?.trim()}
        onClick={onGenerateDistil}
        className="w-full flex items-center justify-center gap-2 bg-accent-primary hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed text-text-inverse text-xs font-semibold py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer"
      >
        {isDistiling ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Distiling...</span>
          </>
        ) : (
          <>
            <Sparkles size={14} />
            <span>Generate Distil</span>
          </>
        )}
      </button>

      {distilError && (
        <div className="p-3 bg-status-error-bg border border-status-error-border rounded-xl text-xs text-status-error">
          <strong className="block mb-1 font-semibold">Error:</strong>
          {distilError}
        </div>
      )}

      {distilResult && !isDistiling && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold text-text-heading uppercase tracking-wider">Result</h4>
            {distilModel && (
              <span className="text-[9px] font-mono bg-bg-hover border border-border-subtle px-1.5 py-0.5 rounded text-text-muted">
                {distilModel}
              </span>
            )}
          </div>
          <div
            className="prose dark:prose-invert prose-zinc max-w-none text-xs leading-relaxed p-3.5 bg-bg-primary border border-border-default rounded-xl"
            dangerouslySetInnerHTML={{ __html: distilHtml }}
            onClick={onDistilClick}
          />
        </div>
      )}
    </div>
  );
};
