import { EF_VERSION } from '@/constants/carbon';
import { palette } from '@/constants/colors';
import { S } from '@/constants/strings';
import { ScreenBody } from '@/components/ScreenBody';
import { ORDERED_BEHAVIORS } from '@/features/log/catalog';
import { clearPendingPhotoDraft, getPendingPhotoDraft } from '@/features/log/photoDraft';
import { calculateAvoided, type AvoidResult } from '@/features/log/calculateAvoided';
import type { BehaviorType, LogPayload, PendingPhotoDraft } from '@/features/log/types';
import type { FoodLevel } from '@/features/log/types';
import type { StandbyPreset } from '@/features/log/types';
import { computeTodayUsageBeforeInsert } from '@/features/log/usageToday';
import { markDailyTask, rewardAfterLogSaved } from '@/features/homestead/service';
import { useAuth } from '@/lib/auth';
import { insertLog, insertLogPhoto, listLogs } from '@/lib/db';
import { syncAllForUser } from '@/lib/sync';
import { supabaseConfigured } from '@/lib/supabase';
import { behaviorTitle } from '@/lib/stats';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import {
  Button,
  Card,
  Chip,
  HelperText,
  List,
  SegmentedButtons,
  Snackbar,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';

const VALID_TYPES = new Set<BehaviorType>(
  ORDERED_BEHAVIORS.map((b) => b.type),
);

export default function LogDetailScreen() {
  const params = useLocalSearchParams<{ type: string; fromPhoto?: string }>();
  const type = params.type as BehaviorType;
  const { principalUserId, session } = useAuth();

  const [snack, setSnack] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [photoDraft, setPhotoDraft] = useState<PendingPhotoDraft | null>(null);

  const [km, setKm] = useState('5');
  const [roundTrip, setRoundTrip] = useState(false);

  const [foodLevel, setFoodLevel] = useState<FoodLevel>('normal');

  const [standbyPreset, setStandbyPreset] = useState<StandbyPreset>('router');
  const [standbyHours, setStandbyHours] = useState('8');
  const [customWatts, setCustomWatts] = useState('10');

  const [acVariant, setAcVariant] = useState<'setpoint' | 'off_once'>(
    'setpoint',
  );

  const [virtueNote, setVirtueNote] = useState('');
  const [mugNote, setMugNote] = useState('');

  useEffect(() => {
    if (!VALID_TYPES.has(type)) {
      router.back();
    }
  }, [type]);

  useEffect(() => {
    let cancelled = false;
    if (params.fromPhoto !== '1') {
      setPhotoDraft(null);
      return;
    }
    getPendingPhotoDraft().then((draft) => {
      if (cancelled) return;
      setPhotoDraft(draft);
      if (!draft) return;
      if (type === 'virtue' && !virtueNote.trim()) {
        setVirtueNote(draft.ai.summary);
      }
      if (type === 'mug' && !mugNote.trim()) {
        setMugNote(draft.ai.summary);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [params.fromPhoto, type]);

  const title = useMemo(() => behaviorTitle(type), [type]);

  function buildPayload(): LogPayload | null {
    switch (type) {
      case 'transport_bus':
      case 'transport_metro':
      case 'bike':
      case 'walk':
        return {
          mode: 'transport',
          km: Number(km),
          roundTrip,
        };
      case 'food_save':
        return { mode: 'food', level: foodLevel };
      case 'standby_off':
        return {
          mode: 'standby',
          preset: standbyPreset,
          hours: Number(standbyHours),
          watts:
            standbyPreset === 'custom'
              ? Number(customWatts)
              : undefined,
        };
      case 'ac_habit':
        return { mode: 'ac', variant: acVariant };
      case 'virtue':
        return { mode: 'virtue', note: virtueNote.trim() };
      case 'mug':
        return { mode: 'mug', note: mugNote.trim() || undefined };
      default:
        return null;
    }
  }

  async function handleSave() {
    if (!principalUserId) {
      setSnack(S.saveFailed);
      return;
    }

    const payload = buildPayload();
    if (!payload) {
      setSnack(S.saveFailed);
      return;
    }

    if (
      type === 'transport_bus' ||
      type === 'transport_metro' ||
      type === 'bike' ||
      type === 'walk'
    ) {
      const v = Number(km);
      if (!Number.isFinite(v) || v <= 0) {
        setSnack('请输入合理的里程（km）。');
        return;
      }
    }

    if (type === 'standby_off') {
      const h = Number(standbyHours);
      if (!Number.isFinite(h) || h <= 0 || h > 24) {
        setSnack('请输入合理的断电时长（建议 0–24 小时）。');
        return;
      }
      if (standbyPreset === 'custom') {
        const w = Number(customWatts);
        if (!Number.isFinite(w) || w < 1 || w > 50) {
          setSnack('自定义功率需在 1–50 W。');
          return;
        }
      }
    }

    if (type === 'virtue') {
      if (virtueNote.trim().length < 2) {
        setSnack('请简单描述这件好人好事（至少 2 个字）。');
        return;
      }
    }

    try {
      setSaving(true);
      const logs = listLogs(600).filter((l) => l.user_id === principalUserId);
      const usage = computeTodayUsageBeforeInsert(logs);
      const result = calculateAvoided(type, payload, usage);

      const id = Crypto.randomUUID();
      insertLog({
        id,
        user_id: principalUserId,
        type,
        payload,
        avoided_kg_co2e: result.avoidedKg,
        included_in_summary: result.includedInSummary ? 1 : 0,
        ef_version: EF_VERSION,
        client_id: id,
        created_at: new Date().toISOString(),
        synced: 0,
      });

      if (photoDraft) {
        insertLogPhoto({
          id: Crypto.randomUUID(),
          log_client_id: id,
          user_id: principalUserId,
          uri: photoDraft.uri,
          source: photoDraft.source,
          storage_path: null,
          ai_category: photoDraft.ai.category,
          ai_title: photoDraft.ai.title,
          ai_summary: photoDraft.ai.summary,
          ai_encouragement: photoDraft.ai.encouragement,
          ai_confidence: photoDraft.ai.confidence,
          ai_tags: photoDraft.ai.tags,
          created_at: new Date().toISOString(),
          synced: 0,
        });
        await clearPendingPhotoDraft();
      }

      rewardAfterLogSaved(principalUserId, {
        avoidedKg: result.avoidedKg,
        includedInSummary: Boolean(result.includedInSummary),
        type,
      });
      markDailyTask(principalUserId, 'log_once');

      if (supabaseConfigured && session?.user?.id === principalUserId) {
        syncAllForUser(principalUserId).catch(() => undefined);
      }

      router.back();
    } catch {
      setSnack(S.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  let preview: AvoidResult | null = null;
  if (principalUserId) {
    const previewPayload = buildPayload();
    if (previewPayload) {
      const logs = listLogs(600).filter((l) => l.user_id === principalUserId);
      const usage = computeTodayUsageBeforeInsert(logs);
      try {
        preview = calculateAvoided(type, previewPayload, usage);
      } catch {
        preview = null;
      }
    }
  }

  return (
    <ScreenBody scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
          <Text variant="titleLarge" style={{ marginBottom: 8 }}>
            {title}
          </Text>

          {photoDraft ? (
            <Card mode="elevated" style={{ marginBottom: 12 }}>
              <Card.Content style={{ gap: 12 }}>
                <Text variant="titleSmall">拍照打卡凭证</Text>
                <Image
                  source={{ uri: photoDraft.uri }}
                  style={{ width: '100%', height: 180, borderRadius: 14 }}
                />
                <View
                  style={{
                    backgroundColor: palette.mintLight,
                    borderRadius: 14,
                    padding: 12,
                    gap: 6,
                  }}
                >
                  <Text style={{ color: palette.primary, fontWeight: '700' }}>
                    AI 识别：{photoDraft.ai.category === 'unknown' ? '待你确认分类' : behaviorTitle(photoDraft.ai.category as BehaviorType)}
                  </Text>
                  <Text style={{ color: palette.outline }}>{photoDraft.ai.summary}</Text>
                  <Text style={{ color: '#7B5A34', fontWeight: '600' }}>{photoDraft.ai.encouragement}</Text>
                </View>
                <Pressable onPress={() => router.push('/photo-checkin')}>
                  <Text style={{ color: palette.primary, fontWeight: '700' }}>重新拍照或改用其他照片</Text>
                </Pressable>
              </Card.Content>
            </Card>
          ) : null}

          {(type === 'transport_bus' ||
            type === 'transport_metro' ||
            type === 'bike' ||
            type === 'walk') && (
            <Card mode="elevated" style={{ marginBottom: 12 }}>
              <Card.Content style={{ gap: 12 }}>
                <Text variant="titleSmall">行程</Text>
                <TextInput
                  mode="outlined"
                  label="单程里程（km）"
                  keyboardType="decimal-pad"
                  value={km}
                  onChangeText={setKm}
                  accessibilityLabel="单程里程千米"
                />
                <List.Item
                  title="往返（里程×2）"
                  right={() => (
                    <Switch
                      value={roundTrip}
                      onValueChange={setRoundTrip}
                      accessibilityLabel="往返开关"
                    />
                  )}
                />
                <HelperText type="info">{S.estimateNotice}</HelperText>
              </Card.Content>
            </Card>
          )}

          {type === 'food_save' && (
            <Card mode="elevated" style={{ marginBottom: 12 }}>
              <Card.Content style={{ gap: 12 }}>
                <Text variant="titleSmall">餐饮档位（区间估算）</Text>
                <SegmentedButtons
                  value={foodLevel}
                  onValueChange={(v) => setFoodLevel(v as FoodLevel)}
                  buttons={[
                    { value: 'simple', label: '偏素' },
                    { value: 'normal', label: '普通' },
                    { value: 'heavy', label: '荤食为主' },
                  ]}
                />
                <HelperText type="info">{S.estimateNotice}</HelperText>
              </Card.Content>
            </Card>
          )}

          {type === 'standby_off' && (
            <Card mode="elevated" style={{ marginBottom: 12 }}>
              <Card.Content style={{ gap: 12 }}>
                <Text variant="titleSmall">设备预设</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(
                    [
                      ['stb', '机顶盒'],
                      ['router', '路由器'],
                      ['tv', '电视'],
                      ['charger', '充电器'],
                      ['custom', '自定义'],
                    ] as const
                  ).map(([key, label]) => (
                    <Chip
                      key={key}
                      selected={standbyPreset === key}
                      onPress={() => setStandbyPreset(key)}
                      accessibilityLabel={`待机预设 ${label}`}
                    >
                      {label}
                    </Chip>
                  ))}
                </View>
                <TextInput
                  mode="outlined"
                  label="大致断电时长（小时）"
                  keyboardType="decimal-pad"
                  value={standbyHours}
                  onChangeText={setStandbyHours}
                  accessibilityLabel="断电时长小时"
                />
                {standbyPreset === 'custom' ? (
                  <TextInput
                    mode="outlined"
                    label="自定义功率（W）"
                    keyboardType="number-pad"
                    value={customWatts}
                    onChangeText={setCustomWatts}
                    accessibilityLabel="自定义功率瓦"
                  />
                ) : null}
                <HelperText type="info">{S.estimateNotice}</HelperText>
              </Card.Content>
            </Card>
          )}

          {type === 'ac_habit' && (
            <Card mode="elevated" style={{ marginBottom: 12 }}>
              <Card.Content style={{ gap: 12 }}>
                <Text variant="titleSmall">空调习惯</Text>
                <SegmentedButtons
                  value={acVariant}
                  onValueChange={(v) =>
                    setAcVariant(v as 'setpoint' | 'off_once')
                  }
                  buttons={[
                    { value: 'setpoint', label: '夏季调高 1℃（当日）' },
                    { value: 'off_once', label: '离开关闭一次' },
                  ]}
                />
                <HelperText type="info">{S.typicalSceneNotice}</HelperText>
              </Card.Content>
            </Card>
          )}

          {type === 'virtue' && (
            <Card mode="elevated" style={{ marginBottom: 12 }}>
              <Card.Content style={{ gap: 12 }}>
                <Text variant="titleSmall">描述好人好事</Text>
                <TextInput
                  mode="outlined"
                  multiline
                  numberOfLines={4}
                  placeholder="例如：帮同学关掉教室灯光 / 雨天共享雨伞……"
                  value={virtueNote}
                  onChangeText={setVirtueNote}
                  accessibilityLabel="好人好事描述"
                />
              </Card.Content>
            </Card>
          )}

          {type === 'mug' && (
            <Card mode="elevated" style={{ marginBottom: 12 }}>
              <Card.Content style={{ gap: 12 }}>
                <Text variant="titleSmall">自带杯（可选备注）</Text>
                <TextInput
                  mode="outlined"
                  placeholder="咖啡店自带杯 / 办公室水杯……"
                  value={mugNote}
                  onChangeText={setMugNote}
                  accessibilityLabel="自带杯备注"
                />
                <HelperText type="info">
                  默认不计入 kg CO₂e，但依然会计入记录列表。
                </HelperText>
              </Card.Content>
            </Card>
          )}

          {preview ? (
            <Card mode="outlined" style={{ marginBottom: 12 }}>
              <Card.Title title={S.howCalculated} />
              <Card.Content>
                <Text style={{ color: palette.estimate }}>{S.estimateNotice}</Text>
                {!preview.includedInSummary ? (
                  <Text style={{ marginTop: 8, color: '#B45309' }}>
                    {S.notInSummary}
                  </Text>
                ) : null}
                <Text style={{ marginTop: 10 }}>{preview.explanation}</Text>
              </Card.Content>
            </Card>
          ) : null}

          <Button
            mode="contained"
            onPress={() => void handleSave()}
            loading={saving}
            disabled={saving}
            accessibilityLabel="保存记录"
          >
            保存
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(undefined)} duration={2200}>
        {snack ?? ''}
      </Snackbar>
    </ScreenBody>
  );
}
