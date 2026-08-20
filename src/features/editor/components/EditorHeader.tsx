import React from 'react';
import { PanelLeft, PanelRight, Plus, X } from 'lucide-react';
import { VaultData, FileNode } from '../../../types/vault';
import { EditorMode } from '../../../types/editor';
import { ModeSwitcher } from './ModeSwitcher';
import { NoteOptionsMenu } from './NoteOptionsMenu';
import { useNavigation } from '../../../context/NavigationContext';

import { RagStatusDot } from './RagStatusDot';

interface EditorHeaderProps {
  vault: VaultData;
  activeNode: FileNode | null;
  mode: EditorMode;
  handleModeChange: (newMode: EditorMode) => void;
  setMode: (newMode: EditorMode) => void;
  navigateToNote: (id: string) => void;
  closeTab: (id: string) => void;
  openInNewTab: (id: string | null) => void;
  handleLeftHeaderToggle: () => void;
  handleRightHeaderToggle: () => void;
  onMoveNote?: () => void;
  onDeleteNote?: () => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  vault,
  activeNode,
  mode,
  handleModeChange,
  setMode,
  navigateToNote,
  closeTab,
  openInNewTab,
  handleLeftHeaderToggle,
  handleRightHeaderToggle,
  onMoveNote,
  onDeleteNote,
}) => {
  const { isDesktopSidebarOpen, isMobileSidebarOpen } = useNavigation();

  return (
    <header className="flex items-center justify-between bg-bg-surface border-b border-border-default z-10 px-2 h-10 shrink-0 select-none">
      {/* Left Controls (Sidebar Toggle + Divider) */}
      <div className="flex items-center shrink-0 pr-1">
        {/* Mobile Left Sidebar Toggle */}
        <button
          type="button"
          onClick={handleLeftHeaderToggle}
          title="Toggle Left Sidebar"
          className="lg:hidden w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer shrink-0"
        >
          <PanelLeft size={16} />
        </button>

        {/* Desktop Left Sidebar Toggle */}
        <button
          type="button"
          onClick={handleLeftHeaderToggle}
          title="Toggle Left Sidebar"
          className="hidden lg:flex w-7 h-7 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer shrink-0"
        >
          <PanelLeft size={16} />
        </button>

        {/* Thin Divider separating Left Sidebar Toggle from Tab Bar */}
        <div className="h-4 w-px bg-border-default ml-1.5 shrink-0" />
      </div>

      {/* Scrollable Tabs Area */}
      <div className="flex items-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth flex-1 min-w-0 h-full px-1.5">
        {(vault.openTabs || []).map((tabId) => {
          const isTabEmpty = tabId.startsWith('empty_');
          const node = !isTabEmpty ? vault.nodes[tabId] : null;
          const tabTitle = isTabEmpty ? 'Tab Baru' : (node?.name || 'Untitled');
          const isActive = vault.activeTabId === tabId;

          return (
            <div
              key={tabId}
              onClick={() => {
                navigateToNote(tabId);
                if (!isTabEmpty) {
                  setMode('PREVIEW');
                }
              }}
              className={`group flex items-center gap-2 h-8 px-3 text-xs font-medium min-w-[110px] max-w-[170px] shrink-0 cursor-pointer transition-colors relative select-none ${
                isActive
                  ? 'border-t border-l border-r border-border-default rounded-t-lg bg-bg-primary text-text-primary z-10 before:absolute before:-bottom-px before:left-0 before:right-0 before:h-px before:bg-bg-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-hover/60 rounded-t-lg border-t border-l border-r border-transparent'
              }`}
            >
              <span className="truncate flex-1">{tabTitle}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tabId);
                }}
                title="Tutup Tab"
                className="w-4 h-4 flex items-center justify-center rounded-xs hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0 opacity-70 group-hover:opacity-100"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}

        {/* Add New Tab Button (+) */}
        <div className="flex items-center h-8 shrink-0">
          <button
            type="button"
            onClick={() => openInNewTab(null)}
            title="Buka Tab Baru"
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors shrink-0 cursor-pointer"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      {/* Right Controls (Divider + Mode Switcher + Right Sidebar Toggle) */}
      <div className="flex items-center gap-1 shrink-0 pl-1">
        {/* Thin Divider separating Tab Bar from Right Controls */}
        <div className="h-4 w-px bg-border-default mr-1 shrink-0" />

        {/* Desktop Controls (Note Options Menu + Mode Switcher) */}
        {activeNode && (
          <>
            {onMoveNote && onDeleteNote && (
              <div className="hidden lg:flex items-center">
                <NoteOptionsMenu
                  variant="inline"
                  onMoveNote={onMoveNote}
                  onDeleteNote={onDeleteNote}
                />
              </div>
            )}
            <div className="hidden lg:flex items-center">
              <ModeSwitcher mode={mode} setMode={handleModeChange} variant="inline" />
            </div>
            <div className="hidden lg:block h-4 w-px bg-border-default mx-1 shrink-0" />
          </>
        )}

        <button
          type="button"
          onClick={handleRightHeaderToggle}
          title="Toggle Right Sidebar"
          className="relative w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer shrink-0"
        >
          <PanelRight size={16} />
          <RagStatusDot activeNode={activeNode} />
        </button>
      </div>
    </header>
  );
};
