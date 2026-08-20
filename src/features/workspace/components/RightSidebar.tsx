import React from 'react';
import { 
  SlidersVertical, 
  ArrowLeftRight, 
  Link2, 
  ListTree, 
  Sparkles,
  CheckSquare,
  MessageSquare
} from 'lucide-react';
import { VaultData, FileNode, NoteMetadata } from '../../../types/vault';
import { useVirtualKeyboard } from '../../../hooks/useVirtualKeyboard';
import { useRightSidebarLogic, RightSidebarTab } from '../hooks/useRightSidebarLogic';
import { PropertiesTab } from './PropertiesTab';
import { DistilTab } from './DistilTab';
import { ChatTab } from './ChatTab';
import { LinksTab } from './LinksTab';
import { OutlineTab } from './OutlineTab';
import { TasksTab } from './TasksTab';
import { RightSidebarTabSwitcher } from './RightSidebarTabSwitcher';
import { AutoDetectModal } from './AutoDetectModal';

export type { RightSidebarTab };

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  vault: VaultData;
  activeNode: FileNode | null;
  onSelectFile: (id: string) => void;
  onUpdateMetadata: (id: string, metadata: Partial<NoteMetadata>) => void;
  updateNoteContent?: (id: string, content: string) => void;
  updateNodeTitle?: (id: string, title: string) => void;
  createFolder?: (parentId: string | null, name: string) => string | null;
  moveNode?: (id: string, targetParentId: string | null) => void;
  onNavigateToHeading?: (lineIndex: number, text: string) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  isOpen,
  vault,
  activeNode,
  onSelectFile,
  onUpdateMetadata,
  updateNoteContent,
  updateNodeTitle,
  createFolder,
  moveNode,
  onNavigateToHeading,
}) => {
  const { isKeyboardOpen } = useVirtualKeyboard();

  const {
    activeTab,
    setActiveTab,
    isTabMenuOpen,
    setIsTabMenuOpen,
    tabMenuRef,
    isDistiling,
    distilError,
    distilHtml,
    isSyncingRag,
    ragSyncStatus,
    folderName,
    stats,
    formattedCreated,
    formattedModified,
    tags,
    aliases,
    noteType,
    status,
    backlinks,
    outgoingLinks,
    collapsedHeadingIndices,
    setCollapsedHeadingIndices,
    outlineHeadings,
    handleGenerateDistil,
    handleTypeChange,
    handleStatusChange,
    handleTagsChange,
    handleAliasesChange,
    handleDistilClick,
    handleRemoveRag,
    handleProcessRag,
    toggleHeadingCollapse,
    handleUpdateContent,
    isAutoDetecting,
    autoDetectError,
    autoDetectResult,
    isAutoDetectModalOpen,
    setIsAutoDetectModalOpen,
    handleRunAutoDetect,
    handleApplyAutoDetect,
  } = useRightSidebarLogic({
    vault,
    activeNode,
    onSelectFile,
    onUpdateMetadata,
    updateNoteContent,
    updateNodeTitle,
    createFolder,
    moveNode,
    onNavigateToHeading,
  });

  // Metadata accessors
  const metadata: NoteMetadata = activeNode?.metadata || {};

  // Tab definitions
  const tabs: { id: RightSidebarTab; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
    { id: 'PROPERTIES', label: 'Properties', icon: SlidersVertical },
    { id: 'TASKS', label: 'Tasks', icon: CheckSquare },
    { id: 'OUTLINE', label: 'Outline', icon: ListTree },
    { id: 'DISTIL', label: 'Distil AI', icon: Sparkles },
    { id: 'CHAT', label: 'Chat', icon: MessageSquare },
    { id: 'BACKLINKS', label: 'Backlinks', icon: ArrowLeftRight },
    { id: 'OUTGOING_LINKS', label: 'Outgoing Links', icon: Link2 },
  ];

  if (!isOpen) return null;

  return (
    <aside className="w-full h-full flex flex-col bg-bg-surface border-l border-border-default relative overflow-hidden select-none">
      {/* MAIN BODY CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-3">
        {!activeNode ? (
          <div className="h-full flex items-center justify-center text-center text-text-muted text-sm py-24">
            No active note selected.
          </div>
        ) : (
          <>
            {/* TAB 1: PROPERTIES */}
            {activeTab === 'PROPERTIES' && (
              <PropertiesTab
                activeNode={activeNode}
                folderName={folderName}
                noteType={noteType}
                status={status}
                tags={tags}
                aliases={aliases}
                isSyncingRag={isSyncingRag}
                ragSyncStatus={ragSyncStatus}
                formattedCreated={formattedCreated}
                formattedModified={formattedModified}
                stats={stats}
                isAutoDetecting={isAutoDetecting}
                autoDetectError={autoDetectError}
                handleTypeChange={handleTypeChange}
                handleStatusChange={handleStatusChange}
                handleTagsChange={handleTagsChange}
                handleAliasesChange={handleAliasesChange}
                handleProcessRag={handleProcessRag}
                handleRemoveRag={handleRemoveRag}
                handleRunAutoDetect={handleRunAutoDetect}
              />
            )}

            {/* TAB 2: TASKS & CHECKLIST */}
            {activeTab === 'TASKS' && (
              <TasksTab
                activeNode={activeNode}
                onUpdateContent={handleUpdateContent}
                onNavigateToLine={onNavigateToHeading}
              />
            )}

            {/* TAB 3: OUTLINE */}
            {activeTab === 'OUTLINE' && (
              <OutlineTab
                outlineHeadings={outlineHeadings}
                collapsedHeadingIndices={collapsedHeadingIndices}
                setCollapsedHeadingIndices={setCollapsedHeadingIndices}
                toggleHeadingCollapse={toggleHeadingCollapse}
                onNavigateToHeading={onNavigateToHeading}
              />
            )}

            {/* TAB 4: DISTIL */}
            {activeTab === 'DISTIL' && (
              <DistilTab
                activeNode={activeNode}
                isDistiling={isDistiling}
                distilError={distilError}
                distilHtml={distilHtml}
                distilResult={metadata.distilResult as string | undefined}
                distilModel={metadata.distilModel as string | undefined}
                onGenerateDistil={handleGenerateDistil}
                onDistilClick={handleDistilClick}
              />
            )}

            {/* TAB 5: CHAT */}
            {activeTab === 'CHAT' && (
              <ChatTab activeNode={activeNode} onUpdateMetadata={onUpdateMetadata} />
            )}

            {/* TAB 6: BACKLINKS & OUTGOING LINKS */}
            {activeTab === 'BACKLINKS' && (
              <LinksTab
                type="BACKLINKS"
                activeNodeName={activeNode.name}
                backlinks={backlinks}
                outgoingLinks={outgoingLinks}
                onSelectFile={onSelectFile}
              />
            )}

            {/* TAB 6: OUTGOING LINKS */}
            {activeTab === 'OUTGOING_LINKS' && (
              <LinksTab
                type="OUTGOING_LINKS"
                activeNodeName={activeNode.name}
                backlinks={backlinks}
                outgoingLinks={outgoingLinks}
                onSelectFile={onSelectFile}
              />
            )}
          </>
        )}
      </div>

      {/* FLOATING ROUNDED PILL TAB SWITCHER */}
      <RightSidebarTabSwitcher
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isTabMenuOpen={isTabMenuOpen}
        setIsTabMenuOpen={setIsTabMenuOpen}
        tabMenuRef={tabMenuRef}
        isKeyboardOpen={isKeyboardOpen}
        tabs={tabs}
      />

      {/* AUTO-DETECT CONFIRMATION MODAL */}
      <AutoDetectModal
        isOpen={isAutoDetectModalOpen}
        onClose={() => setIsAutoDetectModalOpen(false)}
        result={autoDetectResult}
        onApply={handleApplyAutoDetect}
      />
    </aside>
  );
};
