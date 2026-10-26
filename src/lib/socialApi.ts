import { supabase } from '@/lib/supabase';

export type PublicProfile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  intro: string | null;
  friend_code: string | null;
};

export type FriendRequestRow = {
  id: string;
  from_user: string;
  to_user: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type FriendshipRow = {
  user_low: string;
  user_high: string;
  created_at: string;
};

export async function fetchMyProfile(): Promise<PublicProfile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id,display_name,bio,intro,friend_code')
    .eq('id', uid)
    .single();
  if (error || !data) return null;
  return data as PublicProfile;
}

export async function updateMyProfileRemote(patch: {
  display_name?: string;
  bio?: string;
  intro?: string;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('请先登录');

  const next = {
    ...(patch.display_name !== undefined ? { display_name: patch.display_name.trim().slice(0, 24) } : {}),
    ...(patch.bio !== undefined ? { bio: patch.bio.trim().slice(0, 36) } : {}),
    ...(patch.intro !== undefined ? { intro: patch.intro.trim().slice(0, 180) } : {}),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('profiles').update(next).eq('id', uid);
  if (error) throw error;
}

export async function findProfileByFriendCode(code: string): Promise<PublicProfile | null> {
  const cleaned = code.trim().toUpperCase();
  if (!cleaned) return null;
  const { data, error } = await supabase.rpc('find_profile_by_friend_code', { code: cleaned });
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return row as PublicProfile;
}

export async function sendFriendRequestByCode(code: string): Promise<string> {
  const cleaned = code.trim().toUpperCase();
  const { data, error } = await supabase.rpc('send_friend_request_by_code', { code: cleaned });
  if (error) throw error;
  return String(data);
}

export async function respondFriendRequest(reqId: string, accept: boolean): Promise<boolean> {
  const { data, error } = await supabase.rpc('respond_friend_request', { req_id: reqId, accept });
  if (error) throw error;
  return Boolean(data);
}

export async function listFriendRequests(): Promise<FriendRequestRow[]> {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id,from_user,to_user,status,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data as FriendRequestRow[];
}

export async function listFriendships(): Promise<FriendshipRow[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('user_low,user_high,created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return data as FriendshipRow[];
}

export async function fetchProfilesByIds(ids: string[]): Promise<PublicProfile[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id,display_name,bio,intro,friend_code')
    .in('id', ids);
  if (error || !data) return [];
  return data as PublicProfile[];
}

export async function fetchFriendActivityLogs(friendIds: string[]) {
  if (friendIds.length === 0) return [];
  const { data, error } = await supabase
    .from('behavior_logs')
    .select('id,user_id,type,payload,client_id,avoided_kg_co2e,included_in_summary,created_at')
    .in('user_id', friendIds)
    .order('created_at', { ascending: false })
    .limit(120);
  if (error || !data) return [];
  return data as {
    id: string;
    user_id: string;
    type: string;
    payload?: unknown;
    client_id?: string | null;
    avoided_kg_co2e: number;
    included_in_summary: boolean;
    created_at: string;
  }[];
}

export async function fetchFriendLogPhotos(logClientIds: string[]) {
  if (logClientIds.length === 0) return [];
  const { data, error } = await supabase
    .from('log_photos')
    .select('id,log_client_id,user_id,storage_path,ai_category,ai_title,ai_summary,ai_encouragement,created_at')
    .in('log_client_id', logClientIds)
    .limit(120);
  if (error || !data) return [];
  return data as {
    id: string;
    log_client_id: string;
    user_id: string;
    storage_path: string | null;
    ai_category: string;
    ai_title: string;
    ai_summary: string;
    ai_encouragement: string;
    created_at: string;
  }[];
}
