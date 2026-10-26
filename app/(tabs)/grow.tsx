import { palette } from '@/constants/colors';
import {
  buyAndEquipDecor,
  claimDailyCheckin,
  dailyTaskSnapshot,
  decorCatalog,
  deriveFarmPlots,
  deriveHomesteadDistricts,
  deriveHomesteadOpportunities,
  deriveHomesteadOverview,
  derivePlotStages,
  harvestFarmPlot,
  HOMESTEAD_XP_PER_LEVEL,
  homesteadCheckinStatus,
  interactWithHome,
  logsThisWeekMine,
  refreshHomesteadForToday,
  type HomesteadFarmPlot,
} from '@/features/homestead/service';
import { useAuth } from '@/lib/auth';
import { getHomesteadRow } from '@/lib/db';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Snackbar, Text } from 'react-native-paper';

const TOOLS = [
  { key: 'water', label: '浇水', icon: 'water-outline' },
  { key: 'clean', label: '打扫', icon: 'broom' },
  { key: 'harvest', label: '收获', icon: 'basket-outline' },
] as const;

function decorIcon(id: string) {
  switch (id) {
    case 'tree':
      return 'tree';
    case 'pv':
      return 'solar-panel';
    case 'bike_rack':
      return 'bicycle';
    case 'wind':
      return 'wind-turbine';
    case 'pond':
      return 'water-outline';
    case 'bench':
      return 'seat-outline';
    case 'hive':
      return 'bee';
    default:
      return 'home-heart';
  }
}

function stageColor(plot: HomesteadFarmPlot) {
  if (plot.ready) return '#E8B84B';
  if (plot.stage >= 2) return '#3C8B55';
  if (plot.stage === 1) return '#6FA66E';
  return '#9C8362';
}

