// Pixabay 图片服务
// 文档: https://pixabay.com/api/docs/
import { PUBLIC_OFFLINE_DEMO } from '@/lib/publicDemo';

const PIXABAY_API_KEY = process.env.EXPO_PUBLIC_PIXABAY_API_KEY ?? '';
const PIXABAY_BASE_URL = 'https://pixabay.com/api/';

export type PixabayHit = {
  id: number;
  webformatURL: string;     // 适合 Web/App 展示的中等尺寸
  largeImageURL: string;    // 大图
  previewURL: string;       // 缩略图
  tags: string;
  user: string;
};

type PixabayResponse = {
  totalHits: number;
  hits: PixabayHit[];
};

// 各场景的搜索关键词映射
export const SCENE_QUERIES: Record<string, string> = {
  // 首页
  home_hero: 'green nature forest sunlight',
  home_garden: 'countryside village green landscape',

  // 发现/科普页 - Featured Banner
  discover_featured: 'forest trees sunlight carbon',
  discover_banner: 'sustainability environment nature green',

  // 文章分类缩略图
  article_green_energy: 'solar panel energy renewable',
  article_method: 'carbon footprint environment data',
  article_transport: 'bicycle cycling green commute',
  article_electricity: 'energy saving light bulb electricity',
  article_food: 'vegetarian food healthy plant',
  article_pv: 'solar rooftop panel house',
  article_storage: 'battery storage energy green',
  article_virtue: 'community volunteer helping nature',
  article_news: 'climate change summit environment news',
  article_default: 'nature ecology green',

  // 家园/花园
  garden_background: 'rural countryside peaceful landscape',
  garden_sprout: 'sprout seedling plant growing',
  garden_tree: 'tree growing green nature',

  // 社区挑战
  community_challenge: 'community team green environment',
  community_cycling: 'group cycling bike',
  community_food: 'vegetarian vegetable market',
  community_solar: 'solar energy installation',

  // 商品/市场
  market_coffee: 'eco coffee filter organic',
  market_tree: 'tree planting hands soil',
  market_bag: 'cotton tote bag eco sustainable',
  market_item: 'eco product sustainable green',
};

// 内存缓存，避免重复请求
const imageCache = new Map<string, string>();

/**
 * 从 Pixabay 搜索图片，返回最优质的一张的 URL
 */
export async function fetchPixabayImage(
  query: string,
  options: {
    imageType?: 'photo' | 'illustration' | 'vector';
    orientation?: 'horizontal' | 'vertical' | 'all';
    category?: string;
    minWidth?: number;
    minHeight?: number;
    index?: number; // 返回第几张（0-based）
  } = {},
): Promise<string | null> {
  if (PUBLIC_OFFLINE_DEMO || !PIXABAY_API_KEY) return null;
  const cacheKey = `${query}:${options.index ?? 0}`;

  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }

  try {
    const params = new URLSearchParams({
      key: PIXABAY_API_KEY,
      q: query,
      image_type: options.imageType ?? 'photo',
      orientation: options.orientation ?? 'horizontal',
      safesearch: 'true',
      per_page: '10',
      lang: 'en',
      min_width: String(options.minWidth ?? 400),
      min_height: String(options.minHeight ?? 300),
    });

    if (options.category) {
      params.set('category', options.category);
    }

    const response = await fetch(`${PIXABAY_BASE_URL}?${params.toString()}`);
    if (!response.ok) throw new Error(`Pixabay API error: ${response.status}`);

    const data: PixabayResponse = await response.json();
    const idx = options.index ?? 0;
    const hit = data.hits[idx] ?? data.hits[0];

    if (!hit) return null;

    const url = hit.webformatURL;
    imageCache.set(cacheKey, url);
    return url;
  } catch (error) {
    console.warn('[Pixabay] Failed to fetch image:', query, error);
    return null;
  }
}

/**
 * 批量预取多个场景的图片
 */
export async function prefetchImages(sceneKeys: (keyof typeof SCENE_QUERIES)[]): Promise<void> {
  await Promise.allSettled(
    sceneKeys.map((key) => fetchPixabayImage(SCENE_QUERIES[key]!))
  );
}

/**
 * 根据文章 tag 获取对应的搜索词
 */
export function getArticleQuery(tag?: string): string {
  const tagMap: Record<string, string> = {
    '绿色能源': SCENE_QUERIES.article_green_energy!,
    '方法学': SCENE_QUERIES.article_method!,
    '出行': SCENE_QUERIES.article_transport!,
    '节电': SCENE_QUERIES.article_electricity!,
    '餐饮': SCENE_QUERIES.article_food!,
    '美德': SCENE_QUERIES.article_virtue!,
    '传播': SCENE_QUERIES.article_default!,
    '新闻资讯': SCENE_QUERIES.article_news!,
  };
  return tagMap[tag ?? ''] ?? SCENE_QUERIES.article_default!;
}

/**
 * 根据装饰物 ID 获取对应的搜索词
 */
export function getDecorQuery(decorId: string): string {
  const decorMap: Record<string, string> = {
    tree: 'green tree forest',
    pv: 'solar panel energy renewable',
    bike_rack: 'bicycle rack station',
    wind: 'wind turbine energy renewable',
    pond: 'water pond garden nature',
    bench: 'wooden bench park garden',
    hive: 'bee hive garden nature',
    hub: 'eco house sustainable home',
  };
  return decorMap[decorId] ?? SCENE_QUERIES.article_default!;
}
/**
 * 根据社区项目 ID 或类型获取对应的搜索词
 */
export function getCommunityQuery(itemId: string): string {
  const map: Record<string, string> = {
    '1': SCENE_QUERIES.community_challenge!, // 7天零废弃
    'bicycle': SCENE_QUERIES.community_cycling!,
    'food-apple': SCENE_QUERIES.community_food!,
    'solar-power': SCENE_QUERIES.community_solar!,
  };
  return map[itemId] ?? SCENE_QUERIES.article_default!;
}
