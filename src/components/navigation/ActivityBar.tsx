import React from 'react';
import { FolderTree, Settings, MessageSquare, Plus } from 'lucide-react';
import { ActiveTab } from './BottomNavPill';
import { useNavigation } from '../../context/NavigationContext';

interface ActivityBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onCreateNote?: () => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({ activeTab, onTabChange, onCreateNote }) => {
  const { isDesktopSidebarOpen, toggleDesktopSidebar, openDesktopSidebar } = useNavigation();

  const handleVaultClick = () => {
    if (activeTab !== 'vault') {
      onTabChange('vault');
      openDesktopSidebar();
    } else {
      toggleDesktopSidebar();
    }
  };

  return (
    <div className="hidden lg:flex flex-col w-12 h-full bg-bg-surface border-r border-border-default shrink-0 items-center py-4 justify-between select-none z-20">
      <div className="flex flex-col items-center gap-3 w-full px-1.5">
        {onCreateNote && (
          <button
            type="button"
            title="Catatan Baru"
            onClick={onCreateNote}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 cursor-pointer text-text-muted hover:text-text-primary hover:bg-bg-hover mb-1 border border-border-default/70 hover:border-border-default shadow-xs"
          >
            <Plus size={18} strokeWidth={2.2} />
          </button>
        )}
        
        {/* Vault Tab (Clicking when active toggles the left sidebar) */}
        <button
          type="button"
          title={`Vault Berkas (${isDesktopSidebarOpen && activeTab === 'vault' ? 'Tutup Sidebar' : 'Buka Sidebar'})`}
          onClick={handleVaultClick}
          className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 cursor-pointer group ${
            activeTab === 'vault'
              ? 'text-bg-surface bg-text-primary font-medium shadow-xs'
              : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          <FolderTree size={18} strokeWidth={activeTab === 'vault' ? 2.2 : 1.8} />

          {/* Expanded sidebar dot indicator */}
          {activeTab === 'vault' && isDesktopSidebarOpen && (
            <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-bg-surface ring-1 ring-text-primary" />
          )}
        </button>

        {/* Chat Tab */}
        <button
          type="button"
          title="Tanya AI / Chat"
          onClick={() => onTabChange('chat')}
          className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 cursor-pointer group ${
            activeTab === 'chat'
              ? 'text-bg-surface bg-text-primary font-medium shadow-xs'
              : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          <MessageSquare size={18} strokeWidth={activeTab === 'chat' ? 2.2 : 1.8} />
        </button>
      </div>

      <div className="flex flex-col items-center gap-3 w-full px-1.5">
        <button
          type="button"
          title="Pengaturan"
          onClick={() => onTabChange('settings')}
          className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 cursor-pointer group ${
            activeTab === 'settings'
              ? 'text-bg-surface bg-text-primary font-medium shadow-xs'
              : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          <Settings size={18} strokeWidth={activeTab === 'settings' ? 2.2 : 1.8} />
        </button>
      </div>
    </div>
  );
};
