import { EF_VERSION } from '@/constants/carbon';
import { palette } from '@/constants/colors';
import { S } from '@/constants/strings';
import { ScreenBody } from '@/components/ScreenBody';
import { useAuth } from '@/lib/auth';
import { listLogPhotosByUser, listLogs } from '@/lib/db';
import { shareUtf8Text } from '@/lib/export';
import { behaviorTitle, sumIncludedAvoided, weekInterval } from '@/lib/stats';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { captureRef } from 'react-native-view-shot';
import { isWithinInterval, parseISO } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import React, { useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { Button, Snackbar, Text } from 'react-native-paper';

function topBehaviorLabel(types: string[]) {
  const counter = new Map<string, number>();
  for (const item of types) {
    counter.set(item, (counter.get(item) ?? 0) + 1);
  }
  const sorted = [...counter.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return '绿色行动';
  return behaviorTitle(sorted[0][0] as any);
}

function buildWebDownload(uri: string, filename: string) {
  if (typeof document === 'undefined') return;
  const a = document.createElement('a');
  a.href = uri;
  a.download = filename;
  a.click();
}

export default function ShareWeekScreen() {
  const { principalUserId } = useAuth();
  const posterRef = useRef<View>(null);
  const [snack, setSnack] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [template, setTemplate] = useState<'cover' | 'badge'>('cover');
  const weekBounds = useMemo(() => weekInterval(), []);

  const mine = useMemo(() => {
    if (!principalUserId) return [];
    return listLogs(800).filter((log) => log.user_id === principalUserId);
  }, [principalUserId]);
  const photos = useMemo(() => {
    if (!principalUserId) return [];
    return listLogPhotosByUser(principalUserId, 120);
  }, [principalUserId]);

  const weekLogs = useMemo(
    () =>
      mine.filter((log) =>
        isWithinInterval(parseISO(log.created_at), {
          start: weekBounds.start,
          end: weekBounds.end,
        }),
      ),
    [mine, weekBounds.end, weekBounds.start],
  );

  const weekPhotos = useMemo(
    () =>
      photos
        .filter((photo) =>
          isWithinInterval(parseISO(photo.created_at), {
            start: weekBounds.start,
            end: weekBounds.end,
          }),
        )
        .slice(0, 3),
    [photos, weekBounds.end, weekBounds.start],
  );

  const weekAvoided = sumIncludedAvoided(mine, weekBounds.start, weekBounds.end);
  const coverPhoto = weekPhotos[0] ?? null;
  const highlightTitle = coverPhoto?.ai_title ?? '把绿色生活过成风景';
  const highlightEncouragement =
    coverPhoto?.ai_encouragement ?? '这一周的每一次记录，都在把低碳生活变成你真正拥有的日常。';
  const weekMoments = weekPhotos.length;
  const topBehavior = topBehaviorLabel(weekLogs.map((log) => log.type));
  const weeklyTags = Array.from(new Set(weekPhotos.flatMap((photo) => photo.ai_tags))).slice(0, 4);

  const txtPayload = useMemo(() => {
    const lines = [
      `${S.appNameZh} · 照片周报摘要`,
      S.tagline,
      '',
      `因子版本：${EF_VERSION}`,
      `本周估算减排：约 ${weekAvoided} kg CO₂e`,
      `本周记录条数：${weekLogs.length}`,
      `本周照片打卡：${weekMoments} 张`,
      `本周代表行动：${topBehavior}`,
      `本周亮点：${highlightTitle}`,
      `鼓励语：${highlightEncouragement}`,
      '',
      `生成时间：${new Date().toLocaleString('zh-CN')}`,
    ];
    return lines.join('\n');
  }, [highlightEncouragement, highlightTitle, topBehavior, weekAvoided, weekLogs.length, weekMoments]);

  async function savePoster() {
    const target = posterRef.current;
    if (!target) {
      setSnack('海报区域还没准备好。');
      return;
    }
    try {
      setBusy(true);
      if (Platform.OS === 'web') {
        const dataUri = await captureRef(target, {
          format: 'png',
          quality: 1,
          result: 'data-uri',
        });
        buildWebDownload(dataUri, `carbonpie-weekly-${Date.now()}.png`);
        setSnack('周报海报已下载。');
        return;
      }

      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        setSnack('需要相册权限才能保存海报。');
        return;
      }
      const uri = await captureRef(target, { format: 'png', quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      setSnack('海报已保存到相册');
    } catch {
      try {
        await shareUtf8Text(`carbonpie-weekly-${Date.now()}.txt`, txtPayload);
        setSnack('图片生成失败，已为你导出文字版周报。');
      } catch {
        setSnack('保存失败，请稍后再试。');
      }
    } finally {
      setBusy(false);
    }
  }

  async function exportTxt() {
    try {
      await shareUtf8Text(`carbonpie-weekly-${Date.now()}.txt`, txtPayload);
      setSnack('已导出周报文本');
    } catch {
      setSnack('导出失败');
    }
  }

  return (
    <ScreenBody scroll>
      <Text variant="titleLarge">{S.sharePoster}</Text>
      <Text style={{ marginTop: 10, color: '#5F6F69' }}>
        用本周打卡照片和减碳数据，生成一张可以保存或展示的个人周报海报。
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        {[
          ['cover', '照片封面', 'image-outline'],
          ['badge', '成果徽章', 'medal-outline'],
        ].map(([key, label, icon]) => (
          <Pressable
            key={key}
            onPress={() => setTemplate(key as 'cover' | 'badge')}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              borderRadius: 16,
              paddingVertical: 12,
              backgroundColor: template === key ? palette.primary : palette.mintLight,
            }}
          >
            <MaterialCommunityIcons name={icon as any} size={17} color={template === key ? '#FFFFFF' : palette.primary} />
            <Text style={{ color: template === key ? '#FFFFFF' : palette.primary, fontWeight: '800' }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ alignItems: 'center', marginTop: 18 }}>
        <View ref={posterRef} collapsable={false}>
          <View
            style={{
              width: 340,
              borderRadius: 30,
              backgroundColor: template === 'cover' ? '#102F29' : '#FFFDF9',
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: template === 'cover' ? '#315E4E' : palette.surfaceVariant,
            }}
          >
            <LinearGradient
              colors={template === 'cover' ? ['#123E35', '#1F6A52'] : ['#134234', '#EAF5EE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 18 }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
                CarbonPie Weekly Journal
              </Text>
              <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginTop: 6 }}>
                {template === 'cover' ? '我的低碳照片周报' : '本周绿色成果徽章'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 8, lineHeight: 20 }}>
                {highlightEncouragement}
              </Text>
            </LinearGradient>

            <View style={{ padding: 16 }}>
              {template === 'cover' && coverPhoto ? (
                <View style={{ borderRadius: 24, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' }}>
                  <Image source={{ uri: coverPhoto.uri }} style={{ width: '100%', height: 238 }} />
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.32)',
                      padding: 14,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>{highlightTitle}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.84)', marginTop: 4, fontSize: 12 }}>
                      {coverPhoto.ai_category === 'unknown' ? '拍照打卡' : behaviorTitle(coverPhoto.ai_category)}
                    </Text>
                  </View>
                </View>
              ) : template === 'badge' ? (
                <LinearGradient
                  colors={['#F8E2A0', '#F8F2DC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    height: 220,
                    borderRadius: 24,
                    marginBottom: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: '#E4C977',
                  }}
                >
                  <View
                    style={{
                      width: 126,
                      height: 126,
                      borderRadius: 63,
                      backgroundColor: '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 8,
                      borderColor: '#DFAE3D',
                    }}
                  >
                    <MaterialCommunityIcons name="leaf-circle-outline" size={56} color={palette.primary} />
                  </View>
                  <Text style={{ color: '#5B401A', fontWeight: '900', fontSize: 20, marginTop: 12 }}>
                    {topBehavior} 达人
                  </Text>
                  <Text style={{ color: '#7B5A34', marginTop: 4 }}>本周坚持 {weekLogs.length} 次记录</Text>
                </LinearGradient>
              ) : (
                <View
                  style={{
                    height: 220,
                    borderRadius: 22,
                    marginBottom: 14,
                    backgroundColor: '#EAF5EE',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="image-plus" size={48} color={palette.primary} />
                  <Text style={{ color: palette.primary, fontWeight: '700', marginTop: 10 }}>
                    本周还没有照片打卡
                  </Text>
                </View>
              )}

              {weekPhotos.length > 1 ? (
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                  {weekPhotos.slice(1).map((photo) => (
                    <Image
                      key={photo.id}
                      source={{ uri: photo.uri }}
                      style={{ flex: 1, height: 90, borderRadius: 16 }}
                    />
                  ))}
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <View
                  style={{
                    flex: 1,
                    borderRadius: 18,
                    padding: 14,
                    backgroundColor: template === 'cover' ? 'rgba(255,255,255,0.12)' : '#F5EFE5',
                  }}
                >
                  <Text style={{ color: template === 'cover' ? 'rgba(255,255,255,0.78)' : '#7B5A34', fontSize: 11 }}>本周估算减碳</Text>
                  <Text style={{ color: template === 'cover' ? '#FFFFFF' : palette.onSurface, fontSize: 24, fontWeight: '800', marginTop: 4 }}>
                    {weekAvoided}
                  </Text>
                  <Text style={{ color: template === 'cover' ? 'rgba(255,255,255,0.7)' : palette.outline, fontSize: 12 }}>kg CO₂e</Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    borderRadius: 18,
                    padding: 14,
                    backgroundColor: template === 'cover' ? 'rgba(255,255,255,0.12)' : '#EDF7F0',
                  }}
                >
                  <Text style={{ color: template === 'cover' ? 'rgba(255,255,255,0.78)' : palette.primary, fontSize: 11 }}>照片打卡 / 记录</Text>
                  <Text style={{ color: template === 'cover' ? '#FFFFFF' : palette.onSurface, fontSize: 24, fontWeight: '800', marginTop: 4 }}>
                    {weekMoments} / {weekLogs.length}
                  </Text>
                  <Text style={{ color: template === 'cover' ? 'rgba(255,255,255,0.7)' : palette.outline, fontSize: 12 }}>本周绿色瞬间</Text>
                </View>
              </View>

              <View
                style={{
                  borderRadius: 18,
                  backgroundColor: template === 'cover' ? 'rgba(255,255,255,0.1)' : '#FFF8EE',
                  padding: 14,
                  borderWidth: 1,
                  borderColor: template === 'cover' ? 'rgba(255,255,255,0.14)' : '#F1E3CD',
                }}
              >
                <Text style={{ color: template === 'cover' ? '#DDF4A6' : '#7B5A34', fontSize: 12, fontWeight: '800' }}>周报摘要</Text>
                <Text style={{ color: template === 'cover' ? '#FFFFFF' : palette.onSurface, fontSize: 18, fontWeight: '800', marginTop: 6 }}>
                  {topBehavior} 是你这周最常见的绿色行动
                </Text>
                <Text style={{ color: template === 'cover' ? 'rgba(255,255,255,0.76)' : palette.outline, lineHeight: 20, marginTop: 8, fontSize: 13 }}>
                  {coverPhoto?.ai_summary ?? '完成更多拍照打卡后，这里会自动生成更具体的图像回顾。'}
                </Text>
                {weeklyTags.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {weeklyTags.map((tag) => (
                      <View
                        key={tag}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: 999,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                        }}
                      >
                        <Text style={{ color: '#7B5A34', fontSize: 11 }}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>

              <View
                style={{
                  marginTop: 16,
                  paddingTop: 14,
                  borderTopWidth: 1,
                  borderTopColor: template === 'cover' ? 'rgba(255,255,255,0.16)' : palette.surfaceVariant,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View>
                  <Text style={{ color: template === 'cover' ? '#DDF4A6' : palette.primary, fontWeight: '800' }}>{S.appNameZh}</Text>
                  <Text style={{ color: template === 'cover' ? 'rgba(255,255,255,0.68)' : palette.outline, fontSize: 11, marginTop: 2 }}>{EF_VERSION}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: template === 'cover' ? 'rgba(255,255,255,0.68)' : palette.outline, fontSize: 11 }}>Generated on</Text>
                  <Text style={{ color: template === 'cover' ? '#FFFFFF' : palette.onSurface, fontSize: 12, fontWeight: '700', marginTop: 2 }}>
                    {new Date().toLocaleDateString('zh-CN')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      <Button
        mode="contained"
        style={{ marginTop: 22 }}
        loading={busy}
        disabled={busy}
        onPress={() => void savePoster()}
        accessibilityLabel="保存周报海报"
      >
        {Platform.OS === 'web' ? '下载周报海报' : '保存海报到相册'}
      </Button>
      <Button mode="outlined" style={{ marginTop: 10 }} onPress={() => void exportTxt()}>
        导出文字版周报摘要
      </Button>
      {!weekPhotos.length ? (
        <Pressable
          style={{
            marginTop: 12,
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: 'center',
            backgroundColor: palette.mintLight,
          }}
          onPress={() => void setSnack('先去完成几次拍照打卡，再回来生成更精彩的周报海报。')}
        >
          <Text style={{ color: palette.primary, fontWeight: '700' }}>提示：照片越多，海报越完整</Text>
        </Pressable>
      ) : null}

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(undefined)} duration={2600}>
        {snack ?? ''}
      </Snackbar>
    </ScreenBody>
  );
}
