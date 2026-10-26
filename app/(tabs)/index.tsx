import { EF_VERSION } from '@/constants/carbon';
import { palette } from '@/constants/colors';
import { PUBLIC_OFFLINE_DEMO } from '@/lib/publicDemo';
import { IlloDashboard } from '@/illustrations/CarbonScenes';
import { S } from '@/constants/strings';
import { ScreenBody } from '@/components/ScreenBody';
import { PixabayImage } from '@/components/PixabayImage';
import { SCENE_QUERIES, getArticleQuery } from '@/features/images/pixabay';
import { fetchEnvironmentSnapshot, type EnvironmentSnapshot } from '@/features/environment/service';
import { describeLogLine } from '@/lib/export';
import { useAuth } from '@/lib/auth';
import { listLogs } from '@/lib/db';
import type { StoredLog } from '@/features/log/types';
import {
  last7DaysIncludedSeries,
  sumIncludedAvoidedToday,
  sumIncludedAvoided,
  weekInterval,
} from '@/lib/stats';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { ActivityIndicator, Text, Chip } from 'react-native-paper';

// 活动图标映射
const TYPE_ICON: Record<string, string> = {
  transit: 'train-car',
  bike: 'bicycle',
  walk: 'walk',
  ev: 'car-electric',
  food: 'food-apple',
  mug: 'cup',
  electricity: 'lightning-bolt',
  ac: 'air-conditioner',
  recycle: 'recycle',
  virtue: 'heart',
};

// 行为类型 → Pixabay 搜索词映射
const TYPE_QUERY: Record<string, string> = {
  transit: 'public transport bus commute',
  transport_bus: 'public transport bus commute',
  transport_metro: 'metro subway commute',
  bike: 'bicycle cycling green commute',
  walk: 'walking pedestrian street',
  ev: 'electric vehicle car charging',
  food: 'vegetarian healthy food plant',
  food_save: 'food plate meal no waste',
  mug: 'reusable cup coffee eco',
  electricity: 'electricity energy saving light',
  standby_off: 'power plug energy saving',
  ac: 'air conditioner energy cool',
  ac_habit: 'air conditioner green energy',
  recycle: 'recycling plastic bottle sorting',
  virtue: 'volunteer helping community green',
};

function getIcon(log: StoredLog): string {
  return TYPE_ICON[log.type as string] ?? 'leaf';
}

function getActivityQuery(behaviorType: string): string {
  return TYPE_QUERY[behaviorType] ?? 'nature ecology green lifestyle';
}

