import React from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Plus, MoreHorizontal } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { FileNode } from '../../../types/vault';

interface FileTreeProps {
  parentId?: string | null;
  depth?: number;
  getChildren: (parentId: string | null) => FileNode[];
  matchesSearch: (node: FileNode) => boolean;
  treeSearchQuery: string;
  expandedFolders: Record<string, boolean>;
  activeFileId: string | null;
  handleItemClick: (node: FileNode) => void;
  handleContextMenu: (node: FileNode, e: React.MouseEvent) => void;
  handleTouchStart: (node: FileNode, e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: (e?: React.TouchEvent) => void;
  onQuickCreateNoteInFolder?: (folderId: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  parentId = null,
  depth = 0,
  getChildren,
  matchesSearch,
  treeSearchQuery,
  expandedFolders,
  activeFileId,
  handleItemClick,
  handleContextMenu,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  onQuickCreateNoteInFolder,
}) => {
  const rawChildren = getChildren(parentId);
  const children = treeSearchQuery.trim() ? rawChildren.filter(matchesSearch) : rawChildren;

  if (children.length === 0 && depth === 0) {
    return (
      <div className="px-4 py-8 text-center text-text-muted text-xs">
        {treeSearchQuery.trim() ? (
          <p>Tidak ada hasil untuk &quot;{treeSearchQuery}&quot;</p>
        ) : (
          <p>Empty</p>
        )}
      </div>
    );
  }

  return (
    <ul className={twMerge('space-y-0.5 select-none', depth > 0 && 'ml-3 pl-2.5 border-l border-border-default/70')}>
      {children.map((node) => {
        const isFolder = node.type === 'folder';
        // Expanded if in expandedFolders OR auto-expanded when search is active
        const isExpanded = isFolder && (Boolean(treeSearchQuery.trim()) || Boolean(expandedFolders[node.id]));
        const isSelected = !isFolder && activeFileId === node.id;
        const subChildren = isFolder ? getChildren(node.id) : [];
        const subCount = subChildren.length;

        return (
          <li key={node.id} className="select-none">
            <div
              onClick={() => handleItemClick(node)}
              onContextMenu={(e) => handleContextMenu(node, e)}
              onTouchStart={(e) => handleTouchStart(node, e)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              className={twMerge(
                'group relative flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-150 select-none touch-manipulation',
                isSelected
                  ? 'bg-bg-hover text-text-heading font-medium shadow-2xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover/70'
              )}
            >
              <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
                {/* Chevron / Toggle arrow for folders */}
                {isFolder ? (
                  <span className="p-0.5 -ml-0.5 text-text-muted transition-transform duration-150 shrink-0">
                    {isExpanded ? (
                      <ChevronDown size={13} className="text-text-primary" />
                    ) : (
                      <ChevronRight size={13} className="text-text-muted group-hover:text-text-primary" />
                    )}
                  </span>
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}

                {/* Icon */}
                {isFolder ? (
                  isExpanded ? (
                    <FolderOpen size={14} className="text-text-primary shrink-0 transition-colors" />
                  ) : (
                    <Folder size={14} className="text-text-muted group-hover:text-text-secondary shrink-0 transition-colors" />
                  )
                ) : (
                  <FileText
                    size={14}
                    className={twMerge(
                      'shrink-0 transition-colors',
                      isSelected ? 'text-text-primary' : 'text-text-muted group-hover:text-text-secondary'
                    )}
                  />
                )}

                {/* Name */}
                <span className={twMerge(
                  'truncate text-xs',
                  isSelected ? 'text-text-heading font-semibold' : 'text-text-primary/90 group-hover:text-text-primary'
                )}>
                  {node.name}
                </span>

                {/* Badge count right next to folder name */}
                {isFolder && subCount > 0 && (
                  <span className="text-[10px] text-text-muted bg-bg-surface border border-border-default/70 px-1.5 py-0.2 rounded-full font-mono shrink-0 ml-0.5">
                    {subCount}
                  </span>
                )}
              </div>

              {/* Right side: hover actions */}
              <div className="flex items-center gap-1 shrink-0 ml-1.5">
                {/* Context Menu Button on hover for fast access */}
                <button
                  type="button"
                  title="Opsi Berkas"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContextMenu(node, e);
                  }}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-md hover:bg-bg-surface text-text-muted hover:text-text-primary transition-opacity cursor-pointer"
                >
                  <MoreHorizontal size={13} />
                </button>
              </div>
            </div>

            {/* Recursive Children */}
            {isFolder && isExpanded && (
              <FileTree
                parentId={node.id}
                depth={depth + 1}
                getChildren={getChildren}
                matchesSearch={matchesSearch}
                treeSearchQuery={treeSearchQuery}
                expandedFolders={expandedFolders}
                activeFileId={activeFileId}
                handleItemClick={handleItemClick}
                handleContextMenu={handleContextMenu}
                handleTouchStart={handleTouchStart}
                handleTouchMove={handleTouchMove}
                handleTouchEnd={handleTouchEnd}
                onQuickCreateNoteInFolder={onQuickCreateNoteInFolder}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
};
