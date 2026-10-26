import { fetchPixabayImage, getArticleQuery, SCENE_QUERIES } from '@/features/images/pixabay';
import { useEffect, useState } from 'react';

/**
 * 通用 Pixabay 图片 Hook
 * 返回 { uri, loading, error }
 */
export function usePixabayImage(
  query: string,
  options?: { index?: number; orientation?: 'horizontal' | 'vertical' | 'all' },
) {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPixabayImage(query, {
      index: options?.index ?? 0,
      orientation: options?.orientation ?? 'horizontal',
    })
      .then((url) => {
        if (!cancelled) {
          setUri(url);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [query]);

  return { uri, loading, error };
}

/**
 * 场景图片 Hook — 通过 sceneKey 名称直接使用预定义查询
 */
export function useSceneImage(
  sceneKey: keyof typeof SCENE_QUERIES,
  options?: { index?: number; orientation?: 'horizontal' | 'vertical' | 'all' },
) {
  const query = SCENE_QUERIES[sceneKey]!;
  return usePixabayImage(query, options);
}

/**
 * 文章缩略图 Hook — 根据 tag 自动匹配搜索词
 */
export function useArticleImage(tag?: string, index: number = 0) {
  const query = getArticleQuery(tag);
  return usePixabayImage(query, { index });
}

/**
 * 多张图片 Hook — 返回多个 URI 数组
 */
export function useMultiPixabayImages(queries: string[]) {
  const [uris, setUris] = useState<(string | null)[]>(queries.map(() => null));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.allSettled(
      queries.map((q) => fetchPixabayImage(q))
    ).then((results) => {
      if (!cancelled) {
        setUris(results.map((r) => (r.status === 'fulfilled' ? r.value : null)));
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [JSON.stringify(queries)]);

  return { uris, loading };
}
