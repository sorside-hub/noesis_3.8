import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { 
  Loader2, 
  LogIn, 
  LogOut, 
  Mail, 
  Cloud,
  CloudDownload, 
  CloudUpload, 
  Copy, 
  Check, 
  Code2, 
  ChevronDown, 
  ChevronUp, 
  Database 
} from 'lucide-react';
import { syncPullFromCloud, syncPushAllToCloud } from '../../../lib/cloudSync';

const SUPABASE_SETUP_SQL = `-- ========================================================
-- NOESIS SUPABASE COMPLETE SCHEMA SETUP (TABLES + RLS + RAG)
-- Jalankan skrip ini di SQL Editor dashboard Supabase Anda.
-- ========================================================

-- 1. AKTIFKAN EKSTENSI VECTOR (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. TABEL CATATAN & FOLDER (Local-First Cloud Sync)
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  "parentId" TEXT,
  content TEXT,
  metadata JSONB,
  "createdAt" BIGINT,
  "updatedAt" BIGINT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE nodes ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'nodes' AND policyname = 'Users can manage their own nodes'
  ) THEN
    CREATE POLICY "Users can manage their own nodes" 
    ON nodes FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. TABEL METADATA AI (Ringkasan, Konsep, Kata Kunci)
CREATE TABLE IF NOT EXISTS note_metadata (
  note_id TEXT PRIMARY KEY,
  content_hash TEXT NOT NULL,
  summary TEXT,
  keywords TEXT[],
  concepts TEXT[],
  emotion TEXT,
  model_used TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE note_metadata ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'note_metadata' AND policyname = 'Users can manage their own note metadata'
  ) THEN
    CREATE POLICY "Users can manage their own note metadata" 
    ON note_metadata FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. TABEL VEKTOR EMBEDDING (RAG Vector Database)
CREATE TABLE IF NOT EXISTS note_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE note_embeddings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'note_embeddings' AND policyname = 'Users can manage their own note embeddings'
  ) THEN
    CREATE POLICY "Users can manage their own note embeddings" 
    ON note_embeddings FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. FUNGSI PENCARI VEKTOR PINTAR (RPC match_note_embeddings)
CREATE OR REPLACE FUNCTION match_note_embeddings (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  "noteId" text,
  "chunkIndex" integer,
  "sourceType" text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    note_id as "noteId",
    chunk_index as "chunkIndex",
    source_type as "sourceType",
    note_embeddings.content,
    1 - (note_embeddings.embedding <=> query_embedding) AS similarity
  FROM note_embeddings
  WHERE 1 - (note_embeddings.embedding <=> query_embedding) > match_threshold
    AND user_id = auth.uid()
  ORDER BY note_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;`;

