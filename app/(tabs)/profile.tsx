import { EF_VERSION } from '@/constants/carbon';
import { palette } from '@/constants/colors';
import { S } from '@/constants/strings';
import { logsToCsv, logsToJson, shareUtf8Text } from '@/lib/export';
import { useAuth, currentUserEmail } from '@/lib/auth';
import { setActiveCircleId } from '@/lib/circleLocal';
import { listLogs, listLogPhotosByUser, wipeAllLocalUserData, getHomesteadRow } from '@/lib/db';
import { syncAllForUser } from '@/lib/sync';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { sumIncludedAvoided } from '@/lib/stats';
import { levelFromXp } from '@/features/homestead/service';
import { router, useFocusEffect } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import {
  Button,
  Dialog,
  Portal,
  Snackbar,
  Text,
} from 'react-native-paper';

const LEVEL_TITLES: Record<number, string> = {
  1: 'CARBON SEEDLING',
  2: 'GREEN EXPLORER',
  3: 'ECO NAVIGATOR',
  5: 'CARBON GUARDIAN',
  8: 'SUSTAINABILITY HERO',
  12: 'EARTH CHAMPION',
};

function getLevelTitle(level: number): string {
  const keys = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a);
  for (const k of keys) {
    if (level >= k) return LEVEL_TITLES[k]!;
  }
  return 'CARBON SEEDLING';
}

