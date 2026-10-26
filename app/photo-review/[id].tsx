import { palette } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getLogPhotoById } from '@/lib/db';
import { behaviorTitle } from '@/lib/stats';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

export default function PhotoReviewScreen() {
  const { principalUserId } = useAuth();
  const params = useLocalSearchParams<{ id: string }>();
  const photo = params.id ? getLogPhotoById(params.id) : null;

  if (!principalUserId || !photo || photo.user_id !== principalUserId) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: palette.outline }}>未找到这张打卡图片。</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={palette.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>AI 识图复看</Text>
          <Text style={styles.headerSub}>查看当时保存的图片、分类和鼓励反馈</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Image source={{ uri: photo.uri }} style={styles.heroImage} />
        <View style={styles.card}>
          <Text style={styles.title}>{photo.ai_title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {photo.ai_category === 'unknown' ? '待补充分类' : behaviorTitle(photo.ai_category)}
              </Text>
            </View>
            <View style={styles.badgeLight}>
              <Text style={styles.badgeLightText}>
                {photo.ai_confidence === 'high' ? '识别高置信' : photo.ai_confidence === 'medium' ? '识别中置信' : '识别低置信'}
              </Text>
            </View>
          </View>
          <Text style={styles.summary}>{photo.ai_summary}</Text>
          <View style={styles.encourageCard}>
            <Text style={styles.encourageLabel}>AI 鼓励</Text>
            <Text style={styles.encourageText}>{photo.ai_encouragement}</Text>
          </View>
          <View style={styles.tagRow}>
            {photo.ai_tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
          <View style={styles.infoList}>
            <Text style={styles.infoText}>
              记录时间：{new Date(photo.created_at).toLocaleString('zh-CN')}
            </Text>
            <Text style={styles.infoText}>
              图片来源：{photo.source === 'camera' ? '现场拍照' : '相册选择'}
            </Text>
            <Text style={styles.infoText}>
              云端状态：{photo.synced ? '已同步到云端' : '仅保存在本机'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.surface },
  center: { justifyContent: 'center', alignItems: 'center' },
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
  heroImage: { width: '100%', height: 320, borderRadius: 28, backgroundColor: palette.surfaceContainer },
  card: {
    marginTop: 14,
    backgroundColor: '#FFFDF9',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.surfaceVariant,
  },
  title: { fontSize: 22, fontWeight: '800', color: palette.onSurface },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  badge: {
    backgroundColor: '#EDF7F0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: { color: palette.primary, fontWeight: '700', fontSize: 12 },
  badgeLight: {
    backgroundColor: '#F5EFE5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeLightText: { color: '#7B5A34', fontWeight: '700', fontSize: 12 },
  summary: { marginTop: 12, color: palette.outline, lineHeight: 22, fontSize: 14 },
  encourageCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#F4EFE7',
  },
  encourageLabel: { color: '#7B5A34', fontWeight: '800', fontSize: 12, marginBottom: 6 },
  encourageText: { color: '#7B5A34', lineHeight: 20, fontSize: 13 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tagChip: { backgroundColor: palette.surfaceContainer, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  tagText: { color: palette.outline, fontSize: 12 },
  infoList: { marginTop: 18, gap: 6 },
  infoText: { color: palette.outline, fontSize: 12 },
});
