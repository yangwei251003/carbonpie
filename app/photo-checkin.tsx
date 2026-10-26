import { palette } from '@/constants/colors';
import { captureCheckinPhoto, analyzeCheckinPhoto, type PreparedCheckinPhoto } from '@/features/log/photoCheckin';
import { savePendingPhotoDraft } from '@/features/log/photoDraft';
import { ORDERED_BEHAVIORS } from '@/features/log/catalog';
import type { BehaviorType, PhotoCheckinCategory } from '@/features/log/types';
import { behaviorTitle } from '@/lib/stats';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Snackbar, Text } from 'react-native-paper';

function iconForCategory(category: PhotoCheckinCategory) {
  const match = ORDERED_BEHAVIORS.find((item) => item.type === category);
  return match?.icon ?? 'image-search-outline';
}

export default function PhotoCheckinScreen() {
  const [photo, setPhoto] = useState<PreparedCheckinPhoto | null>(null);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState<string | undefined>();
  const [insight, setInsight] = useState<Awaited<ReturnType<typeof analyzeCheckinPhoto>> | null>(null);

  const suggestedCategory = insight?.insight.category ?? 'unknown';
  const categoryChoices = useMemo(
    () => ORDERED_BEHAVIORS.map((item) => item.type),
    [],
  );

  async function handlePick(source: 'camera' | 'library') {
    try {
      setLoading(true);
      const selected = await captureCheckinPhoto(source);
      if (!selected) return;
      setPhoto(selected);
      const result = await analyzeCheckinPhoto(selected);
      setInsight(result);
      if (!result.usedAi) {
        setSnack('照片已保存，暂未完成 AI 识图，你也可以手动选择分类。');
      }
    } catch (error: any) {
      setSnack(error?.message || '拍照失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  }

  async function continueWithCategory(category: BehaviorType) {
    if (!photo || !insight) return;
    await savePendingPhotoDraft({
      uri: photo.uri,
      source: photo.source,
      ai: {
        ...insight.insight,
        category,
      },
      created_at: new Date().toISOString(),
    });
    router.push(`/log/${category}?fromPhoto=1`);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={palette.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>拍照打卡</Text>
          <Text style={styles.headerSub}>用图片快速识别本次低碳行动，再继续补充记录。</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!photo ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIllustration}>
              <MaterialCommunityIcons name="camera-plus-outline" size={52} color={palette.primary} />
            </View>
            <Text style={styles.emptyTitle}>拍下一次绿色行动</Text>
            <Text style={styles.emptySub}>
              无论是骑行、步行、光盘行动还是自带杯，都可以先拍照，再让 AI 帮你判断更适合的记录分类。
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => void handlePick('camera')}>
              <MaterialCommunityIcons name="camera" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>立即拍照</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => void handlePick('library')}>
              <MaterialCommunityIcons name="image-outline" size={20} color={palette.primary} />
              <Text style={styles.secondaryButtonText}>从相册选择</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.previewCard}>
              <Image source={{ uri: photo.uri }} style={styles.previewImage} />
            </View>

            {loading ? (
              <View style={styles.resultCard}>
                <ActivityIndicator color={palette.primary} />
                <Text style={styles.resultLoading}>AI 正在识别这张打卡照片...</Text>
              </View>
            ) : insight ? (
              <View style={styles.resultCard}>
                <View style={styles.resultBadge}>
                  <MaterialCommunityIcons
                    name={iconForCategory(suggestedCategory) as any}
                    size={18}
                    color={palette.primary}
                  />
                  <Text style={styles.resultBadgeText}>
                    {suggestedCategory === 'unknown' ? '待手动分类' : `AI 建议：${behaviorTitle(suggestedCategory as BehaviorType)}`}
                  </Text>
                </View>
                <Text style={styles.resultTitle}>{insight.insight.title}</Text>
                <Text style={styles.resultSummary}>{insight.insight.summary}</Text>
                <View style={styles.encourageBox}>
                  <Text style={styles.encourageText}>{insight.insight.encouragement}</Text>
                </View>
                <View style={styles.tagRow}>
                  {insight.insight.tags.map((tag) => (
                    <View key={tag} style={styles.tagChip}>
                      <Text style={styles.tagChipText}>{tag}</Text>
                    </View>
                  ))}
                </View>

                {suggestedCategory !== 'unknown' ? (
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => void continueWithCategory(suggestedCategory as BehaviorType)}
                  >
                    <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>按 AI 建议继续填写</Text>
                  </Pressable>
                ) : null}

                <Text style={styles.manualTitle}>也可以手动选择分类</Text>
                <View style={styles.manualGrid}>
                  {categoryChoices.map((category) => (
                    <Pressable
                      key={category}
                      style={[
                        styles.manualChip,
                        suggestedCategory === category && styles.manualChipActive,
                      ]}
                      onPress={() => void continueWithCategory(category)}
                    >
                      <MaterialCommunityIcons
                        name={iconForCategory(category) as any}
                        size={16}
                        color={suggestedCategory === category ? '#FFFFFF' : palette.primary}
                      />
                      <Text
                        style={[
                          styles.manualChipText,
                          suggestedCategory === category && styles.manualChipTextActive,
                        ]}
                      >
                        {behaviorTitle(category)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.retakeRow}>
                  <Pressable style={styles.secondaryButtonSlim} onPress={() => void handlePick('camera')}>
                    <Text style={styles.secondaryButtonText}>重拍</Text>
                  </Pressable>
                  <Pressable style={styles.secondaryButtonSlim} onPress={() => void handlePick('library')}>
                    <Text style={styles.secondaryButtonText}>换一张</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(undefined)} duration={2200}>
        {snack ?? ''}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.surface },
  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 52,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: palette.surfaceVariant,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.mintLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: palette.primary },
  headerSub: { fontSize: 12, color: palette.outline, marginTop: 2 },
  content: {
    padding: 18,
    paddingBottom: 120,
  },
  emptyCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 28,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.surfaceVariant,
  },
  emptyIllustration: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#EAF5EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: palette.onSurface },
  emptySub: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    color: palette.outline,
    marginBottom: 18,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    borderRadius: 18,
    backgroundColor: palette.primary,
    paddingVertical: 15,
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#EAF5EE',
    paddingVertical: 15,
    marginTop: 10,
  },
  secondaryButtonText: {
    color: palette.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  previewCard: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: palette.surfaceContainer,
    marginBottom: 14,
  },
  previewImage: {
    width: '100%',
    height: 280,
  },
  resultCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.surfaceVariant,
  },
  resultLoading: {
    marginTop: 10,
    textAlign: 'center',
    color: palette.outline,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    backgroundColor: '#EDF7F0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  resultBadgeText: {
    color: palette.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  resultTitle: {
    marginTop: 14,
    fontSize: 20,
    fontWeight: '800',
    color: palette.onSurface,
  },
  resultSummary: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: palette.outline,
  },
  encourageBox: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: '#F5EFE5',
    padding: 14,
  },
  encourageText: {
    color: '#7B5A34',
    lineHeight: 20,
    fontSize: 13,
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tagChip: {
    borderRadius: 999,
    backgroundColor: palette.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagChipText: {
    color: palette.outline,
    fontSize: 12,
  },
  manualTitle: {
    marginTop: 18,
    marginBottom: 10,
    color: palette.onSurface,
    fontSize: 15,
    fontWeight: '800',
  },
  manualGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  manualChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#EEF5F0',
  },
  manualChipActive: {
    backgroundColor: palette.primary,
  },
  manualChipText: {
    color: palette.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  manualChipTextActive: {
    color: '#FFFFFF',
  },
  retakeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  secondaryButtonSlim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#EAF5EE',
    paddingVertical: 13,
  },
});
