import { supabase } from '../../../lib/supabase';
import { AIAnalysisRecord } from '../types/models';

export class SupabaseMetadataStore {
  async put(record: AIAnalysisRecord): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    const payload = {
      note_id: record.noteId,
      content_hash: record.contentHash,
      summary: record.summary,
      keywords: record.keywords,
      concepts: record.concepts,
      emotion: record.emotion,
      model_used: record.modelUsed,
      user_id: userId,
      updated_at: new Date(record.updatedAt).toISOString()
    };

    const { error } = await supabase
      .from('note_metadata')
      .upsert(payload, { onConflict: 'note_id' });

    if (error) {
      console.error('[SupabaseMetadataStore] Error upserting metadata:', error);
      throw error;
    }
  }

  async get(noteId: string): Promise<AIAnalysisRecord | null> {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from('note_metadata')
      .select('*')
      .eq('note_id', noteId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      if (error && error.code !== 'PGRST116') { // not found error code
        console.error('[SupabaseMetadataStore] Error fetching metadata:', error);
      }
      return null;
    }

    return {
      noteId: data.note_id,
      contentHash: data.content_hash,
      summary: data.summary,
      keywords: data.keywords,
      concepts: data.concepts,
      emotion: data.emotion,
      modelUsed: data.model_used,
      createdAt: new Date(data.created_at || Date.now()).getTime(),
      updatedAt: new Date(data.updated_at).getTime()
    };
  }

  async delete(noteId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    const { error } = await supabase
      .from('note_metadata')
      .delete()
      .eq('note_id', noteId)
      .eq('user_id', userId);

    if (error) {
      console.error('[SupabaseMetadataStore] Error deleting metadata:', error);
      throw error;
    }
  }
}
