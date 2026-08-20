import React, { useState, useRef, useEffect } from 'react';
import { useVault } from '../../../hooks/useVault';
import { LeftSidebar } from '../../workspace/components/LeftSidebar';
import { RightSidebar } from '../../workspace/components/RightSidebar';
import { EmptyState } from '../../workspace/components/EmptyState';
import { DeleteNodeModal } from '../../workspace/components/DeleteNodeModal';
import { MoveNodeModal } from '../../workspace/components/MoveNodeModal';
import { EditorCore } from './EditorCore';
import { PreviewPane } from './PreviewPane';
import { Toolbar } from './Toolbar';
import { ModeSwitcher } from './ModeSwitcher';
import { EditorHeader } from './EditorHeader';
import { MobileDrawer } from './MobileDrawer';
import { useNavigation } from '../../../context/NavigationContext';
import { useDrawerGestures } from '../hooks/useDrawerGestures';
import { useNoteEditorLogic } from '../hooks/useNoteEditorLogic';
import { FileNode } from '../../../types/vault';

interface NoteEditorProps {
  vaultState?: ReturnType<typeof useVault>;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ vaultState: externalVaultState }) => {
  const internalVaultState = useVault();
  const {
    vault,
    activeNode,
    setActiveTabId,
    openInNewTab,
    closeTab,
    createNote,
    createFolder,
    updateNoteContent,
    updateNodeTitle,
    updateNoteMetadata,
    moveNode,
    deleteNode,
  } = externalVaultState || internalVaultState;

  const {
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    openMobileSidebar,
    closeMobileSidebar,
    isMobileRightSidebarOpen,
    setIsMobileRightSidebarOpen,
    openMobileRightSidebar,
    closeMobileRightSidebar,
    navigateToNote,
  } = useNavigation();

  // Drawer gestures & animations
  const {
    leftDrawerRef,
    leftBackdropRef,
    rightDrawerRef,
    rightBackdropRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useDrawerGestures({
    isMobileSidebarOpen,
    openMobileSidebar,
    closeMobileSidebar,
    isMobileRightSidebarOpen,
    openMobileRightSidebar,
    closeMobileRightSidebar,
  });

  // Editor mode, scroll synchronization, wikilinks, headings, and title/content logic
  const {
    isDesktopSidebarOpen,
    setIsDesktopSidebarOpen,
    isDesktopRightSidebarOpen,
    setIsDesktopRightSidebarOpen,
    mode,
    setMode,
    lastEditMode,
    editorRef,
    previewRef,
    currentTitle,
    currentContent,
    handleModeChange,
    handleTitleChange,
    handleContentChange,
    handleCreateNewNote,
    handleQuickCapture,
    handleSelectFile,
    handleWikilinkClick,
    handleNavigateToHeading,
    handleLeftHeaderToggle,
    handleRightHeaderToggle,
  } = useNoteEditorLogic({
    vault,
    activeNode,
    updateNodeTitle,
    updateNoteContent,
    createNote,
    createFolder,
    navigateToNote,
    isMobileSidebarOpen,
    openMobileSidebar,
    closeMobileSidebar,
    isMobileRightSidebarOpen,
    openMobileRightSidebar,
    closeMobileRightSidebar,
  });

  // Note Options (Move & Delete) Modals & State
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const [, setIsInputFocused] = useState(false);
  const folderSearchInputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenMoveModal = () => {
    setFolderSearchQuery('');
    setIsMoveModalOpen(true);
    setTimeout(() => {
      folderSearchInputRef.current?.focus();
    }, 50);
  };

  const handleCloseMoveModal = () => {
    setIsMoveModalOpen(false);
  };

  const handleExecuteMove = (targetParentId: string | null) => {
    if (activeNode) {
      moveNode(activeNode.id, targetParentId);
    }
    setIsMoveModalOpen(false);
  };

  const handleOpenDeleteModal = () => {
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (activeNode) {
      deleteNode(activeNode.id);
    }
    setIsDeleteModalOpen(false);
  };

  const getFolderPath = (folderId: string): string => {
    const parts: string[] = [];
    let currId: string | null = folderId;
    const visited = new Set<string>();

    while (currId && !visited.has(currId)) {
      visited.add(currId);
      const node = vault.nodes[currId];
      if (node && node.type === 'folder') {
        parts.unshift(node.name);
        currId = node.parentId;
      } else {
        break;
      }
    }
    return parts.join(' / ');
  };

  const getAvailableFolders = (): { id: string; name: string; fullPath: string }[] => {
    const allNodes = Object.values(vault.nodes) as FileNode[];
    const folders = allNodes.filter((n) => n.type === 'folder');

    const list = folders
      .map((f) => ({
        id: f.id,
        name: f.name,
        fullPath: getFolderPath(f.id),
      }))
      .sort((a, b) => a.fullPath.localeCompare(b.fullPath));

    if (!folderSearchQuery.trim()) {
      return list;
    }

    const query = folderSearchQuery.toLowerCase().trim();
    return list.filter((item) => item.fullPath.toLowerCase().includes(query));
  };

  // Keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        handleLeftHeaderToggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleLeftHeaderToggle]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
      className="flex h-full w-full overflow-hidden bg-bg-primary text-[length:var(--text-body-size)] select-text relative"
    >
      {/* 1. DESKTOP LEFT SIDEBAR (Inline collapsible) */}
      <div
        className={`hidden lg:flex flex-col h-full border-r border-border-default bg-bg-surface transition-[width,opacity] duration-200 ease-in-out shrink-0 overflow-hidden ${
          isDesktopSidebarOpen ? 'w-72 xl:w-80 opacity-100' : 'w-0 opacity-0 border-r-0 pointer-events-none'
        }`}
      >
        <LeftSidebar
          vault={vault}
          activeFileId={vault.activeTabId}
          onSelectFile={handleSelectFile}
          onOpenInNewTab={openInNewTab}
          onCreateNote={handleCreateNewNote}
          onCreateFolder={createFolder}
          onRenameNode={updateNodeTitle}
          onMoveNode={moveNode}
          onDeleteNode={deleteNode}
          isOpen={isDesktopSidebarOpen}
          onCloseMobile={() => {}}
        />
      </div>

      {/* 2. MOBILE FULL-SCREEN LEFT DRAWER */}
      <MobileDrawer
        side="left"
        backdropRef={leftBackdropRef}
        drawerRef={leftDrawerRef}
        onClose={closeMobileSidebar}
      >
        <LeftSidebar
          vault={vault}
          activeFileId={vault.activeTabId}
          onSelectFile={handleSelectFile}
          onOpenInNewTab={openInNewTab}
          onCreateNote={handleCreateNewNote}
          onCreateFolder={createFolder}
          onRenameNode={updateNodeTitle}
          onMoveNode={moveNode}
          onDeleteNode={deleteNode}
          isOpen={isMobileSidebarOpen}
          onCloseMobile={closeMobileSidebar}
        />
      </MobileDrawer>

      {/* 3. CENTER MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Top App Bar / Tab Bar */}
        <EditorHeader
          vault={vault}
          activeNode={activeNode}
          mode={mode}
          handleModeChange={handleModeChange}
          setMode={setMode}
          navigateToNote={navigateToNote}
          closeTab={closeTab}
          openInNewTab={openInNewTab}
          handleLeftHeaderToggle={handleLeftHeaderToggle}
          handleRightHeaderToggle={handleRightHeaderToggle}
          onMoveNote={handleOpenMoveModal}
          onDeleteNote={handleOpenDeleteModal}
        />

        {/* Center Canvas */}
        {!activeNode ? (
          /* Empty State */
          <EmptyState
            onCreateNote={() => handleCreateNewNote(null)}
            onQuickCapture={handleQuickCapture}
          />
        ) : (
          /* Active Note Editor */
          <main className="flex-1 overflow-hidden relative flex flex-col">
            <div className={`flex-none ${mode === 'PREVIEW' ? 'hidden' : 'block'}`}>
              <Toolbar />
            </div>

            <div className="flex-1 overflow-hidden relative">
              {/* Preview Mode */}
              <div className={`absolute inset-0 ${mode === 'PREVIEW' ? 'block' : 'hidden'}`}>
                <PreviewPane
                  ref={previewRef}
                  title={currentTitle}
                  content={currentContent}
                  nodes={vault.nodes}
                  onDoubleClick={() => handleModeChange('LIVE_EDIT')}
                  onChange={handleContentChange}
                  onWikilinkClick={handleWikilinkClick}
                />
              </div>

              {/* Edit Modes (Source / Live Edit) */}
              <div className={`absolute inset-0 ${mode !== 'PREVIEW' ? 'block' : 'hidden'}`}>
                <EditorCore
                  key={activeNode?.id}
                  ref={editorRef}
                  title={currentTitle}
                  onTitleChange={handleTitleChange}
                  initialContent={currentContent}
                  mode={lastEditMode}
                  nodes={vault.nodes}
                  onChange={handleContentChange}
                  onWikilinkClick={handleWikilinkClick}
                />
              </div>
            </div>

            {/* Floating Mode Switcher Pill (Right Edge Center) - Mobile Only */}
            <ModeSwitcher
              mode={mode}
              setMode={handleModeChange}
              variant="floating"
              className="lg:hidden"
              onMoveNote={handleOpenMoveModal}
              onDeleteNote={handleOpenDeleteModal}
            />
          </main>
        )}
      </div>

      {/* 4. DESKTOP RIGHT SIDEBAR (Inline collapsible) */}
      <div
        className={`hidden lg:flex flex-col h-full border-l border-border-default bg-bg-surface transition-[width,opacity] duration-200 ease-in-out shrink-0 overflow-hidden ${
          isDesktopRightSidebarOpen ? 'w-80 xl:w-96 opacity-100' : 'w-0 opacity-0 border-l-0 pointer-events-none'
        }`}
      >
        <RightSidebar
          isOpen={isDesktopRightSidebarOpen}
          onClose={() => setIsDesktopRightSidebarOpen(false)}
          vault={vault}
          activeNode={activeNode}
          onSelectFile={handleSelectFile}
          onUpdateMetadata={updateNoteMetadata}
          updateNoteContent={updateNoteContent}
          updateNodeTitle={updateNodeTitle}
          createFolder={createFolder}
          moveNode={moveNode}
          onNavigateToHeading={handleNavigateToHeading}
        />
      </div>

      {/* 5. MOBILE FULL-SCREEN RIGHT DRAWER */}
      <MobileDrawer
        side="right"
        backdropRef={rightBackdropRef}
        drawerRef={rightDrawerRef}
        onClose={closeMobileRightSidebar}
      >
        <RightSidebar
          isOpen={isMobileRightSidebarOpen}
          onClose={closeMobileRightSidebar}
          vault={vault}
          activeNode={activeNode}
          onSelectFile={handleSelectFile}
          onUpdateMetadata={updateNoteMetadata}
          updateNoteContent={updateNoteContent}
          updateNodeTitle={updateNodeTitle}
          createFolder={createFolder}
          moveNode={moveNode}
          onNavigateToHeading={handleNavigateToHeading}
        />
      </MobileDrawer>

      {/* 6. MODALS TRIGGERED FROM NOTE ACTIONS */}
      {isMoveModalOpen && activeNode && (
        <MoveNodeModal
          movingNode={activeNode}
          folderSearchQuery={folderSearchQuery}
          setFolderSearchQuery={setFolderSearchQuery}
          folderSearchInputRef={folderSearchInputRef}
          setIsInputFocused={setIsInputFocused}
          closeActiveDialog={handleCloseMoveModal}
          handleExecuteMove={handleExecuteMove}
          getAvailableFolders={getAvailableFolders}
        />
      )}

      {isDeleteModalOpen && activeNode && (
        <DeleteNodeModal
          nodeToDelete={activeNode}
          closeActiveDialog={handleCloseDeleteModal}
          confirmDelete={handleConfirmDelete}
        />
      )}
    </div>
  );
};