export default function HomeScreen() {
  const { principalUserId, initializing, session } = useAuth();
  const [logs, setLogs] = useState<StoredLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [environment, setEnvironment] = useState<EnvironmentSnapshot | null>(null);
  const [environmentLoading, setEnvironmentLoading] = useState(false);
  const { width } = useWindowDimensions();

  const mine = useMemo(
    () => logs.filter((l) => l.user_id === principalUserId),
    [logs, principalUserId],
  );

  const load = useCallback(() => {
    setLogs(listLogs(600));
  }, []);

  const loadEnvironment = useCallback(async () => {
    setEnvironmentLoading(true);
    try {
      setEnvironment(await fetchEnvironmentSnapshot('大连'));
    } finally {
      setEnvironmentLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      void loadEnvironment();
    }, [load, loadEnvironment]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      load();
      await loadEnvironment();
    } finally { setRefreshing(false); }
  }, [load, loadEnvironment]);

  const { start: weekStart, end: weekEnd } = weekInterval();
  const weekSum = sumIncludedAvoided(mine, weekStart, weekEnd);
  const todaySum = sumIncludedAvoidedToday(mine);
  const series = last7DaysIncludedSeries(mine);
  const maxBar = Math.max(...series.map((s) => s.value), 0.0001);
  const treeEquiv = Math.max(0, parseFloat((weekSum / 11.85).toFixed(2)));
  const recent = mine.slice(0, 8);

  if (initializing || !principalUserId) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={palette.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 顶部 Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarCircle}>
              <MaterialCommunityIcons name="account" size={20} color={palette.heroOnMuted} />
            </View>
            <View>
              <Text style={styles.headerGreeting}>
                Hi, 碳友 ~ CarbonPie
              </Text>
            </View>
          </View>
          <Pressable style={styles.bellBtn} accessibilityLabel="通知">
            <MaterialCommunityIcons name="bell-outline" size={22} color={palette.onSurface} />
          </Pressable>
        </View>

        <View style={styles.content}>
          {/* ── 每日低碳灵感 ── */}
          <View style={styles.dailyInspiration}>
            {PUBLIC_OFFLINE_DEMO ? <IlloDashboard style={StyleSheet.absoluteFillObject} /> : <PixabayImage
              query={SCENE_QUERIES.home_hero}
              index={new Date().getDate() % 10}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
              borderRadius={20}
              accessibilityLabel="每日环保灵感图"
            />}
            <View style={styles.featuredOverlay} />
            <View style={styles.inspirationContent}>
              <Text style={styles.inspirationLabel}>每日灵感</Text>
              <Text style={styles.inspirationText}>
                "保护环境，从每一件小事做起。"
              </Text>
            </View>
          </View>

          {/* ── 本周减碳 KPI 卡 ── */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>本周约减碳</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
              <Text style={styles.kpiEstimateSymbol}>~</Text>
              <Text style={styles.kpiNumber}>{weekSum}</Text>
              <Text style={styles.kpiUnit}> kg CO2e</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="leaf" size={16} color={palette.estimate} />
              <Text style={styles.kpiSubText}>
                已减少相当于{' '}
                <Text style={{ color: palette.estimate, fontWeight: '600' }}>~{treeEquiv}</Text>
                {' '}棵树一年的吸收量
              </Text>
            </View>
          </View>

          {/* ── 今日数据小chips ── */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <View style={styles.statChip}>
              <Text style={styles.statChipLabel}>今日约减碳</Text>
              <Text style={styles.statChipValue}>~{todaySum} kg</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statChipLabel}>因子版本</Text>
              <Text style={styles.statChipValue}>{EF_VERSION}</Text>
            </View>
          </View>

          {/* ── 城市环境雷达 ── */}
          <View style={styles.environmentCard}>
            <View style={styles.environmentHeader}>
              <View>
                <Text style={styles.environmentKicker}>城市环境雷达</Text>
                <Text style={styles.environmentTitle}>
                  {environment?.location.name ?? '大连'} 今日低碳建议
                </Text>
              </View>
              <View style={styles.environmentIcon}>
                <MaterialCommunityIcons name="weather-partly-cloudy" size={24} color="#FFFFFF" />
              </View>
            </View>
            {environmentLoading && !environment ? (
              <View style={styles.environmentLoading}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.environmentLoadingText}>正在读取天气与空气质量...</Text>
              </View>
            ) : (
              <>
                <View style={styles.environmentStats}>
                  <View style={styles.environmentStat}>
                    <Text style={styles.environmentStatLabel}>气温</Text>
                    <Text style={styles.environmentStatValue}>
                      {environment?.weather.temperature ?? '--'}°C
                    </Text>
                  </View>
                  <View style={styles.environmentStat}>
                    <Text style={styles.environmentStatLabel}>AQI</Text>
                    <Text style={styles.environmentStatValue}>
                      {environment?.air.aqi ?? '--'}
                    </Text>
                  </View>
                  <View style={styles.environmentStat}>
                    <Text style={styles.environmentStatLabel}>PM2.5</Text>
                    <Text style={styles.environmentStatValue}>
                      {environment?.air.pm25 ?? '--'}
                    </Text>
                  </View>
                </View>
                <View style={styles.environmentMetaRow}>
                  <Text style={styles.environmentSource}>{environment?.locationLabel}</Text>
                  <Pressable style={styles.environmentRefreshBtn} onPress={() => void loadEnvironment()}>
                    <MaterialCommunityIcons name="crosshairs-gps" size={14} color="#FFFFFF" />
                    <Text style={styles.environmentRefreshText}>
                      {PUBLIC_OFFLINE_DEMO ? '离线模式' : environment?.permissionGranted ? '重新定位' : '授权定位'}
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.environmentTips}>
                  {(environment?.tips ?? ['天气与空气质量数据接入后，会自动给出今日低碳出行和节能建议。']).map((tip) => (
                    <View key={tip} style={styles.environmentTipRow}>
                      <MaterialCommunityIcons name="leaf-circle" size={16} color="#CFF5DF" />
                      <Text style={styles.environmentTipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
                {environment?.openAq ? (
                  <Text style={styles.environmentSource}>
                    全球空气站点：{environment.openAq.stationName}
                    {environment.openAq.provider ? ` · ${environment.openAq.provider}` : ''}
                  </Text>
                ) : (
                  <Text style={styles.environmentSource}>{PUBLIC_OFFLINE_DEMO ? '数据源：未连接（公开离线演示）' : '数据源：Open-Meteo / OpenAQ / OpenStreetMap'}</Text>
                )}
              </>
            )}
          </View>

          {/* ── 记一笔 CTA 按钮 ── */}
          <Pressable
            style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaPressed]}
            onPress={() => router.push('/log')}
            accessibilityLabel="记录低碳行为"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            <Text style={styles.ctaText}>记一笔</Text>
          </Pressable>

          {/* ── 7日趋势小图 ── */}
          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>7日减碳趋势</Text>
            <View style={styles.chartRow} accessibilityLabel="7日减碳柱状示意">
              {series.map((d) => {
                const h = Math.max(8, Math.round((d.value / maxBar) * 80));
                const isToday = d.label === series[series.length - 1].label;
                return (
                  <View key={d.label} style={{ alignItems: 'center', flex: 1 }}>
                    <View
                      style={{
                        width: 10,
                        height: h,
                        backgroundColor: isToday ? palette.primary : palette.mintCard,
                        borderRadius: 5,
                      }}
                    />
                    <Text style={styles.chartLabel}>{d.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── 最近记录 ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>最近记录</Text>
            <Pressable onPress={() => router.push('/log')} accessibilityLabel="查看全部记录">
              <Text style={styles.seeAll}>查看全部</Text>
            </Pressable>
          </View>

          {recent.length === 0 ? (
            <View style={styles.emptyCard}>
              <PixabayImage
                query={SCENE_QUERIES.home_hero}
                style={{ width: '100%', height: 160 }}
                resizeMode="cover"
                accessibilityLabel="低碳生活环保图片"
              />
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: palette.outline, textAlign: 'center', fontSize: 15, fontWeight: '500' }}>
                  还没有记录{'\n'}从轻量的一步开始吧 🌱
                </Text>
                <Pressable
                  style={[styles.ctaButton, { marginTop: 16, paddingHorizontal: 32, alignSelf: 'center' }]}
                  onPress={() => router.push('/log')}
                >
                  <Text style={styles.ctaText}>去记录</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.recordList}>
              {recent.map((log, idx) => (
                <View key={log.client_id}>
                  <View style={styles.recordItem}>
                    <PixabayImage
                      query={getActivityQuery(log.type as string)}
                      style={{ width: 44, height: 44 }}
                      borderRadius={12}
                      resizeMode="cover"
                      fallbackIcon={getIcon(log)}
                      fallbackColor={palette.mintLight}
                      accessibilityLabel={describeLogLine(log)}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recordTitle} numberOfLines={1}>
                        {describeLogLine(log)}
                      </Text>
                      <Text style={styles.recordTime}>
                        {new Date(log.created_at).toLocaleString('zh-CN', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    {log.avoided_kg_co2e > 0 && log.included_in_summary ? (
                      <Text style={styles.recordValue}>
                        ~{log.avoided_kg_co2e.toFixed(2)} kg
                      </Text>
                    ) : null}
                  </View>
                  {idx < recent.length - 1 && <View style={styles.recordDivider} />}
                </View>
              ))}
            </View>
          )}

          {/* ── 底部家园引导小卡 ── */}
          <Pressable
            style={styles.gardenCard}
            onPress={() => router.push('/grow')}
            accessibilityLabel="前往家园"
            accessibilityRole="button"
          >
            <PixabayImage
              query={SCENE_QUERIES.home_garden}
              style={{ width: '100%', height: 140 }}
              borderRadius={16}
              resizeMode="cover"
              accessibilityLabel="低碳家园景观图"
            />
            <View style={styles.gardenCardOverlay}>
              <MaterialCommunityIcons name="sprout" size={22} color="rgba(255,255,255,0.9)" />
              <Text style={styles.gardenTextOverlay}>做地球的好朋友</Text>
            </View>
          </Pressable>

          {/* ── AI 快速入口 ── */}
          <Pressable
            style={styles.aiEntryCard}
            onPress={() => router.push('/ai')}
            accessibilityLabel="打开AI智能问答"
          >
            <MaterialCommunityIcons name="robot-outline" size={24} color={palette.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontWeight: '600', color: palette.onSurface }}>碳派 AI 助手</Text>
              <Text style={{ fontSize: 12, color: palette.outline, marginTop: 2 }}>问我任何低碳生活的问题 →</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={palette.outline} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: palette.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: palette.surfaceVariant,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGreeting: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.primary,
    letterSpacing: -0.3,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.surfaceLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  kpiCard: {
    backgroundColor: palette.surfaceHigh,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  kpiLabel: {
    fontSize: 13,
    color: palette.onSurfaceVariant,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiEstimateSymbol: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.estimate,
  },
  kpiNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: palette.onSurface,
    lineHeight: 56,
    letterSpacing: -1,
  },
  kpiUnit: {
    fontSize: 18,
    color: palette.onSurfaceVariant,
    fontWeight: '500',
    paddingBottom: 4,
  },
  kpiDivider: {
    height: 1,
    backgroundColor: palette.outlineVariant,
    marginVertical: 12,
  },
  kpiSubText: {
    fontSize: 13,
    color: palette.onSurfaceVariant,
    flex: 1,
  },
  statChip: {
    backgroundColor: palette.surfaceContainer,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statChipLabel: {
    fontSize: 11,
    color: palette.outline,
    fontWeight: '500',
  },
  statChipValue: {
    fontSize: 12,
    color: palette.primary,
    fontWeight: '600',
  },
  environmentCard: {
    backgroundColor: '#113D34',
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    overflow: 'hidden',
  },
  environmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  environmentKicker: {
    color: '#AEE7CE',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  environmentTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  environmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  environmentLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  environmentLoadingText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
  },
  environmentStats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  environmentMetaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  environmentStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 12,
  },
  environmentStatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '800',
  },
  environmentStatValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  environmentTips: {
    gap: 8,
    marginTop: 14,
  },
  environmentTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  environmentTipText: {
    flex: 1,
    color: 'rgba(255,255,255,0.84)',
    fontSize: 12,
    lineHeight: 19,
  },
  environmentRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  environmentRefreshText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  environmentSource: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 11,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 20,
    gap: 8,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  chartCard: {
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: palette.surfaceVariant,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    marginTop: 12,
    gap: 4,
  },
  chartLabel: {
    marginTop: 6,
    fontSize: 10,
    color: palette.outline,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.onSurface,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 13,
    color: palette.outline,
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.surfaceVariant,
    marginBottom: 20,
  },
  dailyInspiration: {
    height: 120,
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  inspirationContent: {
    zIndex: 1,
  },
  inspirationLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inspirationText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  recordList: {
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.surfaceVariant,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  recordIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: palette.mintLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: palette.onSurface,
  },
  recordTime: {
    fontSize: 12,
    color: palette.outline,
    marginTop: 2,
  },
  recordValue: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.estimate,
  },
  recordDivider: {
    height: 1,
    backgroundColor: palette.surfaceVariant,
    marginLeft: 72,
  },
  gardenCard: {
    backgroundColor: palette.gardenWarm,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.surfaceVariant,
  },
  gardenCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  gardenTextOverlay: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  gardenText: {
    marginTop: 8,
    fontSize: 13,
    color: palette.outline,
    letterSpacing: 0.5,
  },
  aiEntryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.mintLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
});
