import { AppHero } from '@/components/AppHero';
import { ScreenBody } from '@/components/ScreenBody';
import { palette } from '@/constants/colors';
import { S } from '@/constants/strings';
import { markDailyTask } from '@/features/homestead/service';
import {
  createPostRemote,
  fetchLikeCounts,
  fetchPosts,
  fetchPostLikeIds,
  toggleLikeRemote,
} from '@/lib/circleApi';
import { getActiveCircleId } from '@/lib/circleLocal';
import { useAuth } from '@/lib/auth';
import { supabaseConfigured } from '@/lib/supabase';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  Button,
  Card,
  Divider,
  IconButton,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';

export default function CircleFeedScreen() {
  const params = useLocalSearchParams<{ circleId?: string }>();
  const { principalUserId, session } = useAuth();
  const [resolvedCircleId, setResolvedCircleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Awaited<ReturnType<typeof fetchPosts>>>([]);
  const [likesMine, setLikesMine] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [composer, setComposer] = useState('');
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<string | undefined>();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      let cid = typeof params.circleId === 'string' ? params.circleId.trim() : '';
      if (!cid) cid = (await getActiveCircleId()) ?? '';
      setResolvedCircleId(cid || null);
      if (!cid || !supabaseConfigured) {
        setPosts([]);
        setLikesMine(new Set());
        setLikeCounts({});
        return;
      }
      const list = await fetchPosts(cid);
      setPosts(list);
      const ids = list.map((p) => p.id);
      if (ids.length === 0) {
        setLikesMine(new Set());
        setLikeCounts({});
        return;
      }
      const [mine, counts] = await Promise.all([
        fetchPostLikeIds(ids),
        fetchLikeCounts(ids),
      ]);
      setLikesMine(mine);
      setLikeCounts(counts);
    } catch {
      setSnack('加载动态失败');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [params.circleId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  async function handlePost() {
    if (!session?.user?.id) {
      setSnack('请先登录');
      return;
    }
    const cid = resolvedCircleId;
    const text = composer.trim();
    if (!cid || text.length < 1) return;
    try {
      setBusy(true);
      await createPostRemote(cid, text);
      setComposer('');
      await reload();
      setSnack('已发布');
    } catch {
      setSnack('发布失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleLike(postId: string) {
    if (!session?.user?.id) {
      setSnack('请先登录后再点赞');
      return;
    }
    const liked = likesMine.has(postId);
    try {
      await toggleLikeRemote(postId, !liked);
      const next = new Set(likesMine);
      if (liked) next.delete(postId);
      else next.add(postId);
      setLikesMine(next);
      setLikeCounts((prev) => ({
        ...prev,
        [postId]: Math.max(0, (prev[postId] ?? 0) + (liked ? -1 : 1)),
      }));
      if (!liked && principalUserId) {
        markDailyTask(principalUserId, 'like_post');
      }
    } catch {
      setSnack('点赞失败');
    }
  }

  if (!supabaseConfigured) {
    return (
      <ScreenBody scroll lead={<AppHero compact />}>
        <Text style={{ marginBottom: 12 }}>请在 .env 配置 Supabase 后使用小队动态。</Text>
        <Button mode="contained-tonal" onPress={() => router.back()}>
          返回
        </Button>
      </ScreenBody>
    );
  }

  if (loading) {
    return (
      <ScreenBody scroll lead={<AppHero compact />}>
        <ActivityIndicator style={{ marginTop: 24 }} accessibilityLabel="加载中" />
        <Text style={{ marginTop: 12, color: '#6D7A74', textAlign: 'center' }}>加载小队动态…</Text>
      </ScreenBody>
    );
  }

  if (!resolvedCircleId) {
    return (
      <ScreenBody scroll lead={<AppHero compact />}>
        <Text style={{ marginBottom: 12, color: '#5F6F69' }}>
          未选择活跃小队。请先在「成长」页加入或创建小队，并点击「设为活跃小队」。
        </Text>
        <Button mode="contained-tonal" onPress={() => router.back()}>
          返回成长页
        </Button>
      </ScreenBody>
    );
  }

  return (
    <ScreenBody
      scroll
      scrollProps={{ contentContainerStyle: { paddingBottom: 88 } }}
      lead={<AppHero compact />}
    >
      <Text variant="titleLarge" style={{ marginBottom: 8 }}>
        {S.circleFeedTitle}
      </Text>
      <Text style={{ marginBottom: 14, color: '#6D7A74', fontSize: 13, lineHeight: 20 }}>
        {S.circleComposerHint}
      </Text>

      {session?.user ? (
        <Card mode="elevated" style={{ marginBottom: 14, borderRadius: 18 }}>
          <Card.Content style={{ gap: 10 }}>
            <TextInput
              mode="outlined"
              multiline
              placeholder="分享本周低碳小事…"
              value={composer}
              onChangeText={setComposer}
              maxLength={220}
            />
            <Button
              mode="contained"
              loading={busy}
              onPress={() => void handlePost()}
              disabled={composer.trim().length < 1}
            >
              发布动态
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <Card mode="outlined" style={{ marginBottom: 14, borderRadius: 18 }}>
          <Card.Content>
            <Text>{S.previewLoginGrow}</Text>
            <Button mode="contained-tonal" style={{ marginTop: 10 }} onPress={() => router.push('/login')}>
              {S.loginEmail}
            </Button>
          </Card.Content>
        </Card>
      )}

      {posts.length === 0 ? (
        <Text style={{ color: '#6D7A74' }}>还没有动态，做第一个发帖的人吧～</Text>
      ) : (
        posts.map((p) => (
          <Card key={p.id} mode="elevated" style={{ marginBottom: 12, borderRadius: 18 }}>
            <Card.Content style={{ gap: 8 }}>
              <Text style={{ fontSize: 15, lineHeight: 22, color: '#1B211F' }}>{p.content}</Text>
              <Text style={{ fontSize: 12, color: '#8A9691' }}>
                {new Date(p.created_at).toLocaleString()} · {p.user_id.slice(0, 8)}…
              </Text>
              <Divider />
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconButton
                  icon={likesMine.has(p.id) ? 'heart' : 'heart-outline'}
                  iconColor={likesMine.has(p.id) ? '#C53030' : palette.secondary}
                  onPress={() => void handleToggleLike(p.id)}
                  accessibilityLabel="点赞"
                />
                <Text style={{ fontSize: 13, color: '#5F6F69' }}>{likeCounts[p.id] ?? 0}</Text>
              </View>
            </Card.Content>
          </Card>
        ))
      )}

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(undefined)} duration={2200}>
        {snack ?? ''}
      </Snackbar>
    </ScreenBody>
  );
}