export default function ProfileScreen() {
  const { session, isGuest, signOut, principalUserId } = useAuth();
  const [snack, setSnack] = useState<string | undefined>();
  const [syncing, setSyncing] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [listRev, setListRev] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setListRev((x) => x + 1);
    }, []),
  );

  const mine = useMemo(() => {
    if (!principalUserId) return [];
    return listLogs(800).filter((l) => l.user_id === principalUserId);
  }, [principalUserId, listRev]);

  const homestead = principalUserId ? getHomesteadRow(principalUserId) : null;
  const photos = principalUserId ? listLogPhotosByUser(principalUserId, 400) : [];
  const level = homestead?.level ?? 1;
  const coins = homestead?.carbon_coins ?? 0;


  // total avoided

  const startOfTime = new Date(0);
  const totalAvoided = sumIncludedAvoided(mine, startOfTime, new Date());
  const activeDays = new Set(mine.map((l) => l.created_at.slice(0, 10))).size;
  const levelTitle = getLevelTitle(level);

  async function exportJson() {
    try {
      await shareUtf8Text(`carbonpie-logs-${Date.now()}.json`, logsToJson(mine, photos));
      setSnack('已生成导出文件');
    } catch { setSnack('导出失败'); }
  }

  async function exportCsv() {
    try {
      await shareUtf8Text(`carbonpie-logs-${Date.now()}.csv`, logsToCsv(mine, photos));
      setSnack('已生成导出文件');
    } catch { setSnack('导出失败'); }
  }

  async function handleSync() {
    if (!session?.user?.id) { setSnack(S.syncSkipped); return; }
    try {
      setSyncing(true);
      await syncAllForUser(session.user.id);
      setSnack(S.syncDone);
    } catch { setSnack('同步失败，请检查网络'); } finally { setSyncing(false); }
  }

  async function deleteCloudLogs() {
    if (!session?.user?.id) { setSnack(S.loginNeededForCloudDelete); return; }
    try {
      const { error } = await supabase.from('behavior_logs').delete().eq('user_id', session.user.id);
      if (error) throw error;
      setSnack('云端记录已删除');
      setCloudOpen(false);
    } catch { setSnack('删除失败'); }
  }

  async function wipeLocalOnly() {
    wipeAllLocalUserData();
    await setActiveCircleId(null);
    setClearOpen(false);
    setSnack('本机记录已清除');
    setListRev((x) => x + 1);
  }

  return (
    <View style={styles.container}>
      {/* ── 顶部标题栏 ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CarbonPie</Text>
        <Pressable style={styles.bellBtn}>
          <MaterialCommunityIcons name="bell-outline" size={22} color={palette.onSurface} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── 头像区 ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarInner}>
              <MaterialCommunityIcons name="account" size={44} color={palette.heroOnMuted} />
            </View>
            <View style={styles.avatarBadge}>
              <MaterialCommunityIcons name="shield-check" size={14} color={palette.primary} />
            </View>
          </View>
          <Text style={styles.userName}>
            {isGuest ? '碳友' : (currentUserEmail(session?.user)?.split('@')[0] ?? '碳友')}
          </Text>
          <View style={styles.levelTag}>
            <Text style={styles.levelTagText}>LVL {level} {levelTitle}</Text>
          </View>
          {!session?.user && (
            <Pressable
              style={styles.loginBtn}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.loginBtnText}>登录 / 注册账号</Text>
            </Pressable>
          )}
        </View>

        {/* ── 统计双栏 ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statUpperLabel}>TOTAL{'\n'}REDUCTION</Text>
            <Text style={styles.statValue}>~{totalAvoided.toFixed(1)} kg</Text>
            <View style={styles.estimateTag}>
              <MaterialCommunityIcons name="information-outline" size={12} color={palette.estimate} />
              <Text style={styles.estimateText}>Estimated Savings</Text>
            </View>
          </View>
          <View style={[styles.statCard, { borderLeftWidth: 1, borderLeftColor: palette.surfaceVariant }]}>
            <Text style={styles.statUpperLabel}>RECORD{'\n'}COUNT</Text>
            <Text style={styles.statValue}>{activeDays} Days</Text>
            <Text style={styles.statSubtitle}>Active Streak: {homestead?.checkin_streak ?? 0} days</Text>
          </View>
        </View>

        {/* ── 碳币余额 ── */}
        <View style={styles.coinsCard}>
          <MaterialCommunityIcons name="leaf-circle-outline" size={24} color={palette.estimate} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.coinsLabel}>我的碳果（碳币）</Text>
            <Text style={styles.coinsValue}>~{coins}</Text>
          </View>
          <Pressable style={styles.goShopBtn} onPress={() => router.push('/grow')}>
            <Text style={styles.goShopBtnText}>去商店 →</Text>
          </Pressable>
        </View>

        {/* ── MY ACTIVITIES ── */}
        <Text style={styles.groupLabel}>MY ACTIVITIES</Text>
        <View style={styles.listGroup}>
          {[
            { icon: 'compass-outline', title: '绿色发现', sub: '浏览科普与社区挑战', route: '/articles' },
            { icon: 'home-heart', title: '我的家园', sub: '查看家园经营状态', route: '/grow' },
            { icon: 'image-multiple-outline', title: '打卡影像册', sub: '查看我保存的照片记录', route: '/photo-album' },
            { icon: 'robot-outline', title: 'AI 碳派助手', sub: '智能环保问答', route: '/ai' },
          ].map((item, idx, arr) => (
            <Pressable
              key={item.title}
              style={[styles.listItem, idx < arr.length - 1 && styles.listItemBorder]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.listIcon}>
                <MaterialCommunityIcons name={item.icon as any} size={20} color={palette.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listItemTitle}>{item.title}</Text>
                <Text style={styles.listItemSub}>{item.sub}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={palette.outline} />
            </Pressable>
          ))}
        </View>

        {/* ── TOOLS & SETTINGS ── */}
        <Text style={styles.groupLabel}>TOOLS & SETTINGS</Text>
        <View style={styles.listGroup}>
          {[
            { icon: 'download-outline', title: '导出记录 JSON', sub: '备份完整低碳记录数据', action: () => exportJson() },
            { icon: 'file-delimited-outline', title: '导出记录 CSV', sub: '导出便于表格整理的数据', action: () => exportCsv() },
            { icon: 'image-frame', title: '生成周报海报', sub: '用本周照片和数据生成分享海报', route: '/share-week' },
            { icon: 'sync', title: '同步云端', sub: '上传到 Supabase', action: () => handleSync(), disabled: !supabaseConfigured || !session?.user },
            { icon: 'cog-outline', title: '关于 / 设置', sub: '版本与方法学说明', route: '/about' },
            { icon: 'shield-account-outline', title: '隐私政策', sub: '数据使用说明', route: '/privacy' },
          ].map((item, idx, arr) => (
            <Pressable
              key={item.title}
              style={[styles.listItem, idx < arr.length - 1 && styles.listItemBorder, (item as any).disabled && { opacity: 0.4 }]}
              onPress={() => {
                if ((item as any).disabled) return;
                if ((item as any).action) (item as any).action();
                else router.push((item as any).route);
              }}
            >
              <View style={styles.listIcon}>
                <MaterialCommunityIcons name={item.icon as any} size={20} color={palette.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listItemTitle}>{item.title}</Text>
                <Text style={styles.listItemSub}>{item.sub}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={palette.outline} />
            </Pressable>
          ))}
        </View>

        {/* ── 危险操作 ── */}
        <View style={styles.dangerCard}>
          <Pressable style={styles.dangerBtn} onPress={() => setClearOpen(true)}>
            <MaterialCommunityIcons name="delete-outline" size={18} color="#B3261E" />
            <Text style={styles.dangerText}>清除本机数据</Text>
          </Pressable>
        </View>

        {/* 版本号 */}
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Text style={{ fontSize: 12, color: palette.outline }}>Version info: 1.0.0</Text>
          <Text style={{ fontSize: 12, color: palette.outline }}>EF_VERSION: {EF_VERSION}</Text>
          <Text style={{ fontSize: 11, color: palette.outlineVariant, marginTop: 4 }}>
            Built with integrity for our shared future.
          </Text>
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={clearOpen} onDismiss={() => setClearOpen(false)}>
          <Dialog.Title>{S.deleteLocalTitle}</Dialog.Title>
          <Dialog.Content><Text>{S.deleteLocalConfirm}</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setClearOpen(false)}>取消</Button>
            <Button onPress={() => void wipeLocalOnly()}>确定</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(undefined)} duration={2400}>
        {snack ?? ''}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.surface },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: palette.surfaceVariant,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: palette.primary },
  bellBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: palette.surfaceLow,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  avatarInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: palette.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: palette.mintCard,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userName: { fontSize: 20, fontWeight: '700', color: palette.onSurface, marginBottom: 6 },
  levelTag: {
    backgroundColor: palette.mintCard,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 12,
  },
  levelTagText: { fontSize: 11, fontWeight: '700', color: palette.primary, letterSpacing: 0.5 },
  loginBtn: {
    backgroundColor: palette.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 8,
  },
  loginBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: palette.surfaceHigh,
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  statCard: { flex: 1, padding: 20 },
  statUpperLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.outline,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: palette.onSurface, letterSpacing: -0.5 },
  estimateTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  estimateText: { fontSize: 11, color: palette.estimate },
  statSubtitle: { fontSize: 12, color: palette.outline, marginTop: 4 },
  coinsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  coinsLabel: { fontSize: 12, color: palette.outline },
  coinsValue: { fontSize: 20, fontWeight: '800', color: palette.estimate, letterSpacing: -0.3 },
  goShopBtn: {
    backgroundColor: palette.estimate,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  goShopBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.outline,
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  listGroup: {
    marginHorizontal: 20,
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: palette.surfaceVariant,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  listItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: palette.surfaceVariant,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.mintLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemTitle: { fontSize: 15, fontWeight: '500', color: palette.onSurface },
  listItemSub: { fontSize: 12, color: palette.outline, marginTop: 1 },
  dangerCard: {
    marginHorizontal: 20,
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFDAD6',
    overflow: 'hidden',
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  dangerText: { fontSize: 15, fontWeight: '600', color: '#B3261E' },
});