export const SupabaseAuthSection: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlPreview, setShowSqlPreview] = useState(false);

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch (err) {
      console.error('Failed to copy SQL to clipboard:', err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Cek email Anda untuk link konfirmasi.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat autentikasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setIsSubmitting(true);
    try {
      await supabase.auth.signOut();
    } catch (err: any) {
      console.error('Error signing out:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePullSync = async () => {
    setIsSyncing(true);
    setError(null);
    setMessage(null);
    try {
      await syncPullFromCloud();
      setMessage('Sinkronisasi (Tarik dari Cloud) berhasil! Silakan refresh halaman.');
    } catch (err: any) {
      setError('Gagal menarik data dari Cloud.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushSync = async () => {
    setIsSyncing(true);
    setError(null);
    setMessage(null);
    try {
      await syncPushAllToCloud();
      setMessage('Sinkronisasi (Dorong ke Cloud) berhasil!');
    } catch (err: any) {
      setError('Gagal mendorong data ke Cloud.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Memuat status akun...
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2.5 px-1 flex items-center gap-2">
        <Cloud size={14} /> Akun Cloud (Supabase)
      </h2>

      <div className="space-y-4">
        {user ? (
          <div className="bg-bg-surface border border-border-default rounded-xl p-5 space-y-6 shadow-xs">
            <div className="flex items-center space-x-3 text-text-primary">
              <div className="w-10 h-10 rounded-full bg-border-strong flex items-center justify-center">
                <span className="font-semibold text-lg">{user.email?.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="font-medium">{user.email}</p>
                <p className="text-xs text-text-muted">Status: Terhubung ke Cloud</p>
              </div>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-border-subtle">
              <h4 className="text-sm font-medium text-text-primary">Sinkronisasi Manual</h4>
              <p className="text-xs text-text-muted mb-2">Catatan baru akan tersinkron otomatis. Gunakan tombol ini jika Anda baru login di perangkat baru.</p>
              
              {error && <div className="text-sm text-status-error bg-status-error-bg border border-status-error/20 p-2 rounded-md">{error}</div>}
              {message && <div className="text-sm text-status-success bg-status-success-bg border border-status-success/20 p-2 rounded-md">{message}</div>}

              <div className="flex gap-3">
                <button
                  onClick={handlePullSync}
                  disabled={isSyncing}
                  className="flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium text-text-primary bg-bg-primary hover:bg-bg-hover rounded-lg transition-colors border border-border-default shadow-xs cursor-pointer"
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudDownload className="w-4 h-4 mr-2" />}
                  Tarik dari Cloud
                </button>
                
                <button
                  onClick={handlePushSync}
                  disabled={isSyncing}
                  className="flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium text-text-primary bg-bg-primary hover:bg-bg-hover rounded-lg transition-colors border border-border-default shadow-xs cursor-pointer"
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudUpload className="w-4 h-4 mr-2" />}
                  Dorong ke Cloud
                </button>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              disabled={isSubmitting}
              className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-status-error bg-status-error-bg hover:bg-status-error-bg/80 rounded-lg transition-colors border border-status-error/20 mt-4 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4 mr-2" />
              )}
              Keluar Akun
            </button>
          </div>
        ) : (
          <div className="bg-bg-surface border border-border-default rounded-xl p-5 space-y-4 shadow-xs">
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Alamat Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="anda@email.com"
                    className="w-full bg-bg-primary border border-border-default rounded-lg py-2.5 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover focus:ring-1 focus:ring-text-muted/30 transition-shadow"
                    required
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Kata Sandi
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-bg-primary border border-border-default rounded-lg py-2.5 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover focus:ring-1 focus:ring-text-muted/30 transition-shadow"
                  required
                />
              </div>

              {error && <div className="text-sm text-status-error bg-status-error-bg border border-status-error/20 p-2 rounded-md">{error}</div>}
              {message && <div className="text-sm text-status-success bg-status-success-bg border border-status-success/20 p-2 rounded-md">{message}</div>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-semibold text-bg-surface bg-text-primary hover:opacity-90 rounded-lg transition-all border border-transparent shadow-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                {isSignUp ? 'Daftar Akun Baru' : 'Masuk ke Cloud'}
              </button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-xs text-text-muted hover:text-text-primary transition-colors underline-offset-4 hover:underline cursor-pointer"
                >
                  {isSignUp ? 'Sudah punya akun? Masuk di sini' : 'Belum punya akun? Daftar gratis'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* SQL SETUP SCRIPT SECTION */}
        <div className="bg-bg-surface border border-border-default rounded-xl p-5 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-bg-primary border border-border-default text-text-primary shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-medium text-text-primary">Skrip SQL Setup Supabase</h4>
            </div>
            <button
              onClick={handleCopySql}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-xs cursor-pointer ${
                copiedSql
                  ? 'bg-status-success text-white'
                  : 'bg-bg-primary hover:bg-bg-hover text-text-primary border border-border-default'
              }`}
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Berhasil Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin SQL</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-2 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setShowSqlPreview(!showSqlPreview)}
              className="flex items-center justify-between w-full text-xs font-medium text-text-secondary hover:text-text-primary transition-colors py-1 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                {showSqlPreview ? 'Sembunyikan Kode SQL' : 'Lihat Pratinjau Kode SQL'}
              </span>
              {showSqlPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showSqlPreview && (
              <div className="mt-2.5 relative">
                <pre className="p-3.5 bg-bg-primary border border-border-subtle rounded-lg text-[11px] font-mono text-text-secondary overflow-x-auto max-h-64 leading-relaxed select-all">
                  {SUPABASE_SETUP_SQL}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

