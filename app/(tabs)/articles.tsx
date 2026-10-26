import { palette } from '@/constants/colors';
import { ARTICLES, type Article } from '@/content/articles';
import { fetchPublishedAiArticles } from '@/features/articles/dynamicArticles';
import { markDailyTask } from '@/features/homestead/service';
import { SCENE_QUERIES, getArticleQuery, getCommunityQuery } from '@/features/images/pixabay';
import { PixabayImage } from '@/components/PixabayImage';
import { useAuth } from '@/lib/auth';
import {
  fetchFriendActivityLogs,
  fetchFriendLogPhotos,
  fetchProfilesByIds,
  listFriendships,
  type PublicProfile,
} from '@/lib/socialApi';
import { getPhotoPublicUrl } from '@/lib/supabaseStorage';
import { behaviorTitle } from '@/lib/stats';
import { router, useFocusEffect } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Image,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  FlatList,
} from 'react-native';
import { Text, Chip } from 'react-native-paper';

const FILTERS = [
  { key: '骑行', icon: 'bicycle' },
  { key: '节电', icon: 'lightning-bolt' },
  { key: '素食', icon: 'food-apple' },
  { key: '回收', icon: 'recycle' },
  { key: '新闻资讯', icon: 'newspaper-variant-outline' },
];

// 精选文章
const FEATURED_SLUG = 'green-power-basics';

// 社区挑战数据（静态展示）
const CHALLENGES = [
  { id: '1', title: '7天零废弃挑战赛', progress: 4, total: 7, badge: '精选' },
];

const GROUPS = [
  { id: '1', icon: 'bicycle', name: '单车通勤周', count: '1,284' },
  { id: '2', icon: 'food-apple', name: '周一素食小组', count: '3,510' },
  { id: '3', icon: 'solar-power', name: '太阳能改造计划', count: '842' },
];

