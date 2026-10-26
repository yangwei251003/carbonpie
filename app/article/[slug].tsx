import { EF_VERSION, GRID_EF_KG_CO2E_PER_KWH, METHODOLOGY_LINK } from '@/constants/carbon';
import { palette } from '@/constants/colors';
import { ARTICLES } from '@/content/articles';
import { fetchPublishedAiArticleBySlug } from '@/features/articles/dynamicArticles';
import { AppHero } from '@/components/AppHero';
import { PixabayImage } from '@/components/PixabayImage';
import { ScreenBody } from '@/components/ScreenBody';
import { markDailyTask } from '@/features/homestead/service';
import { getArticleQuery } from '@/features/images/pixabay';
import { useAuth } from '@/lib/auth';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, Text } from 'react-native-paper';

export default function ArticleDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { principalUserId } = useAuth();
  const staticArticle = useMemo(
    () => ARTICLES.find((a) => a.slug === slug),
    [slug],
  );
  const [dynamicArticle, setDynamicArticle] = useState<typeof staticArticle | null>(null);
  const [dynamicLoading, setDynamicLoading] = useState(false);
  const article = staticArticle ?? dynamicArticle;

  useEffect(() => {
    if (!slug || staticArticle) return;
    let alive = true;
    setDynamicLoading(true);
    fetchPublishedAiArticleBySlug(slug).then((item) => {
      if (alive) setDynamicArticle(item ?? null);
    }).finally(() => {
      if (alive) setDynamicLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [slug, staticArticle]);

  useFocusEffect(
    useCallback(() => {
      if (!principalUserId || !article) return;
      markDailyTask(principalUserId, 'read_article');
    }, [principalUserId, article]),
  );

  if (!article && dynamicLoading) {
    return (
      <ScreenBody scroll lead={<AppHero compact />}>
        <Text>正在打开 AI 科普文章...</Text>
      </ScreenBody>
    );
  }

  if (!article) {
    return (
      <ScreenBody scroll lead={<AppHero compact />}>
        <Text>未找到文章。</Text>
        <Button onPress={() => router.back()}>返回</Button>
      </ScreenBody>
    );
  }

  return (
    <ScreenBody scroll scrollProps={{ contentContainerStyle: { paddingBottom: 28 } }} lead={<AppHero compact />}>
      <View style={styles.heroCard}>
        {article.heroImageUrl ? (
          <Image
            source={{ uri: article.heroImageUrl }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            accessibilityLabel={`${article.title} 封面图`}
          />
        ) : (
          <PixabayImage
            query={article.heroQuery ?? getArticleQuery(article.tag)}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            borderRadius={26}
            accessibilityLabel={`${article.title} 封面图`}
          />
        )}
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <View style={styles.heroMeta}>
            {article.tag ? (
              <Chip icon="tag-outline" compact style={styles.heroChip} textStyle={styles.heroChipText}>
                {article.tag}
              </Chip>
            ) : null}
            <Text style={styles.readingLevel}>{article.readingLevel ?? '百科 · 3分钟'}</Text>
          </View>
          <Text style={styles.heroTitle}>{article.title}</Text>
          <Text style={styles.heroSummary}>
            {article.summary ?? article.paragraphs[0]}
          </Text>
        </View>
      </View>

      <View style={styles.aiUpdateCard}>
        <View style={styles.aiIcon}>
          <MaterialCommunityIcons name="auto-fix" size={20} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiTitle}>AI 百科编辑部</Text>
          <Text style={styles.aiText}>后续可每日自动抓取低碳资讯，生成通俗版科普、漫画分镜和配图，再进入审核发布。</Text>
        </View>
      </View>

      {article.facts?.length ? (
        <View style={styles.factGrid}>
          {article.facts.map((fact, idx) => (
            <View key={`${article.slug}-fact-${idx}`} style={styles.factCard}>
              <Text style={styles.factIndex}>{String(idx + 1).padStart(2, '0')}</Text>
              <Text style={styles.factText}>{fact}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {article.comicPanels?.length ? (
        <View style={styles.comicSection}>
          <Text style={styles.sectionTitle}>三格漫画讲明白</Text>
          {article.comicPanels.map((panel, idx) => (
            <View key={`${article.slug}-panel-${idx}`} style={styles.comicPanel}>
              <View style={styles.comicBadge}>
                <MaterialCommunityIcons name={panel.icon as any} size={24} color={palette.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.comicTitle}>{idx + 1}. {panel.title}</Text>
                <Text style={styles.comicBody}>{panel.body}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>百科正文</Text>
      {article.paragraphs.map((p, idx) => (
        <View key={`${article.slug}-${idx}`} style={styles.paragraphBlock}>
          <Text style={styles.dropNumber}>{idx + 1}</Text>
          <Text style={styles.paragraphText}>{p}</Text>
        </View>
      ))}

      <Divider style={{ marginVertical: 16 }} />

      <View style={styles.methodCard}>
        <Text style={styles.methodTitle}>方法与来源提示</Text>
        <Text style={styles.methodText}>
          {article.sourceNote ?? '本文用于低碳生活科普，具体政策、核算和交易规则请以主管部门公开文件为准。'}
        </Text>
        <Text style={styles.methodText}>
          当前内置版本：{EF_VERSION}；默认电网足迹因子：{GRID_EF_KG_CO2E_PER_KWH} kg CO₂e/kWh。
        </Text>
      </View>
      <Button
        mode="contained-tonal"
        onPress={() => void Linking.openURL(METHODOLOGY_LINK)}
        accessibilityLabel="打开生态环境部公告链接"
        style={{ marginTop: 12 }}
      >
        打开主管部门公告页面
      </Button>
      <Pressable style={styles.backToDiscover} onPress={() => router.back()}>
        <MaterialCommunityIcons name="arrow-left" size={16} color={palette.primary} />
        <Text style={styles.backText}>返回科普发现</Text>
      </Pressable>
    </ScreenBody>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    minHeight: 360,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: palette.primary,
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 32, 24, 0.52)',
  },
  heroContent: {
    padding: 22,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  heroChip: {
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  heroChipText: {
    color: palette.primary,
    fontWeight: '800',
  },
  readingLevel: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  heroSummary: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 15,
    lineHeight: 23,
  },
  aiUpdateCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#173F35',
    marginBottom: 16,
  },
  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  aiTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  aiText: {
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 20,
    fontSize: 12,
  },
  factGrid: {
    gap: 10,
    marginBottom: 20,
  },
  factCard: {
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.surfaceVariant,
    padding: 16,
  },
  factIndex: {
    color: palette.estimate,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
  },
  factText: {
    color: palette.onSurface,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
  },
  comicSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: palette.onSurface,
    marginBottom: 12,
  },
  comicPanel: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: '#FFF8E6',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0D9A0',
  },
  comicBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comicImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#F0EBD8',
  },
  comicTitle: {
    color: palette.onSurface,
    fontWeight: '900',
    fontSize: 15,
  },
  comicBody: {
    color: palette.outline,
    marginTop: 4,
    lineHeight: 19,
    fontSize: 12,
  },
  paragraphBlock: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 18,
    padding: 16,
  },
  dropNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    textAlign: 'center',
    lineHeight: 30,
    overflow: 'hidden',
    color: '#FFFFFF',
    backgroundColor: palette.primary,
    fontWeight: '900',
    fontSize: 12,
  },
  paragraphText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 26,
    color: '#243029',
  },
  methodCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: palette.mintCard,
  },
  methodTitle: {
    color: palette.primary,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  methodText: {
    color: palette.onSurface,
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 8,
  },
  backToDiscover: {
    marginTop: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
  },
  backText: {
    color: palette.primary,
    fontWeight: '800',
  },
});
