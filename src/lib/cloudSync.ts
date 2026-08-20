import { supabase } from './supabase';
import { db } from './db';
import { FileNode } from '../types/vault';

// Get current user ID silently
const getUserId = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
};

// Push a single node (create or update) to Supabase
export const pushNodeToCloud = async (node: FileNode): Promise<void> => {
  try {
    const userId = await getUserId();
    if (!userId) return; // Not logged in, skip sync

    const payload = {
      id: node.id,
      name: node.name,
      type: node.type,
      parentId: node.parentId,
      content: node.content || null,
      metadata: node.metadata || null,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
      user_id: userId
    };

    const { error } = await supabase.from('nodes').upsert(payload);
    if (error) {
      console.error('Supabase push error:', error.message);
    }
  } catch (err) {
    console.error('Failed to push to cloud:', err);
  }
};

// Delete nodes from Supabase
export const deleteNodesFromCloud = async (ids: string[]): Promise<void> => {
  try {
    const userId = await getUserId();
    if (!userId) return; // Not logged in, skip sync

    const { error } = await supabase
      .from('nodes')
      .delete()
      .in('id', ids)
      .eq('user_id', userId); // Extra safety

    if (error) {
      console.error('Supabase delete error:', error.message);
    }
  } catch (err) {
    console.error('Failed to delete from cloud:', err);
  }
};

// Full Sync: Pull down all nodes from Cloud to IndexedDB
export const syncPullFromCloud = async (): Promise<void> => {
  try {
    const userId = await getUserId();
    if (!userId) return;

    const { data: cloudNodes, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    if (!cloudNodes || cloudNodes.length === 0) return;

    // Convert to FileNode format
    const localNodes: FileNode[] = cloudNodes.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type as 'file' | 'folder',
      parentId: node.parentId,
      content: node.content || undefined,
      metadata: node.metadata || undefined,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt
    }));

    // Save to IndexedDB
    await db.nodes.bulkPut(localNodes);
  } catch (err) {
    console.error('Failed to pull from cloud:', err);
    throw err;
  }
};

// Full Sync: Push all IndexedDB nodes up to Cloud (Useful for initial migration)
export const syncPushAllToCloud = async (): Promise<void> => {
  try {
    const userId = await getUserId();
    if (!userId) return;

    const allLocalNodes = await db.nodes.toArray();
    if (allLocalNodes.length === 0) return;

    const cloudPayloads = allLocalNodes.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type,
      parentId: node.parentId,
      content: node.content || null,
      metadata: node.metadata || null,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
      user_id: userId
    }));

    const { error } = await supabase.from('nodes').upsert(cloudPayloads);
    if (error) throw error;
  } catch (err) {
    console.error('Failed to push all to cloud:', err);
    throw err;
  }
};
