import {
  listUnsyncedLogs,
  listUnsyncedLogPhotos,
  markLogSynced,
  markLogPhotoSynced,
  mergeRemotePhoto,
  mergeRemoteRow,
} from '@/lib/db';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { getPhotoPublicUrl, uploadPhotoToCloud } from '@/lib/supabaseStorage';

export async function syncBehaviorLogsPush(userId: string): Promise<void> {
  if (!supabaseConfigured) return;
  const pending = listUnsyncedLogs().filter((row) => row.user_id === userId);
  for (const row of pending) {
    const { error } = await supabase.from('behavior_logs').insert({
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      payload: row.payload,
      avoided_kg_co2e: row.avoided_kg_co2e,
      included_in_summary: row.included_in_summary === 1,
      ef_version: row.ef_version,
      client_id: row.client_id,
      created_at: row.created_at,
    });
    if (!error) {
      markLogSynced(row.client_id);
    }
  }
}

export async function syncBehaviorLogsPull(userId: string): Promise<void> {
  if (!supabaseConfigured) return;
  const { data, error } = await supabase
    .from('behavior_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(800);

  if (error || !data) return;

  for (const r of data) {
    mergeRemoteRow({
      id: String(r.id),
      user_id: String(r.user_id),
      type: String(r.type),
      payload: r.payload,
      avoided_kg_co2e: Number(r.avoided_kg_co2e),
      included_in_summary: Boolean(r.included_in_summary),
      ef_version: r.ef_version ? String(r.ef_version) : null,
      client_id: r.client_id ? String(r.client_id) : null,
      created_at: String(r.created_at),
    });
  }
}

export async function syncLogPhotosPush(userId: string): Promise<void> {
  if (!supabaseConfigured) return;
  const pending = listUnsyncedLogPhotos(userId);
  for (const photo of pending) {
    try {
      let storagePath = photo.storage_path ?? null;
      let publicUrl = photo.uri;
      if (!storagePath) {
        const uploaded = await uploadPhotoToCloud(userId, photo.id, photo.uri);
        storagePath = uploaded.storagePath;
        publicUrl = uploaded.publicUrl;
      } else {
        publicUrl = getPhotoPublicUrl(storagePath);
      }

      const { error } = await supabase.from('log_photos').upsert({
        id: photo.id,
        log_client_id: photo.log_client_id,
        user_id: photo.user_id,
        storage_path: storagePath,
        source: photo.source,
        ai_category: photo.ai_category,
        ai_title: photo.ai_title,
        ai_summary: photo.ai_summary,
        ai_encouragement: photo.ai_encouragement,
        ai_confidence: photo.ai_confidence,
        ai_tags: photo.ai_tags,
        created_at: photo.created_at,
      });
      if (!error) {
        markLogPhotoSynced(photo.id, {
          storage_path: storagePath,
          uri: publicUrl,
        });
      }
    } catch {
      // keep local unsynced for next retry
    }
  }
}

export async function syncLogPhotosPull(userId: string): Promise<void> {
  if (!supabaseConfigured) return;
  const { data, error } = await supabase
    .from('log_photos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(400);

  if (error || !data) return;

  for (const row of data) {
    const storagePath = row.storage_path ? String(row.storage_path) : null;
    mergeRemotePhoto({
      id: String(row.id),
      log_client_id: String(row.log_client_id),
      user_id: String(row.user_id),
      uri: storagePath ? getPhotoPublicUrl(storagePath) : '',
      source: String(row.source) as 'camera' | 'library',
      storage_path: storagePath,
      ai_category: String(row.ai_category) as any,
      ai_title: String(row.ai_title),
      ai_summary: String(row.ai_summary),
      ai_encouragement: String(row.ai_encouragement),
      ai_confidence: String(row.ai_confidence) as any,
      ai_tags: Array.isArray(row.ai_tags) ? row.ai_tags.map(String) : [],
      created_at: String(row.created_at),
      synced: 1,
    });
  }
}

export async function syncAllForUser(userId: string): Promise<void> {
  await syncBehaviorLogsPush(userId);
  await syncLogPhotosPush(userId);
  await syncBehaviorLogsPull(userId);
  await syncLogPhotosPull(userId);
}
