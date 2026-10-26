import { palette } from '@/constants/colors';
import { ORDERED_BEHAVIORS } from '@/features/log/catalog';
import type { PhotoCheckinCategory } from '@/features/log/types';
import { useAuth } from '@/lib/auth';
import { listLogPhotosByUser } from '@/lib/db';
import { behaviorTitle } from '@/lib/stats';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

const FILTERS: { key: PhotoCheckinCategory | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: '全部', icon: 'image-multiple-outline' },
  ...ORDERED_BEHAVIORS.map((item) => ({ key: item.type, label: behaviorTitle(item.type), icon: item.icon })),
  { key: 'unknown', label: '待分类', icon: 'help-circle-outline' },
];

export default function PhotoAlbumScreen() {
  const { principalUserId } = useAuth();
  const [filter, setFilter] = useState<PhotoCheckinCategory | 'all'>('all');
  const photos = principalUserId ? listLogPhotosByUser(principalUserId, 240) : [];
  const filteredPhotos = useMemo(
    () => (filter === 'all' ? photos : photos.filter((photo) => photo.ai_category === filter)),
    [filter, photos],
  );
  const syncedCount = photos.filter((photo) => photo.synced).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={palette.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>打卡影像册</Text>
          <Text style={styles.headerSub}>按时间整理你的照片记录和 AI 识别结果</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.posterBtn} onPress={() => router.push('/share-week')}>
          <MaterialCommunityIcons name="image-frame" size={20} color="#FFFFFF" />
          <Text style={styles.posterBtnText}>用本周照片生成周报海报</Text>
        </Pressable>
        <View style={styles.syncSummary}>
          <MaterialCommunityIcons name="cloud-check-outline" size={18} color={palette.primary} />
          <Text style={styles.syncSummaryText}>云端同步 {syncedCount}/{photos.length}</Text>
          <Text style={styles.syncSummaryHint}>登录后会随记录自动同步</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
          {FILTERS.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
              onPress={() => setFilter(item.key)}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={15}
                color={filter === item.key ? '#FFFFFF' : palette.primary}
              />
              <Text style={[styles.filterChipText, filter === item.key && styles.filterChipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {photos.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="image-multiple-outline" size={40} color={palette.primary} />
            <Text style={styles.emptyTitle}>还没有影像记录</Text>
            <Text style={styles.emptySub}>从“记录”页发起一次拍照打卡后，这里会自动帮你整理保存。</Text>
            <Pressable style={styles.emptyBtn} onPress={() => router.push('/photo-checkin')}>
              <Text style={styles.emptyBtnText}>去拍第一张</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredPhotos.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="filter-remove-outline" size={34} color={palette.primary} />
                <Text style={styles.emptyTitle}>这个分类还没有照片</Text>
                <Text style={styles.emptySub}>换一个分类看看，或去完成一次新的拍照打卡。</Text>
              </View>
            ) : null}
            {filteredPhotos.map((photo) => (
              <Pressable key={photo.id} style={styles.card} onPress={() => router.push(`/photo-review/${photo.id}`)}>
                <Image source={{ uri: photo.uri }} style={styles.photo} />
                <View style={[styles.syncBadge, photo.synced ? styles.syncBadgeDone : styles.syncBadgePending]}>
                  <MaterialCommunityIcons
                    name={photo.synced ? 'cloud-check-outline' : 'cloud-upload-outline'}
                    size={13}
                    color={photo.synced ? palette.primary : '#8D5A2B'}
                  />
                  <Text style={[styles.syncBadgeText, !photo.synced && styles.syncBadgeTextPending]}>
                    {photo.synced ? '已上云' : '待同步'}
                  </Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{photo.ai_title}</Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {photo.ai_category === 'unknown' ? '待补充分类' : behaviorTitle(photo.ai_category)}
                  </Text>
                  <Text style={styles.cardSummary} numberOfLines={2}>{photo.ai_summary}</Text>
                  <Text style={styles.cardTime}>
                    {new Date(photo.created_at).toLocaleString('zh-CN', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 52,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: palette.surfaceVariant,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.mintLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: palette.primary },
  headerSub: { fontSize: 12, color: palette.outline, marginTop: 2 },
  content: { padding: 18, paddingBottom: 100 },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFDF9',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: palette.surfaceVariant,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '800',
    color: palette.onSurface,
  },
  emptySub: {
    marginTop: 8,
    color: palette.outline,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: palette.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  posterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.primary,
    borderRadius: 18,
    paddingVertical: 15,
    marginBottom: 14,
  },
  posterBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  syncSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EDF7F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 12,
  },
  syncSummaryText: { color: palette.primary, fontWeight: '800' },
  syncSummaryHint: { color: palette.outline, fontSize: 11, marginLeft: 'auto' },
  filterRail: { gap: 8, paddingBottom: 14 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAF5EE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: { backgroundColor: palette.primary },
  filterChipText: { color: palette.primary, fontWeight: '700', fontSize: 12 },
  filterChipTextActive: { color: '#FFFFFF' },
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.surfaceVariant,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 220,
  },
  cardBody: {
    padding: 14,
  },
  syncBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  syncBadgeDone: { backgroundColor: 'rgba(237,247,240,0.95)' },
  syncBadgePending: { backgroundColor: 'rgba(255,248,238,0.95)' },
  syncBadgeText: { color: palette.primary, fontSize: 11, fontWeight: '800' },
  syncBadgeTextPending: { color: '#8D5A2B' },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.onSurface,
  },
  cardMeta: {
    marginTop: 4,
    color: palette.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  cardSummary: {
    marginTop: 6,
    color: palette.outline,
    lineHeight: 18,
    fontSize: 12,
  },
  cardTime: {
    marginTop: 8,
    color: palette.outline,
    fontSize: 11,
  },
});
