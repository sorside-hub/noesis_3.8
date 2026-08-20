import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { KeySlotId } from './src/lib/ai/types';
import { handleKeysOverview, handleSingleKeyCheck } from './src/api-core/keysHandler';
import { handleDistil } from './src/api-core/distilHandler';
import { handleAutoDetect, ExistingFolderInfo } from './src/api-core/autoDetectHandler';
import { handleAnalyzeNote } from './src/api-core/analysisHandler';
import { handleGenerateEmbeddings } from './src/api-core/embeddingHandler';
import { handleEditorAction, EditorActionType } from './src/api-core/editorActionHandler';

// Load environment variables from .env
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // =========================================================================
  // API ROUTES
  // =========================================================================

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // POST /api/keys/status - Check health of all 4 API keys (2 pairs)
  app.post('/api/keys/status', async (req, res) => {
    try {
      const customKeys = (req.body?.customKeys || {}) as Partial<Record<KeySlotId, string>>;
      
      // Menggunakan pola "Adapter" dengan menyerahkan proses ke Core Logic
      const result = await handleKeysOverview(customKeys, process.env);
      
      res.json(result);
    } catch (error: unknown) {
      console.error('[API /api/keys/status Error]:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  });

  // POST /api/keys/check-single - Test a single API key slot
  app.post('/api/keys/check-single', async (req, res) => {
    try {
      const { slotId, apiKey } = req.body as { slotId?: KeySlotId; apiKey?: string };

      if (!slotId) {
        return res.status(400).json({ error: 'slotId is required' });
      }

      // Menggunakan pola "Adapter" dengan menyerahkan proses ke Core Logic
      const result = await handleSingleKeyCheck(slotId, apiKey, process.env);
      
      res.json(result);
    } catch (error: unknown) {
      console.error('[API /api/keys/check-single Error]:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  });

  // POST /api/distil - Distil note content using Pair 2 keys
  app.post('/api/distil', async (req, res) => {
    try {
      const { content, customKeys } = req.body as { content?: string, customKeys?: Partial<Record<KeySlotId, string>> };
      if (!content) {
        return res.status(400).json({ error: 'content is required' });
      }
      
      const result = await handleDistil(content, customKeys, process.env);
      res.json(result);
    } catch (error: unknown) {
      console.error('[API /api/distil Error]:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  });

  // POST /api/auto-detect - AI Auto-Detect note metadata and folder placement
  app.post('/api/auto-detect', async (req, res) => {
    try {
      const {
        title,
        content,
        currentNoteType,
        existingFolders,
        customKeys,
      } = req.body as {
        title?: string;
        content?: string;
        currentNoteType?: string;
        existingFolders?: ExistingFolderInfo[];
        customKeys?: Partial<Record<KeySlotId, string>>;
      };

      if (!content && !title) {
        return res.status(400).json({ error: 'content or title is required' });
      }

      const result = await handleAutoDetect(
        {
          title: title || '',
          content: content || '',
          currentNoteType,
          existingFolders: existingFolders || [],
          customKeys,
        },
        process.env
      );

      res.json(result);
    } catch (error: unknown) {
      console.error('[API /api/auto-detect Error]:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  });

  // POST /api/analyze - AI Analysis for RAG
  app.post('/api/analyze', async (req, res) => {
    try {
      const { content, customKeys } = req.body;
      if (!content) return res.status(400).json({ error: 'content is required' });
      const result = await handleAnalyzeNote(content, customKeys, process.env);
      res.json(result);
    } catch (error: unknown) {
      console.error('[API /api/analyze Error]:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
    }
  });

  // POST /api/embeddings - Generate Embeddings for RAG
  app.post('/api/embeddings', async (req, res) => {
    try {
      const { texts, customKeys } = req.body;
      if (!texts || !Array.isArray(texts)) return res.status(400).json({ error: 'texts array is required' });
      const result = await handleGenerateEmbeddings(texts, customKeys, process.env);
      res.json(result);
    } catch (error: unknown) {
      console.error('[API /api/embeddings Error]:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
    }
  });

  // POST /api/editor-action - AI Contextual Actions
  app.post('/api/editor-action', async (req, res) => {
    try {
      const { action, text, extraContext, customKeys } = req.body as {
        action: EditorActionType;
        text: string;
        extraContext?: string;
        customKeys?: Partial<Record<KeySlotId, string>>;
      };

      if (!action || !text) {
        return res.status(400).json({ error: 'action and text are required' });
      }

      const result = await handleEditorAction(action, text, extraContext, customKeys, process.env);
      res.json(result);
    } catch (error: unknown) {
      console.error('[API /api/editor-action Error]:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  });

  // =========================================================================
  // VITE / STATIC SERVING
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Noesis Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Fatal Startup Error]:', err);
  process.exit(1);
});
