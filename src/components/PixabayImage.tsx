/**
 * PixabayImage — 自动从 Pixabay 加载并展示图片
 * 包含骨架屏加载动画和优雅降级
 */
import { palette } from '@/constants/colors';
import { fetchPixabayImage } from '@/features/images/pixabay';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageStyle,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

type Props = {
  query: string;
  style?: ViewStyle | ImageStyle;
  fallbackIcon?: string;
  fallbackColor?: string;
  index?: number;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  borderRadius?: number;
  accessibilityLabel?: string;
};

export function PixabayImage({
  query,
  style,
  fallbackIcon = 'image-outline',
  fallbackColor = palette.mintCard,
  index = 0,
  resizeMode = 'cover',
  borderRadius,
  accessibilityLabel,
}: Props) {
  const [uri, setUri] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // 骨架屏脉冲动画
  const shimmerAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setFailed(false);
    setUri(null);

    fetchPixabayImage(query, { index })
      .then((url) => {
        if (!cancelled) {
          if (url) setUri(url);
          else setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => { cancelled = true; };
  }, [query, index]);

  const containerStyle: ViewStyle = {
    overflow: 'hidden',
    borderRadius: borderRadius,
    backgroundColor: palette.surfaceContainer,
    ...(style as ViewStyle),
  };
  const imageStyle: ImageStyle = {
    borderRadius,
    ...(style as ImageStyle),
  };

  // 加载失败时：显示彩色占位
  if (failed) {
    return (
      <View style={[containerStyle, styles.fallback, { backgroundColor: fallbackColor }]}>
        <MaterialCommunityIcons
          name={fallbackIcon as any}
          size={28}
          color={palette.primary}
          style={{ opacity: 0.5 }}
        />
      </View>
    );
  }

  // 加载中：骨架屏动画
  if (!uri || !loaded) {
    return (
      <View style={containerStyle}>
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: palette.surfaceHigh, opacity: shimmerAnim },
          ]}
        />
        {uri && (
          <Image
            source={{ uri }}
            style={[StyleSheet.absoluteFillObject, { opacity: 0 }]}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            accessibilityLabel={accessibilityLabel}
          />
        )}
        <View style={styles.shimmerOverlay}>
          <View style={styles.shimmerLine} />
          <View style={[styles.shimmerLine, { width: '60%' }]} />
        </View>
      </View>
    );
  }

  // 图片加载成功
  return (
    <Image
      source={{ uri }}
      style={imageStyle}
      resizeMode={resizeMode}
      accessibilityLabel={accessibilityLabel ?? query}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  shimmerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12,
    gap: 6,
  },
  shimmerLine: {
    height: 8,
    width: '80%',
    backgroundColor: palette.surfaceVariant,
    borderRadius: 4,
    opacity: 0.5,
  },
});