export default function DiscoverScreen() {
  const { principalUserId, session } = useAuth();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'articles' | 'community'>('articles');
  const [aiArticles, setAiArticles] = useState<Article[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<PublicProfile[]>([]);
  const [friendFeed, setFriendFeed] = useState<Awaited<ReturnType<typeof fetchFriendActivityLogs>>>([]);
  const [friendPhotos, setFriendPhotos] = useState<Awaited<ReturnType<typeof fetchFriendLogPhotos>>>([]);

  const filtered = useMemo(() => {
    let list = [...aiArticles, ...ARTICLES];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (a) => a.title.toLowerCase().includes(q) || (a.tag ?? '').toLowerCase().includes(q),
      );
    }
    if (activeFilter) {
      list = list.filter((a) => (a.tag ?? '') === activeFilter);
    }
    return list;
  }, [aiArticles, search, activeFilter]);

  const featured = aiArticles[0] ?? ARTICLES.find((a) => a.slug === FEATURED_SLUG) ?? ARTICLES[0];
  const others = filtered.filter((a) => a.slug !== FEATURED_SLUG);

  function handleOpenArticle(slug: string) {
    if (principalUserId) markDailyTask(principalUserId, 'read_article');
    router.push(`/article/${slug}`);
  }

  const loadFriendFeed = useCallback(async () => {
    if (!session?.user?.id) {
      setFriendProfiles([]);
      setFriendFeed([]);
      setFriendPhotos([]);
      return;
    }
    const rels = await listFriendships();
    const ids = rels
      .map((item) => (item.user_low === session.user.id ? item.user_high : item.user_high === session.user.id ? item.user_low : null))
      .filter(Boolean) as string[];
    const profiles = await fetchProfilesByIds(ids);
    const logs = await fetchFriendActivityLogs(ids);
    const photos = await fetchFriendLogPhotos(logs.map((log) => log.client_id).filter(Boolean) as string[]);
    setFriendProfiles(profiles);
    setFriendFeed(logs);
    setFriendPhotos(photos);
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'articles') void fetchPublishedAiArticles().then(setAiArticles);
      if (activeTab === 'community') void loadFriendFeed();
    }, [activeTab, loadFriendFeed]),
  );

  const profileMap = useMemo(() => new Map(friendProfiles.map((profile) => [profile.id, profile])), [friendProfiles]);
  const photoMap = useMemo(() => new Map(friendPhotos.map((photo) => [photo.log_client_id, photo])), [friendPhotos]);

  return (
    <View style={styles.container}>
      {/* ── 顶部 Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarCircle}>
            <MaterialCommunityIcons name="compass" size={18} color={palette.heroOnMuted} />
          </View>
          <Text style={styles.headerTitle}>CarbonPie</Text>
        </View>
        <Pressable style={styles.bellBtn}>
          <MaterialCommunityIcons name="bell-outline" size={22} color={palette.onSurface} />
        </Pressable>
      </View>

      {/* ── Tab 切换 ── */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'articles' && styles.tabBtnActive]}
          onPress={() => setActiveTab('articles')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'articles' && styles.tabBtnTextActive]}>
            科普发现
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'community' && styles.tabBtnActive]}
          onPress={() => setActiveTab('community')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'community' && styles.tabBtnTextActive]}>
            社区挑战
          </Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {activeTab === 'articles' ? (
          <View style={styles.content}>
            {/* 搜索栏 */}
            <View style={styles.editorialCard}>
              <View style={styles.editorialTop}>
                <View>
                  <Text style={styles.editorialKicker}>AI 低碳百科馆</Text>
                  <Text style={styles.editorialTitle}>每天自动更新一篇“能看懂、愿意看”的低碳科普</Text>
                </View>
                <View style={styles.editorialSpark}>
                  <MaterialCommunityIcons name="creation" size={24} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.editorialText}>
                可接入新闻/政策源，由 AI 生成百科正文、漫画分镜和配图提示，再进入审核发布。
              </Text>
              <View style={styles.editorialPills}>
                <Text style={styles.editorialPill}>定时资讯</Text>
                <Text style={styles.editorialPill}>AI 生图</Text>
                <Text style={styles.editorialPill}>人工审核</Text>
              </View>
            </View>

            {/* 搜索栏 */}
            <View style={styles.searchBar}>
              <MaterialCommunityIcons name="magnify" size={20} color={palette.outline} />
              <TextInput
                style={styles.searchInput}
                placeholder="搜科普文章"
                placeholderTextColor={palette.outline}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={palette.outline} />
                </Pressable>
              )}
            </View>

            {/* Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 20 }}
              contentContainerStyle={{ gap: 8 }}
            >
              {FILTERS.map((f) => (
                <Pressable
                  key={f.key}
                  style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
                  onPress={() => setActiveFilter(activeFilter === f.key ? null : f.key)}
                >
                  <MaterialCommunityIcons
                    name={f.icon as any}
                    size={14}
                    color={activeFilter === f.key ? '#FFF' : palette.primary}
                  />
                  <Text
                    style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}
                  >
                    {f.key}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* 精选 Banner */}
            {!search && !activeFilter && (
              <Pressable
                style={styles.featuredBanner}
                onPress={() => handleOpenArticle(featured.slug)}
                accessibilityLabel={`精选文章: ${featured.title}`}
                accessibilityRole="button"
              >
                {/* 真实 Pixabay 图片作为背景 */}
                <PixabayImage
                  query={SCENE_QUERIES.discover_featured}
                  style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }}
                  resizeMode="cover"
                  borderRadius={20}
                  accessibilityLabel="森林碳汇精选封面"
                />
                {/* 深色遮罩 */}
                <View style={styles.featuredOverlay} />
                <View style={styles.featuredContent}>
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredBadgeText}>热门推荐</Text>
                  </View>
                  <Text style={styles.featuredTitle}>{featured.title}</Text>
                  <Text style={styles.featuredSubtitle} numberOfLines={2}>
                    {featured.paragraphs[0]}
                  </Text>
                </View>
              </Pressable>
            )}

            {/* 文章列表 */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>最新探索</Text>
              <Text style={styles.sectionCount}>全部 {filtered.length} 篇 ›</Text>
            </View>

            {others.map((article, idx) => (
              <Pressable
                key={article.slug}
                style={[styles.articleCard, { marginBottom: idx < others.length - 1 ? 12 : 0 }]}
                onPress={() => handleOpenArticle(article.slug)}
                accessibilityLabel={`打开文章 ${article.title}`}
                accessibilityRole="button"
              >
                {/* 真实 Pixabay 图片缩略图 */}
                <PixabayImage
                  query={getArticleQuery(article.tag)}
                  index={idx % 5}
                  style={{ width: 100, height: '100%', minHeight: 110 }}
                  resizeMode="cover"
                  fallbackIcon="leaf"
                  fallbackColor={palette.mintLight}
                  accessibilityLabel={`${article.title} 缩略图`}
                />
                <View style={styles.articleInfo}>
                  <Text style={styles.articleTitle} numberOfLines={2}>{article.title}</Text>
                  <Text style={styles.articleExcerpt} numberOfLines={2}>
                    {article.paragraphs[0]}
                  </Text>
                  <View style={styles.articleMeta}>
                    <MaterialCommunityIcons name="clock-outline" size={12} color={palette.outline} />
                    <Text style={styles.articleMetaText}>
                      {Math.ceil(article.paragraphs.join('').length / 200)} min read
                    </Text>
                    {article.tag && (
                      <View style={styles.articleTag}>
                        <Text style={styles.articleTagText}>{article.tag}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          /* ── 社区板块 ── */
          <View style={styles.content}>
            <Text style={styles.communityTitle}>低碳社区</Text>
            <Text style={styles.communitySubtitle}>看看好友今天把低碳生活过成了什么样。</Text>

            <View style={styles.feedHeaderCard}>
              <View>
                <Text style={styles.feedHeaderTitle}>好友动态</Text>
                <Text style={styles.feedHeaderSub}>
                  {session?.user ? `${friendProfiles.length} 位好友 · ${friendFeed.length} 条记录` : '登录后可查看好友记录'}
                </Text>
              </View>
              <Pressable style={styles.feedHeaderBtn} onPress={() => router.push('/friends')}>
                <Text style={styles.feedHeaderBtnText}>{session?.user ? '好友管理' : '去登录'}</Text>
              </Pressable>
            </View>

            {session?.user && friendFeed.length > 0 ? (
              <View style={styles.friendFeedList}>
                {friendFeed.slice(0, 8).map((log) => {
                  const profile = profileMap.get(log.user_id);
                  const photo = log.client_id ? photoMap.get(log.client_id) : null;
                  return (
                    <View key={log.id} style={styles.friendFeedCard}>
                      {photo?.storage_path ? (
                        <Image
                          source={{ uri: getPhotoPublicUrl(photo.storage_path) }}
                          style={styles.friendFeedImage}
                        />
                      ) : null}
                      <View style={styles.friendFeedBody}>
                        <View style={styles.friendFeedTop}>
                          <View style={styles.friendAvatar}>
                            <Text style={styles.friendAvatarText}>
                              {(profile?.display_name ?? '碳友').slice(0, 1).toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.friendName}>{profile?.display_name ?? '低碳好友'}</Text>
                            <Text style={styles.friendTime}>
                              {new Date(log.created_at).toLocaleString('zh-CN', {
                                month: 'numeric',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                          </View>
                          <Text style={styles.friendKg}>
                            {log.included_in_summary ? `~${Number(log.avoided_kg_co2e).toFixed(2)}kg` : '美德'}
                          </Text>
                        </View>
                        <Text style={styles.friendAction}>{behaviorTitle(log.type as any)}</Text>
                        <Text style={styles.friendSummary}>
                          {photo?.ai_summary ?? `${profile?.display_name ?? '好友'}完成了一次低碳记录。`}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.friendEmptyCard}>
                <MaterialCommunityIcons name="account-heart-outline" size={34} color={palette.primary} />
                <Text style={styles.friendEmptyTitle}>{session?.user ? '好友还没有动态' : '登录后查看好友动态'}</Text>
                <Text style={styles.friendEmptySub}>
                  {session?.user ? '去添加好友，或邀请同学一起记录低碳生活。' : '登录后可以查看好友的低碳记录、照片打卡和减碳成果。'}
                </Text>
              </View>
            )}

            {/* 精选挑战 */}
            {CHALLENGES.map((ch) => (
              <View key={ch.id} style={styles.challengeCard}>
                <PixabayImage
                  query={getCommunityQuery(ch.id)}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
                  borderRadius={20}
                  accessibilityLabel={ch.title}
                />
                <View style={styles.featuredOverlay} />
                <View style={styles.challengeBadge}>
                  <Text style={styles.challengeBadgeText}>{ch.badge}</Text>
                </View>
                <Text style={styles.challengeTitle}>{ch.title}</Text>
                <Text style={styles.challengeProgressLabel}>
                  当前进度 <Text style={{ fontWeight: '700' }}>{ch.progress}/{ch.total} 天</Text>
                </Text>
                <View style={styles.challengeBar}>
                  <View style={[styles.challengeBarFill, { width: `${(ch.progress / ch.total) * 100}%` }]} />
                </View>
                <Pressable style={styles.challengeBtn}>
                  <Text style={styles.challengeBtnText}>继续挑战</Text>
                </Pressable>
              </View>
            ))}

            {/* 活跃小组 */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>活跃小组</Text>
              <Text style={styles.sectionCount}>查看全部 ›</Text>
            </View>

            {GROUPS.map((g, idx) => (
              <View key={g.id} style={[styles.groupCard, { marginBottom: idx < GROUPS.length - 1 ? 12 : 0 }]}>
                <PixabayImage
                  query={getCommunityQuery(g.icon)}
                  style={{ width: 44, height: 44 }}
                  borderRadius={12}
                  resizeMode="cover"
                  fallbackIcon={g.icon}
                  fallbackColor={palette.mintLight}
                  accessibilityLabel={g.name}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.groupName}>{g.name}</Text>
                  <Text style={styles.groupCount}>
                    <MaterialCommunityIcons name="account-group-outline" size={12} color={palette.outline} />
                    {' '}{g.count} 人参与
                  </Text>
                </View>
                <Pressable
                  style={styles.joinBtn}
                  onPress={() => router.push('/grow')}
                >
                  <Text style={styles.joinBtnText}>加入</Text>
                </Pressable>
              </View>
            ))}

            {/* 社区影响力 */}
            <View style={styles.impactCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.impactLabel}>社区影响力</Text>
                <Text style={styles.impactValue}>~12.4t</Text>
                <Text style={styles.impactSub}>加入低碳小队，为地球减负。</Text>
              </View>
              <MaterialCommunityIcons name="pine-tree" size={64} color={palette.surfaceHigh} />
            </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: palette.surfaceVariant,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: palette.primary },
  bellBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: palette.surfaceLow,
    justifyContent: 'center', alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: palette.surfaceVariant,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: palette.surfaceContainer,
  },
  tabBtnActive: { backgroundColor: palette.primary },
  tabBtnText: { fontWeight: '600', fontSize: 14, color: palette.outline },
  tabBtnTextActive: { color: '#FFF' },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  editorialCard: {
    backgroundColor: '#163D34',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
  },
  editorialTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  editorialKicker: {
    color: '#BFEBD8',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
  },
  editorialTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '900',
    maxWidth: 280,
  },
  editorialSpark: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  editorialText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  editorialPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  editorialPill: {
    color: '#173D34',
    backgroundColor: '#D9F4E8',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '900',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceContainer,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: palette.onSurface },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: palette.mintCard,
  },
  filterChipActive: { backgroundColor: palette.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: palette.primary },
  filterChipTextActive: { color: '#FFF' },
  featuredBanner: {
    height: 200,
    borderRadius: 20,
    backgroundColor: '#1a2e1a',
    marginBottom: 24,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  featuredBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.primaryContainer,
    opacity: 0.7,
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1,
  },
  featuredContent: { padding: 16, zIndex: 2 },
  featuredBadge: {
    backgroundColor: palette.estimate,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  featuredBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  featuredTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  featuredSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: palette.onSurface },
  sectionCount: { fontSize: 13, color: palette.outline },
  articleCard: {
    flexDirection: 'row',
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.surfaceVariant,
  },
  articleThumb: {
    width: 100,
    backgroundColor: palette.mintLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleInfo: { flex: 1, padding: 14 },
  articleTitle: { fontSize: 15, fontWeight: '600', color: palette.onSurface, marginBottom: 4 },
  articleExcerpt: { fontSize: 12, color: palette.outline, lineHeight: 18, marginBottom: 8 },
  articleMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  articleMetaText: { fontSize: 11, color: palette.outline },
  articleTag: {
    backgroundColor: palette.mintCard,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  articleTagText: { fontSize: 10, color: palette.primary, fontWeight: '600' },
  // Community
  feedHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: palette.surfaceVariant,
  },
  feedHeaderTitle: { fontSize: 18, fontWeight: '800', color: palette.onSurface },
  feedHeaderSub: { color: palette.outline, fontSize: 12, marginTop: 3 },
  feedHeaderBtn: {
    backgroundColor: palette.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  feedHeaderBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  friendFeedList: { gap: 12, marginBottom: 24 },
  friendFeedCard: {
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.surfaceVariant,
  },
  friendFeedImage: { width: '100%', height: 150 },
  friendFeedBody: { padding: 14 },
  friendFeedTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  friendAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.mintCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarText: { color: palette.primary, fontWeight: '900' },
  friendName: { color: palette.onSurface, fontWeight: '800' },
  friendTime: { color: palette.outline, fontSize: 11, marginTop: 2 },
  friendKg: { color: palette.estimate, fontWeight: '900', fontSize: 13 },
  friendAction: { color: palette.primary, fontSize: 16, fontWeight: '900', marginTop: 12 },
  friendSummary: { color: palette.outline, lineHeight: 19, fontSize: 12, marginTop: 5 },
  friendEmptyCard: {
    alignItems: 'center',
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: palette.surfaceVariant,
  },
  friendEmptyTitle: { marginTop: 10, color: palette.onSurface, fontSize: 17, fontWeight: '800' },
  friendEmptySub: { marginTop: 6, color: palette.outline, textAlign: 'center', lineHeight: 19, fontSize: 12 },
  communityTitle: { fontSize: 26, fontWeight: '800', color: palette.onSurface, marginBottom: 4 },
  communitySubtitle: { fontSize: 14, color: palette.outline, marginBottom: 20 },
  challengeCard: {
    backgroundColor: palette.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },
  challengeLeafBg: { position: 'absolute', right: 16, top: -10 },
  challengeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  challengeBadgeText: { fontSize: 11, color: '#FFF', fontWeight: '600' },
  challengeTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', marginBottom: 16 },
  challengeProgressLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  challengeBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  challengeBarFill: { height: 6, backgroundColor: palette.mintCard, borderRadius: 3 },
  challengeBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  challengeBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: palette.surfaceVariant,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: palette.mintCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupName: { fontSize: 15, fontWeight: '600', color: palette.onSurface },
  groupCount: { fontSize: 12, color: palette.outline, marginTop: 2 },
  joinBtn: {
    backgroundColor: palette.mintCard,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  joinBtnText: { fontWeight: '600', color: palette.primary, fontSize: 13 },
  impactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceHigh,
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    overflow: 'hidden',
  },
  impactLabel: { fontSize: 12, color: palette.outline, textTransform: 'uppercase', letterSpacing: 0.5 },
  impactValue: {
    fontSize: 36,
    fontWeight: '800',
    color: palette.onSurface,
    letterSpacing: -1,
    marginVertical: 4,
  },
  impactSub: { fontSize: 12, color: palette.outline },
});
