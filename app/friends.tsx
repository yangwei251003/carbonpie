import { AppHero } from '@/components/AppHero';
import { ScreenBody } from '@/components/ScreenBody';
import { palette } from '@/constants/colors';
import { S } from '@/constants/strings';
import { IlloSocial } from '@/illustrations/CarbonScenes';
import { useAuth } from '@/lib/auth';
import {
  fetchFriendActivityLogs,
  fetchMyProfile,
  fetchProfilesByIds,
  findProfileByFriendCode,
  listFriendRequests,
  listFriendships,
  respondFriendRequest,
  sendFriendRequestByCode,
  type PublicProfile,
} from '@/lib/socialApi';
import { behaviorTitle } from '@/lib/stats';
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  Divider,
  SegmentedButtons,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import { useFocusEffect } from 'expo-router';

type TabKey = 'feed' | 'friends' | 'requests';

export default function FriendsScreen() {
  const { session } = useAuth();
  const [tab, setTab] = useState<TabKey>('feed');
  const [snack, setSnack] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const [myProfile, setMyProfile] = useState<PublicProfile | null>(null);
  const [friends, setFriends] = useState<PublicProfile[]>([]);
  const [requests, setRequests] = useState<Awaited<ReturnType<typeof listFriendRequests>>>([]);
  const [feed, setFeed] = useState<Awaited<ReturnType<typeof fetchFriendActivityLogs>>>([]);

  const [addCode, setAddCode] = useState('');
  const [preview, setPreview] = useState<PublicProfile | null>(null);

  const friendIds = useMemo(() => friends.map((f) => f.id), [friends]);

  const load = useCallback(async () => {
    if (!session?.user?.id) {
      setMyProfile(null);
      setFriends([]);
      setRequests([]);
      setFeed([]);
      return;
    }
    try {
      const mine = await fetchMyProfile();
      setMyProfile(mine);

      const rels = await listFriendships();
      const uid = session.user.id;
      const ids: string[] = [];
      for (const r of rels) {
        if (r.user_low === uid) ids.push(r.user_high);
        else if (r.user_high === uid) ids.push(r.user_low);
      }
      const ps = await fetchProfilesByIds(ids);
      setFriends(ps);

      const req = await listFriendRequests();
      setRequests(req.filter((x) => x.status === 'pending'));

      const logs = await fetchFriendActivityLogs(ids);
      setFeed(logs);
    } catch {
      setSnack('加载失败（请确认已在 Supabase 执行 schema_social.sql）');
    }
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handlePreview() {
    if (!session?.user?.id) {
      setSnack('请先登录');
      return;
    }
    try {
      setBusy(true);
      const p = await findProfileByFriendCode(addCode);
      setPreview(p);
      if (!p) setSnack('未找到该好友码');
    } catch {
      setPreview(null);
      setSnack('查询失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    if (!session?.user?.id) {
      setSnack('请先登录');
      return;
    }
    try {
      setBusy(true);
      await sendFriendRequestByCode(addCode);
      setSnack('好友申请已发送');
      setAddCode('');
      setPreview(null);
      await load();
    } catch {
      setSnack('发送失败（对方不存在 / 已是好友 / 重复申请）');
    } finally {
      setBusy(false);
    }
  }

  async function handleRespond(reqId: string, accept: boolean) {
    try {
      setBusy(true);
      await respondFriendRequest(reqId, accept);
      setSnack(accept ? '已同意' : '已拒绝');
      await load();
    } catch {
      setSnack('操作失败');
    } finally {
      setBusy(false);
    }
  }

  if (!session?.user) {
    return (
      <ScreenBody scroll lead={<AppHero compact />}>
        <IlloSocial style={{ marginBottom: 12 }} />
        <Text variant="titleLarge" style={{ marginBottom: 8 }}>
          {S.friends}
        </Text>
        <Text style={{ color: '#6D7A74', marginBottom: 12 }}>登录后可添加好友、查看好友动态。</Text>
        <Button mode="contained-tonal" onPress={() => setSnack('请到「我的」页登录')}>
          去登录
        </Button>
        <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(undefined)} duration={2200}>
          {snack ?? ''}
        </Snackbar>
      </ScreenBody>
    );
  }

  return (
    <ScreenBody scroll lead={<AppHero compact />} scrollProps={{ contentContainerStyle: { paddingBottom: 96 } }}>
      <IlloSocial style={{ marginBottom: 12 }} />
      <Text variant="titleLarge" style={{ marginBottom: 10 }}>
        {S.friends}
      </Text>

      <Card mode="elevated" style={{ borderRadius: 18, marginBottom: 12 }}>
        <Card.Content style={{ gap: 10 }}>
          <Text variant="titleSmall">{S.profileFriendCode}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Chip icon="account-circle-outline">{myProfile?.display_name ?? session.user.email ?? '用户'}</Chip>
            <Chip icon="qrcode">{myProfile?.friend_code ?? '—'}</Chip>
          </View>
          <Text style={{ color: '#6D7A74', fontSize: 12 }}>
            把好友码发给同学，对方在这里输入即可发起好友申请。
          </Text>
        </Card.Content>
      </Card>

      <Card mode="elevated" style={{ borderRadius: 18, marginBottom: 12 }}>
        <Card.Content style={{ gap: 10 }}>
          <Text variant="titleSmall">{S.friendsAdd}</Text>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TextInput
              mode="outlined"
              label="输入对方好友码"
              value={addCode}
              onChangeText={setAddCode}
              autoCapitalize="characters"
              style={{ flex: 1 }}
            />
            <Button mode="outlined" loading={busy} onPress={() => void handlePreview()} disabled={!addCode.trim()}>
              查询
            </Button>
          </View>
          {preview ? (
            <View style={{ padding: 10, borderRadius: 12, backgroundColor: palette.surfaceVariant }}>
              <Text>找到用户：{preview.display_name ?? preview.id.slice(0, 8) + '…'}</Text>
              {preview.bio ? <Text style={{ color: '#6D7A74' }}>签名：{preview.bio}</Text> : null}
              <Button style={{ marginTop: 8 }} mode="contained" onPress={() => void handleSend()} loading={busy}>
                发送好友申请
              </Button>
            </View>
          ) : null}
        </Card.Content>
      </Card>

      <SegmentedButtons
        value={tab}
        onValueChange={(v) => setTab(v as TabKey)}
        buttons={[
          { value: 'feed', label: S.friendsFeed },
          { value: 'friends', label: '好友列表' },
          { value: 'requests', label: S.friendsRequests },
        ]}
        style={{ marginBottom: 12 }}
      />

      {tab === 'friends' ? (
        <Card mode="elevated" style={{ borderRadius: 18, marginBottom: 12 }}>
          <Card.Content style={{ gap: 10 }}>
            {friends.length === 0 ? (
              <Text style={{ color: '#6D7A74' }}>还没有好友，先用好友码加一个吧。</Text>
            ) : (
              friends.map((f) => (
                <View key={f.id}>
                  <Text variant="titleSmall">{f.display_name ?? f.id.slice(0, 8) + '…'}</Text>
                  {f.bio ? <Text style={{ color: '#6D7A74' }}>{f.bio}</Text> : null}
                  <Divider style={{ marginVertical: 10 }} />
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      ) : null}

      {tab === 'requests' ? (
        <Card mode="elevated" style={{ borderRadius: 18, marginBottom: 12 }}>
          <Card.Content style={{ gap: 10 }}>
            {requests.length === 0 ? (
              <Text style={{ color: '#6D7A74' }}>暂无好友申请。</Text>
            ) : (
              requests.map((r) => (
                <View key={r.id} style={{ paddingVertical: 6 }}>
                  <Text>{`来自：${r.from_user.slice(0, 8)}…`}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <Button mode="contained" loading={busy} onPress={() => void handleRespond(r.id, true)}>
                      同意
                    </Button>
                    <Button mode="outlined" loading={busy} onPress={() => void handleRespond(r.id, false)}>
                      拒绝
                    </Button>
                  </View>
                  <Divider style={{ marginVertical: 10 }} />
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      ) : null}

      {tab === 'feed' ? (
        <Card mode="elevated" style={{ borderRadius: 18, marginBottom: 12 }}>
          <Card.Content style={{ gap: 10 }}>
            {friendIds.length === 0 ? (
              <Text style={{ color: '#6D7A74' }}>先添加好友，就能看到彼此的记录动态。</Text>
            ) : feed.length === 0 ? (
              <Text style={{ color: '#6D7A74' }}>好友最近还没有可展示的记录。</Text>
            ) : (
              feed.map((x) => (
                <View key={x.id}>
                  <Text variant="titleSmall">
                    {(friends.find((f) => f.id === x.user_id)?.display_name ?? '低碳好友')} 完成了 {behaviorTitle(x.type as any)}
                  </Text>
                  <Text style={{ color: '#6D7A74', marginTop: 3 }}>
                    {new Date(x.created_at).toLocaleString('zh-CN')}
                  </Text>
                  <Text style={{ color: palette.primary, marginTop: 5, fontWeight: '700' }}>
                    {x.included_in_summary
                      ? `约减少 ${Number(x.avoided_kg_co2e).toFixed(3)} kg CO₂e`
                      : '这是一条美德/习惯记录'}
                  </Text>
                  <Divider style={{ marginVertical: 10 }} />
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      ) : null}

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(undefined)} duration={2600}>
        {snack ?? ''}
      </Snackbar>
    </ScreenBody>
  );
}
