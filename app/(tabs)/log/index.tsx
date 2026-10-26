import { palette } from '@/constants/colors';
import { S } from '@/constants/strings';
import { ScreenBody } from '@/components/ScreenBody';
import {
  ORDERED_BEHAVIORS,
  type BehaviorCatalogItem,
} from '@/features/log/catalog';
import { behaviorTitle } from '@/lib/stats';
import { useAuth } from '@/lib/auth';
import { listLogPhotosByUser } from '@/lib/db';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Card, Text } from 'react-native-paper';

function Glyph({
  name,
}: {
  name: BehaviorCatalogItem['icon'];
}) {
  return (
    <MaterialCommunityIcons
      name={name as keyof typeof MaterialCommunityIcons.glyphMap}
      size={26}
      color={palette.primary}
    />
  );
}

export default function LogHubScreen() {
  const { principalUserId } = useAuth();
  const recentPhotos = principalUserId ? listLogPhotosByUser(principalUserId, 3) : [];

  return (
    <ScreenBody scroll>
      <Text variant="titleLarge" style={{ marginBottom: 8 }}>
        {S.tabLog}
      </Text>
      <Text style={{ color: '#5F6F69', marginBottom: 14 }}>
        选择一个场景，通常在 3 步内即可完成保存。
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="拍照打卡"
        onPress={() => router.push('/photo-checkin')}
        style={{
          backgroundColor: palette.primary,
          borderRadius: 22,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.14)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialCommunityIcons name="camera-plus-outline" size={24} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>拍照打卡</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4, lineHeight: 19 }}>
              用照片记录一次绿色行动，AI 会帮你识别分类并给出鼓励反馈。
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="#FFFFFF" />
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {ORDERED_BEHAVIORS.map((item) => (
          <Pressable
            key={item.type}
            accessibilityRole="button"
            accessibilityLabel={`记录 ${behaviorTitle(item.type)}`}
            onPress={() => router.push(`/log/${item.type}`)}
            style={{ width: '47%', minWidth: 150 }}
          >
            <Card mode="elevated">
              <Card.Content style={{ gap: 10 }}>
                <Glyph name={item.icon} />
                <Text variant="titleSmall">{behaviorTitle(item.type)}</Text>
              </Card.Content>
            </Card>
          </Pressable>
        ))}
      </View>

      {recentPhotos.length > 0 ? (
        <View style={{ marginTop: 22 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <Text variant="titleMedium">最近拍照打卡</Text>
            <Pressable onPress={() => router.push('/photo-album')}>
              <Text style={{ color: palette.primary, fontWeight: '600' }}>查看全部</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {recentPhotos.map((photo) => (
              <View
                key={photo.id}
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 18,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: palette.surfaceVariant,
                }}
              >
                <Image source={{ uri: photo.uri }} style={{ width: '100%', height: 96 }} />
                <View style={{ padding: 10 }}>
                  <Text numberOfLines={1} style={{ fontWeight: '700', color: palette.onSurface }}>
                    {photo.ai_title}
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 12, color: palette.outline, marginTop: 3 }}>
                    {photo.ai_category === 'unknown' ? '待补充分类' : behaviorTitle(photo.ai_category)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </ScreenBody>
  );
}