export default function GrowScreen() {
  const { principalUserId } = useAuth();
  const [tick, setTick] = useState(0);
  const [selectedPlot, setSelectedPlot] = useState(0);
  const [tool, setTool] = useState<(typeof TOOLS)[number]['key']>('harvest');
  const [snack, setSnack] = useState<string | undefined>();

  const reload = useCallback(() => setTick((value) => value + 1), []);

  useFocusEffect(
    useCallback(() => {
      if (principalUserId) refreshHomesteadForToday(principalUserId);
      reload();
    }, [principalUserId, reload]),
  );

  const homestead = principalUserId ? getHomesteadRow(principalUserId) : null;
  const weekLogs = principalUserId ? logsThisWeekMine(principalUserId) : [];
  const plots = derivePlotStages(weekLogs);
  const farmPlots = principalUserId ? deriveFarmPlots(principalUserId, plots) : [];
  const currentPlot = farmPlots[selectedPlot] ?? farmPlots[0];
  const tasks = principalUserId ? dailyTaskSnapshot(principalUserId) : { log_once: false, read_article: false, like_post: false };
  const checkin = principalUserId ? homesteadCheckinStatus(principalUserId) : null;
  const overview = useMemo(() => deriveHomesteadOverview(homestead, weekLogs, plots), [homestead, tick]);
  const districts = useMemo(() => deriveHomesteadDistricts(homestead, overview, plots), [homestead, overview, tick]);
  const opportunities = useMemo(() => deriveHomesteadOpportunities(homestead, tasks, checkin, overview), [homestead, tasks, checkin, overview]);
  const decor = decorCatalog(homestead);
  const equippedId = homestead?.equipped_decor || 'tree';

  const level = homestead?.level ?? 1;
  const xp = homestead?.xp ?? 0;
  const coins = homestead?.carbon_coins ?? 0;
  const cleanliness = homestead?.cleanliness ?? 100;
  const happiness = homestead?.happiness ?? 100;
  const xpProgress = (xp % HOMESTEAD_XP_PER_LEVEL) / HOMESTEAD_XP_PER_LEVEL;
  const remainingClean = Math.max(0, 3 - (homestead?.clean_count ?? 0));
  const remainingWater = Math.max(0, 3 - (homestead?.water_count ?? 0));

  async function handleInteract(action: 'clean' | 'water') {
    if (!principalUserId) return;
    const res = interactWithHome(principalUserId, action);
    if (!res.success) {
      setSnack(res.msg);
      return;
    }
    reload();
    setSnack(`${res.msg} +${res.gainedXp} XP / +${res.gainedCoins} 碳币`);
  }

  async function handleHarvest(plot: HomesteadFarmPlot) {
    if (!principalUserId) return;
    const res = harvestFarmPlot(principalUserId, plot);
    if (!res.success) {
      setSnack(res.msg);
      return;
    }
    reload();
    setSnack(`${res.msg} +${res.gainedXp} XP`);
  }

  async function handlePlotPress(plot: HomesteadFarmPlot) {
    setSelectedPlot(plot.index);
    if (tool === 'harvest') {
      await handleHarvest(plot);
      return;
    }
    if (tool === 'water') {
      await handleInteract('water');
      return;
    }
    await handleInteract('clean');
  }

  async function handleCheckin() {
    if (!principalUserId) return;
    const res = claimDailyCheckin(principalUserId);
    setSnack(res.already ? '今日巡园已经完成啦' : `巡园完成，获得 ${res.gained} XP，连签 ${res.streak} 天`);
    reload();
  }

  async function handleEquip(decorId: string) {
    if (!principalUserId) return;
    const res = buyAndEquipDecor(principalUserId, decorId);
    if (!res.success) {
      setSnack(res.msg || '操作失败');
      return;
    }
    reload();
    setSnack('设施已部署到家园场景');
  }

  if (!principalUserId) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={palette.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.topHud}>
          <View>
            <Text style={styles.title}>低碳家园农场</Text>
            <Text style={styles.subtitle}>点击地块，浇水、打扫、收获，让绿色行动长成作物。</Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>Lv.{level}</Text>
          </View>
        </View>

        <View style={styles.resourceRow}>
          <View style={styles.resourcePill}>
            <MaterialCommunityIcons name="leaf-circle-outline" size={18} color="#A26325" />
            <Text style={styles.resourceText}>{coins} 碳币</Text>
          </View>
          <View style={styles.resourcePill}>
            <MaterialCommunityIcons name="star-four-points-outline" size={18} color={palette.primary} />
            <Text style={styles.resourceText}>繁荣 {overview.ecoProsperity}</Text>
          </View>
          <View style={styles.resourcePill}>
            <MaterialCommunityIcons name="heart-outline" size={18} color="#B25D55" />
            <Text style={styles.resourceText}>幸福 {happiness}</Text>
          </View>
        </View>

        <LinearGradient
          colors={['#BCE6EC', '#EAF7E5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gameScene}
        >
          <View style={styles.sun} />
          <View style={styles.cloudOne} />
          <View style={styles.cloudTwo} />
          <View style={styles.mountainBack} />
          <View style={styles.fieldBase} />

          <View style={styles.decorLayer}>
            {decor.filter((item) => item.unlocked).slice(0, 5).map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.sceneDecor,
                  { left: 20 + index * 58, top: index % 2 === 0 ? 58 : 92 },
                  equippedId === item.id && styles.sceneDecorActive,
                ]}
              >
                <MaterialCommunityIcons name={decorIcon(item.id) as any} size={22} color={palette.primary} />
              </View>
            ))}
          </View>

          <View style={styles.plotBoard}>
            {farmPlots.map((plot) => (
              <Pressable
                key={plot.id}
                onPress={() => void handlePlotPress(plot)}
                style={[
                  styles.farmPlot,
                  selectedPlot === plot.index && styles.farmPlotSelected,
                  plot.ready && styles.farmPlotReady,
                ]}
              >
                <View style={styles.soilRows}>
                  <View style={styles.soilLine} />
                  <View style={styles.soilLine} />
                  <View style={styles.soilLine} />
                </View>
                <View style={[styles.cropBubble, { backgroundColor: stageColor(plot) }]}>
                  <MaterialCommunityIcons name={plot.icon as any} size={30} color="#FFFFFF" />
                </View>
                {plot.ready ? (
                  <View style={styles.readyFlag}>
                    <Text style={styles.readyFlagText}>可收</Text>
                  </View>
                ) : null}
                <Text style={styles.plotName}>{plot.name}</Text>
                <Text style={styles.plotStage}>{plot.stageLabel}</Text>
                <View style={styles.plotProgressTrack}>
                  <View style={[styles.plotProgressFill, { width: `${plot.progress}%` }]} />
                </View>
              </Pressable>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.toolDock}>
          {TOOLS.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.toolButton, tool === item.key && styles.toolButtonActive]}
              onPress={() => setTool(item.key)}
            >
              <MaterialCommunityIcons name={item.icon as any} size={21} color={tool === item.key ? '#FFFFFF' : palette.primary} />
              <Text style={[styles.toolButtonText, tool === item.key && styles.toolButtonTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {currentPlot ? (
          <View style={styles.actionPanel}>
            <View style={{ flex: 1 }}>
              <Text style={styles.panelTitle}>{currentPlot.crop}</Text>
              <Text style={styles.panelSub}>
                {currentPlot.ready
                  ? `成熟啦，收获可得 ${currentPlot.rewardCoins} 碳币和 ${currentPlot.rewardXp} XP`
                  : currentPlot.harvestedToday
                    ? '今天已经收获过，明天继续回来看看。'
                    : '完成低碳记录、浇水和维护，会让这块地更快进入成熟状态。'}
              </Text>
            </View>
            <Pressable
              style={[styles.harvestButton, !currentPlot.ready && styles.harvestButtonMuted]}
              onPress={() => void handleHarvest(currentPlot)}
            >
              <Text style={[styles.harvestButtonText, !currentPlot.ready && styles.harvestButtonTextMuted]}>
                {currentPlot.ready ? '收获' : '未成熟'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.xpPanel}>
          <View style={styles.xpHead}>
            <Text style={styles.xpText}>升级进度</Text>
            <Text style={styles.xpText}>{xp % HOMESTEAD_XP_PER_LEVEL}/{HOMESTEAD_XP_PER_LEVEL} XP</Text>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${Math.max(6, Math.round(xpProgress * 100))}%` }]} />
          </View>
        </View>

        <View style={styles.quickActions}>
          <Pressable style={styles.quickButton} onPress={() => void handleInteract('water')}>
            <MaterialCommunityIcons name="water-outline" size={22} color={palette.primary} />
            <Text style={styles.quickTitle}>浇水</Text>
            <Text style={styles.quickMeta}>剩余 {remainingWater}/3</Text>
          </Pressable>
          <Pressable style={styles.quickButton} onPress={() => void handleInteract('clean')}>
            <MaterialCommunityIcons name="broom" size={22} color={palette.primary} />
            <Text style={styles.quickTitle}>打扫</Text>
            <Text style={styles.quickMeta}>剩余 {remainingClean}/3</Text>
          </Pressable>
          <Pressable style={styles.quickButton} onPress={handleCheckin}>
            <MaterialCommunityIcons name="calendar-check-outline" size={22} color={palette.primary} />
            <Text style={styles.quickTitle}>{checkin?.checkedInToday ? '已巡园' : '巡园'}</Text>
            <Text style={styles.quickMeta}>连签 {checkin?.streak ?? 0}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>今日订单</Text>
            <Pressable onPress={() => router.push('/log')}>
              <Text style={styles.sectionLink}>去记录</Text>
            </Pressable>
          </View>
          {opportunities.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.orderRow}>
              <MaterialCommunityIcons
                name={item.status === 'ready' ? 'checkbox-blank-circle-outline' : 'check-circle-outline'}
                size={20}
                color={item.status === 'ready' ? '#A26325' : palette.primary}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.orderTitle}>{item.title}</Text>
                <Text style={styles.orderSub}>{item.reward}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>设施商店</Text>
            <Text style={styles.sectionMuted}>已建 {decor.filter((item) => item.unlocked).length}/{decor.length}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shopRail}>
            {decor.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.shopCard, item.unlocked && styles.shopCardOwned, equippedId === item.id && styles.shopCardEquipped]}
                onPress={() => void handleEquip(item.id)}
              >
                <MaterialCommunityIcons name={decorIcon(item.id) as any} size={28} color={equippedId === item.id ? '#FFFFFF' : palette.primary} />
                <Text style={[styles.shopTitle, equippedId === item.id && styles.shopTitleActive]}>{item.label}</Text>
                <Text style={[styles.shopPrice, equippedId === item.id && styles.shopPriceActive]}>
                  {item.unlocked ? (equippedId === item.id ? '展示中' : '已拥有') : `${item.price} 碳币`}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>生态分区</Text>
          {districts.map((district) => (
            <View key={district.id} style={styles.districtRow}>
              <View style={[styles.districtIcon, { backgroundColor: district.theme }]}>
                <MaterialCommunityIcons name={(district.icon === 'solar-power' ? 'solar-panel' : district.icon) as any} size={20} color={district.unlocked ? palette.primary : palette.outline} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.districtTitle}>{district.title} Lv.{district.level}</Text>
                <Text style={styles.districtMeta}>{district.yieldLabel} · {district.capacity}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable style={styles.bottomPrimary} onPress={() => router.push('/log')}>
          <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.bottomPrimaryText}>记录低碳行为，给农场补能</Text>
        </Pressable>
      </View>

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(undefined)} duration={2400} style={{ backgroundColor: palette.primaryContainer }}>
        <Text style={{ color: '#FFFFFF' }}>{snack ?? ''}</Text>
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F0E6' },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingTop: 48, paddingHorizontal: 16, paddingBottom: 126 },
  topHud: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  title: { color: palette.primary, fontSize: 25, fontWeight: '900' },
  subtitle: { color: palette.outline, lineHeight: 19, marginTop: 4, maxWidth: 260, fontSize: 12 },
  levelBadge: { backgroundColor: palette.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  levelBadgeText: { color: '#FFFFFF', fontWeight: '900' },
  resourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  resourcePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFDF8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E5DCCB' },
  resourceText: { color: palette.onSurface, fontWeight: '800', fontSize: 12 },
  gameScene: { height: 390, borderRadius: 28, overflow: 'hidden', position: 'relative', marginBottom: 12, borderWidth: 1, borderColor: '#CFE1CB' },
  sun: { position: 'absolute', right: 28, top: 24, width: 68, height: 68, borderRadius: 34, backgroundColor: '#FFE28A' },
  cloudOne: { position: 'absolute', left: 26, top: 34, width: 86, height: 22, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.88)' },
  cloudTwo: { position: 'absolute', left: 88, top: 62, width: 52, height: 16, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.72)' },
  mountainBack: { position: 'absolute', left: -40, right: -40, bottom: 156, height: 112, borderTopLeftRadius: 130, borderTopRightRadius: 130, backgroundColor: '#8FC8A6' },
  fieldBase: { position: 'absolute', left: -20, right: -20, bottom: -18, height: 250, borderTopLeftRadius: 90, borderTopRightRadius: 90, backgroundColor: '#6D995E' },
  decorLayer: { ...StyleSheet.absoluteFillObject },
  sceneDecor: { position: 'absolute', width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.86)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(19,66,52,0.16)' },
  sceneDecorActive: { backgroundColor: '#DFF3D4', borderColor: palette.primary },
  plotBoard: { position: 'absolute', left: 14, right: 14, bottom: 20, flexDirection: 'row', gap: 10 },
  farmPlot: { flex: 1, minHeight: 178, borderRadius: 22, padding: 10, alignItems: 'center', backgroundColor: '#8A5D34', borderWidth: 3, borderColor: '#72472A', overflow: 'hidden' },
  farmPlotSelected: { borderColor: '#FFE28A' },
  farmPlotReady: { shadowColor: '#E8B84B', shadowOpacity: 0.4, shadowRadius: 10, elevation: 4 },
  soilRows: { ...StyleSheet.absoluteFillObject, opacity: 0.25, paddingTop: 24, gap: 26 },
  soilLine: { height: 8, backgroundColor: '#C08A52', transform: [{ rotate: '-8deg' }] },
  cropBubble: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginTop: 14, borderWidth: 3, borderColor: 'rgba(255,255,255,0.55)' },
  readyFlag: { position: 'absolute', top: 8, right: 8, backgroundColor: '#FFE28A', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  readyFlagText: { color: '#694719', fontSize: 11, fontWeight: '900' },
  plotName: { color: '#FFFFFF', fontWeight: '900', fontSize: 13, marginTop: 10, textAlign: 'center' },
  plotStage: { color: 'rgba(255,255,255,0.86)', fontSize: 11, marginTop: 4 },
  plotProgressTrack: { width: '100%', height: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 10, overflow: 'hidden' },
  plotProgressFill: { height: '100%', borderRadius: 999, backgroundColor: '#DDF4A6' },
  toolDock: { flexDirection: 'row', gap: 8, backgroundColor: '#FFFDF8', borderRadius: 22, padding: 8, borderWidth: 1, borderColor: '#E5DCCB', marginBottom: 12 },
  toolButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 16, paddingVertical: 12, backgroundColor: '#EEF5F0' },
  toolButtonActive: { backgroundColor: palette.primary },
  toolButtonText: { color: palette.primary, fontWeight: '800', fontSize: 13 },
  toolButtonTextActive: { color: '#FFFFFF' },
  actionPanel: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFDF8', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#E5DCCB', marginBottom: 12 },
  panelTitle: { color: palette.onSurface, fontWeight: '900', fontSize: 17 },
  panelSub: { color: palette.outline, lineHeight: 18, fontSize: 12, marginTop: 4 },
  harvestButton: { backgroundColor: '#E8B84B', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 13 },
  harvestButtonMuted: { backgroundColor: '#E8E0D1' },
  harvestButtonText: { color: '#553713', fontWeight: '900' },
  harvestButtonTextMuted: { color: palette.outline },
  xpPanel: { backgroundColor: '#FFFDF8', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#E5DCCB', marginBottom: 12 },
  xpHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  xpText: { color: palette.outline, fontSize: 12, fontWeight: '700' },
  xpTrack: { height: 9, borderRadius: 999, backgroundColor: '#E8E0D1', overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: palette.primary },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  quickButton: { flex: 1, alignItems: 'center', backgroundColor: '#FFFDF8', borderRadius: 18, paddingVertical: 14, borderWidth: 1, borderColor: '#E5DCCB' },
  quickTitle: { color: palette.primary, fontWeight: '900', marginTop: 6 },
  quickMeta: { color: palette.outline, fontSize: 11, marginTop: 3 },
  section: { backgroundColor: '#FFFDF8', borderRadius: 22, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5DCCB' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: palette.onSurface, fontWeight: '900', fontSize: 18 },
  sectionLink: { color: palette.primary, fontWeight: '800' },
  sectionMuted: { color: palette.outline, fontSize: 12, fontWeight: '700' },
  orderRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F0E8DC' },
  orderTitle: { color: palette.onSurface, fontWeight: '800' },
  orderSub: { color: palette.outline, fontSize: 12, marginTop: 2 },
  shopRail: { gap: 10, paddingRight: 6 },
  shopCard: { width: 112, borderRadius: 18, padding: 12, backgroundColor: '#F6F0E6', borderWidth: 1, borderColor: '#E1D5C4', gap: 8 },
  shopCardOwned: { backgroundColor: '#EDF7F0', borderColor: '#CFE6D5' },
  shopCardEquipped: { backgroundColor: palette.primary, borderColor: palette.primary },
  shopTitle: { color: palette.onSurface, fontWeight: '900', fontSize: 13 },
  shopTitleActive: { color: '#FFFFFF' },
  shopPrice: { color: '#A26325', fontSize: 11, fontWeight: '800' },
  shopPriceActive: { color: 'rgba(255,255,255,0.86)' },
  districtRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F0E8DC' },
  districtIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  districtTitle: { color: palette.onSurface, fontWeight: '900' },
  districtMeta: { color: palette.outline, fontSize: 12, marginTop: 2 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28, backgroundColor: 'rgba(243,240,230,0.96)', borderTopWidth: 1, borderTopColor: '#E5DCCB' },
  bottomPrimary: { backgroundColor: palette.primary, borderRadius: 24, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  bottomPrimaryText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
});
