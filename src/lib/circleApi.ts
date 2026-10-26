import { supabase } from '@/lib/supabase';
import type { StoredLog } from '@/features/log/types';
import { sumIncludedAvoided, weekInterval } from '@/lib/stats';
import { format, isWithinInterval, parseISO } from 'date-fns';

export type CircleRow = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
};

export type CircleMemberRow = {
  circle_id: string;
  user_id: string;
  role: string;
};

export type CirclePostRow = {
  id: string;
  circle_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

/** 小队周报聚合行（与 `circle_week_stats` 查询列一致） */
export type CircleWeekStat = {
  user_id: string;
  avoided_sum: number;
  log_count: number;
};

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i += 1) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

export async function createCircleRemote(name: string): Promise<CircleRow> {
  const invite = generateInviteCode();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error('请先登录');
  const { data, error } = await supabase
    .from('circles')
    .insert({
      name,
      invite_code: invite,
      created_by: userData.user.id,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as CircleRow;
}

export async function joinCircleRemote(inviteCode: string): Promise<string> {
  const cleaned = inviteCode.trim().toUpperCase();
  const { data, error } = await supabase.rpc('join_circle', {
    invite_code: cleaned,
  });
  if (error) throw error;
  return String(data);
}

export async function fetchMyCircles(): Promise<CircleRow[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];

  const { data: memberships, error } = await supabase
    .from('circle_members')
    .select('circle_id')
    .eq('user_id', uid);
  if (error || !memberships?.length) return [];

  const ids = memberships.map((m) => m.circle_id as string);
  const { data: circles, error: cErr } = await supabase
    .from('circles')
    .select('*')
    .in('id', ids);
  if (cErr || !circles) return [];
  return circles as CircleRow[];
}

export async function fetchCircleMembers(circleId: string): Promise<CircleMemberRow[]> {
  const { data, error } = await supabase
    .from('circle_members')
    .select('circle_id,user_id,role')
    .eq('circle_id', circleId);
  if (error || !data) return [];
  return data as CircleMemberRow[];
}

export async function fetchPosts(circleId: string): Promise<CirclePostRow[]> {
  const { data, error } = await supabase
    .from('circle_posts')
    .select('id,circle_id,user_id,content,created_at')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false })
    .limit(80);
  if (error || !data) return [];
  return data as CirclePostRow[];
}

export async function createPostRemote(circleId: string, content: string) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('请先登录');
  const { error } = await supabase.from('circle_posts').insert({
    circle_id: circleId,
    user_id: uid,
    content: content.trim().slice(0, 220),
    kind: 'text',
  });
  if (error) throw error;
}

export async function fetchPostLikeIds(postIds: string[]): Promise<Set<string>> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid || postIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from('circle_post_likes')
    .select('post_id')
    .eq('user_id', uid)
    .in('post_id', postIds);
  if (error || !data) return new Set();
  return new Set(data.map((r) => String(r.post_id)));
}

export async function toggleLikeRemote(postId: string, liked: boolean) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('请先登录');
  if (liked) {
    const { error } = await supabase.from('circle_post_likes').insert({
      post_id: postId,
      user_id: uid,
    });
    if (error && !`${error.message}`.toLowerCase().includes('duplicate')) {
      throw error;
    }
  } else {
    const { error } = await supabase
      .from('circle_post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', uid);
    if (error) throw error;
  }
}

export async function fetchLikeCounts(postIds: string[]): Promise<Record<string, number>> {
  if (postIds.length === 0) return {};
  const { data, error } = await supabase
    .from('circle_post_likes')
    .select('post_id')
    .in('post_id', postIds);
  if (error || !data) return {};
  const counts: Record<string, number> = {};
  for (const row of data) {
    const pid = String(row.post_id);
    counts[pid] = (counts[pid] ?? 0) + 1;
  }
  return counts;
}

export async function pushWeekContributionRemote(
  circleId: string,
  logs: StoredLog[],
  principalUserId: string,
) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid || uid !== principalUserId) throw new Error('请先登录');

  const { start, end } = weekInterval();
  const weekStartKey = format(start, 'yyyy-MM-dd');
  const mine = logs.filter((l) => l.user_id === principalUserId);
  const weekLogs = mine.filter((l) => {
    const t = parseISO(l.created_at);
    return isWithinInterval(t, { start, end });
  });
  const avoided = sumIncludedAvoided(mine, start, end);

  const { error } = await supabase.from('circle_week_stats').upsert(
    {
      circle_id: circleId,
      user_id: uid,
      week_start: weekStartKey,
      avoided_sum: avoided,
      log_count: weekLogs.length,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'circle_id,user_id,week_start' },
  );
  if (error) throw error;
}

export async function fetchWeekStatsRemote(circleId: string): Promise<CircleWeekStat[]> {
  const { start } = weekInterval();
  const weekStartKey = format(start, 'yyyy-MM-dd');
  const { data, error } = await supabase
    .from('circle_week_stats')
    .select('user_id,avoided_sum,log_count')
    .eq('circle_id', circleId)
    .eq('week_start', weekStartKey);
  if (error || !data) return [];
  return data as CircleWeekStat[];
}
