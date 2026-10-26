import type { Article } from '@/content/articles';
import { supabase, supabaseConfigured } from '@/lib/supabase';

type AiArticleRow = {
  slug: string;
  title: string;
  tag: string | null;
  summary: string | null;
  reading_level: string | null;
  visual_style: Article['visualStyle'] | null;
  hero_image_url: string | null;
  facts: string[] | null;
  comic_panels: Article['comicPanels'] | null;
  paragraphs: string[] | null;
  source_note: string | null;
  published_at: string | null;
};

function normalizeAiArticle(row: AiArticleRow): Article {
  return {
    slug: row.slug,
    title: row.title,
    tag: row.tag ?? 'AI科普',
    summary: row.summary ?? undefined,
    readingLevel: row.reading_level ?? 'AI 更新 · 3分钟',
    visualStyle: row.visual_style ?? 'encyclopedia',
    heroImageUrl: row.hero_image_url ?? undefined,
    facts: Array.isArray(row.facts) ? row.facts : [],
    comicPanels: Array.isArray(row.comic_panels) ? row.comic_panels : [],
    sourceNote: row.source_note ?? undefined,
    paragraphs: Array.isArray(row.paragraphs) && row.paragraphs.length > 0 ? row.paragraphs : ['这篇 AI 科普文章正在整理中。'],
  };
}

export async function fetchPublishedAiArticles(): Promise<Article[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase
    .from('ai_articles')
    .select('slug,title,tag,summary,reading_level,visual_style,hero_image_url,facts,comic_panels,paragraphs,source_note,published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20);

  if (error || !data) return [];
  return (data as AiArticleRow[]).map(normalizeAiArticle);
}

export async function fetchPublishedAiArticleBySlug(slug: string): Promise<Article | null> {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase
    .from('ai_articles')
    .select('slug,title,tag,summary,reading_level,visual_style,hero_image_url,facts,comic_panels,paragraphs,source_note,published_at')
    .eq('status', 'published')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) return null;
  return normalizeAiArticle(data as AiArticleRow);
}
