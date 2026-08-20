import React, { useRef, useState } from 'react';
import { 
  Sun, 
  Moon, 
  Laptop, 
  Palette, 
  BookOpen, 
  Layers, 
  HardDrive, 
  Download,
  Upload
} from 'lucide-react';
import { useTheme, ThemeMode } from '../../../hooks/useTheme';
import { VaultData, FileNode } from '../../../types/vault';
import { ApiKeyStatusSection } from './ApiKeyStatusSection';
import { SupabaseAuthSection } from './SupabaseAuthSection';
import { exportVaultToJSON, importVaultFromJSON } from '../../../lib/storage';

interface SettingsViewProps {
  vault: VaultData;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ vault }) => {
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string>('');

  const allNodes = Object.values(vault.nodes) as FileNode[];
  const totalFiles = allNodes.filter((n) => n.type === 'file').length;
  const totalFolders = allNodes.filter((n) => n.type === 'folder').length;

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun size={20} strokeWidth={2} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={20} strokeWidth={2} /> },
    { value: 'system', label: 'System', icon: <Laptop size={20} strokeWidth={2} /> },
  ];

  const handleExport = async () => {
    try {
      const jsonStr = await exportVaultToJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = `noesis-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to export vault.');
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('Importing...');
    try {
      const text = await file.text();
      await importVaultFromJSON(text);
      setImportStatus('Import successful! Reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error(err);
      setImportStatus('Import failed. Invalid format.');
      setTimeout(() => setImportStatus(''), 3000);
    }
    
    // reset input
    e.target.value = '';
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-bg-primary text-text-primary select-text">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10 space-y-8 pb-28">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-text-heading tracking-tight">Settings</h1>
            <p className="text-sm text-text-muted mt-1">Preferences, connections, and local storage.</p>
          </div>
          <span className="shrink-0 px-2.5 py-1 bg-bg-surface border border-border-default rounded-full text-xs font-mono font-semibold text-text-muted shadow-xs">
            v3.0.0
          </span>
        </header>

        {/* 1. APPEARANCE */}
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2.5 px-1 flex items-center gap-2">
            <Palette size={14} /> Appearance
          </h2>
          <div className="grid grid-cols-3 gap-2.5">
            {themeOptions.map((opt) => {
              const isSelected = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={`flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-xl border transition-all cursor-pointer text-center ${
                    isSelected
                      ? 'bg-text-primary text-bg-surface border-transparent font-semibold shadow-xs'
                      : 'bg-bg-surface hover:bg-bg-hover text-text-secondary hover:text-text-primary border-border-default hover:border-border-subtle shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {opt.icon}
                  </div>
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. CLOUD SYNC & AUTH */}
        <section>
          <SupabaseAuthSection />
        </section>

        {/* 3. API KEYS & FAILOVER */}
        <section>
          <ApiKeyStatusSection />
        </section>

        {/* 4. AI MEMORY (RAG) */}

        {/* 5. VAULT INFO */}
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2.5 px-1 flex items-center gap-2">
            <HardDrive size={14} /> Vault & Storage
          </h2>
          <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden divide-y divide-border-subtle shadow-xs">
            <div className="flex items-center justify-between p-3.5">
               <div className="flex items-center gap-3">
                 <BookOpen size={16} className="text-text-secondary" />
                 <span className="text-sm font-medium text-text-heading">Total Notes</span>
               </div>
               <span className="text-sm text-text-muted font-mono">{totalFiles}</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
               <div className="flex items-center gap-3">
                 <Layers size={16} className="text-text-secondary" />
                 <span className="text-sm font-medium text-text-heading">Total Folders</span>
               </div>
               <span className="text-sm text-text-muted font-mono">{totalFolders}</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
               <div className="flex items-center gap-3">
                 <HardDrive size={16} className="text-text-secondary" />
                 <span className="text-sm font-medium text-text-heading">Storage Engine</span>
               </div>
               <span className="text-sm text-text-muted">IndexedDB (Local)</span>
            </div>
            <div className="p-3.5 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-text-primary text-bg-surface hover:opacity-90 rounded-lg text-sm font-semibold transition-all shadow-xs cursor-pointer"
              >
                <Download size={16} strokeWidth={2.2} />
                Backup / Export
              </button>
              <button
                onClick={handleImportClick}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-text-primary text-bg-surface hover:opacity-90 rounded-lg text-sm font-semibold transition-all shadow-xs cursor-pointer"
              >
                <Upload size={16} strokeWidth={2.2} />
                Restore / Import
              </button>
            </div>
            {importStatus && (
              <div className="p-3.5 text-center text-sm font-medium text-accent-primary bg-bg-hover">
                {importStatus}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
