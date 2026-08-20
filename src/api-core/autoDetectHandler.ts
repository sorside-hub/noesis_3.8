import { KeySlotId } from '../lib/ai/types';
import { executeWithFailover } from '../lib/ai/failoverAdapter';
import { balancedCascade } from '../lib/ai/cascadeProfiles';

export interface ExistingFolderInfo {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
}

export interface AutoDetectFolderDecision {
  action: 'existing' | 'new';
  existingFolderId?: string;
  existingFolderPath?: string;
  newFolderName?: string;
  newFolderParentId?: string | null;
  reasoning: string;
}

export interface AutoDetectResult {
  suggestedTitle: string;
  noteType: string;
  tags: string[];
  aliases: string[];
  folderDecision: AutoDetectFolderDecision;
}

export async function handleAutoDetect(
  params: {
    title?: string;
    content: string;
    currentNoteType?: string;
    existingFolders: ExistingFolderInfo[];
    customKeys?: Partial<Record<KeySlotId, string>>;
  },
  envObj: Record<string, string | undefined> = typeof process !== 'undefined' ? process.env : {}
) {
  const { title, content, currentNoteType, existingFolders, customKeys } = params;

  return executeWithFailover(
    { pair: 'feature', cascade: balancedCascade, customKeys, envObj },
    async (client, _slotId, _role, model) => {
      const prompt = `You are an expert PKM (Personal Knowledge Management) librarian and note organizer.
Analyze the note's title and content, then automatically determine the best title, note type, tags, aliases, and folder placement.

NOTE DETAILS:
- Current Title: ${title || 'Untitled'}
- Current Note Type: ${currentNoteType || 'None'}
- Content:
"""
${content.slice(0, 4000)}
"""

EXISTING FOLDERS IN VAULT:
${JSON.stringify(existingFolders, null, 2)}

CRITICAL FOLDER SELECTION RULES:
1. Examine the existing folder list carefully.
2. If an existing folder matches the note's subject matter (>70% relevance), choose action "existing" and set "existingFolderId" to that folder's ID and "existingFolderPath" to its path.
3. If NO existing folder is relevant, choose action "new":
   - If creating a new top-level folder at root (OMIT newFolderParentId completely): Check the numbered prefixes of existing root folders (e.g. "00-Inbox", "01-Projects"). Find the highest number used and assign the next sequential two-digit prefix (e.g., "02-Guides", "03-Reference").
   - If creating a subfolder, set newFolderName and newFolderParentId to the parent folder's ID.

METADATA RULES:
- "suggestedTitle": Generate a clear, concise title. If current title is "Untitled" or generic like "Capture 19 Aug...", extract a meaningful title from content. Otherwise keep or refine the current title.
- "noteType": Short category (e.g. Concept, Meeting Notes, Project, Reference, Journal, Tutorial, Guide, Task, Idea, Architecture).
- "tags": 2 to 5 relevant lowercase tags (without '#' prefix).
- "aliases": 1 to 3 alternative titles, synonyms, or key terms for wikilinks.

Respond STRICTLY in JSON according to the schema.`;

      const schema = {
        type: 'OBJECT' as const,
        properties: {
          suggestedTitle: { type: 'STRING' as const },
          noteType: { type: 'STRING' as const },
          tags: {
            type: 'ARRAY' as const,
            items: { type: 'STRING' as const },
          },
          aliases: {
            type: 'ARRAY' as const,
            items: { type: 'STRING' as const },
          },
          folderDecision: {
            type: 'OBJECT' as const,
            properties: {
              action: { type: 'STRING' as const, enum: ['existing', 'new'] },
              existingFolderId: { type: 'STRING' as const },
              existingFolderPath: { type: 'STRING' as const },
              newFolderName: { type: 'STRING' as const },
              newFolderParentId: { type: 'STRING' as const },
              reasoning: { type: 'STRING' as const },
            },
            required: ['action', 'reasoning'],
          },
        },
        required: ['suggestedTitle', 'noteType', 'tags', 'aliases', 'folderDecision'],
      };

      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      const rawText = response.text || '{}';
      const parsed = JSON.parse(rawText) as AutoDetectResult;

      return {
        result: parsed,
        modelUsed: model,
      };
    }
  );
}
