import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const ARTICLE_PROMPT = `
你是 CarbonPie 的低碳百科主编，专门为中学生/大学生用户写有趣、有料、能直接用的低碳科普。
请基于给定资料写一篇关于【文章主题】的中文低碳科普。
只输出纯 JSON（不要任何 Markdown 包裹，不要解释）。字段：
slug, title, tag, summary, readingLevel, visualStyle, facts, comicPanels, paragraphs, imagePrompt, sourceNote。

【严格要求】：
- slug: 英文小写加连字符，唯一，附加当天日期后缀，例如 solar-energy-basics-2026-05-03。
- title: 吸引人的中文标题，15字以内，让人想点进去看。
- tag: 从"绿色能源/出行/节电/餐饮/回收/政策/新闻资讯/低碳生活"中选一个。
- summary: 两句话，说清楚这篇文章讲什么，有什么用。
- readingLevel: 例如"百科 · 3分钟"。
- facts: 3条极简知识点，每条20字以内，是让人"哇，原来如此"的惊奇事实。
- comicPanels: 【重要】这是给用户看的科普漫画，共3格，用3个具体场景讲解知识，绝对不能写"AI如何生成"等系统流程。每格结构：{"title":"场景名","body":"一句话解释发生了什么","icon":"MaterialCommunityIcons图标名"}。
- paragraphs: 3-5段正文，每段80-150字，要有具体数字/案例，语气轻松。
- imagePrompt: 必须使用【纯英文】的单词短语，描述适合做封面的场景，如 "green wind turbines solar panels nature"。绝对不能有中文！
- sourceNote: 来源说明，诚实说明数据来源，不确定的写"需查证"。
`.trim();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json; charset=utf-8' },
  });
}

/** Tavily 实时检索 */
async function tavilySearch(query: string): Promise<unknown[]> {
  const key = Deno.env.get('TAVILY_API_KEY');
  if (!key) return [];
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, max_results: 5, search_depth: 'basic', include_answer: false }),
    });
    const data = await res.json();
    return data.results ?? [];
  } catch { return []; }
}

/** Pixabay 封面图 */
async function fetchPixabayImageUrl(query: string): Promise<string | null> {
  const key = Deno.env.get('PIXABAY_API_KEY');
  if (!key) return null;
  try {
    // 防弹处理：如果包含中文，降级为纯正安全的环保关键词
    const safeQuery = /[\\u4e00-\\u9fa5]/.test(query) ? 'green energy nature ecology environment' : query;
    const params = new URLSearchParams({
      key,
      q: safeQuery.slice(0, 80),
      image_type: 'photo',
      orientation: 'horizontal',
      safesearch: 'true',
      per_page: '10',
    });
    const res = await fetch(`https://pixabay.com/api/?${params.toString()}`);
    const data = await res.json();
    return data.hits?.[0]?.webformatURL ?? null;
  } catch { return null; }
}

/** 硅基流动生成文章文本 */
async function generateArticle(topic: string, sources: unknown[]): Promise<Record<string, unknown>> {
  const key = Deno.env.get('SILICONFLOW_API_KEY');
  const baseUrl = Deno.env.get('SILICONFLOW_BASE_URL') ?? 'https://api.siliconflow.cn/v1';
  const model = Deno.env.get('SILICONFLOW_TEXT_MODEL') ?? 'Qwen/Qwen3-8B';
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: ARTICLE_PROMPT },
        { role: 'user', content: `文章主题：${topic}\n参考资料：${JSON.stringify(sources.slice(0, 3))}` },
      ],
    }),
  });
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '{}';
  try { return JSON.parse(content); } catch { return JSON.parse(content.replace(/```json|```/g, '').trim()); }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const cronSecret = Deno.env.get('CRON_SECRET');
    const headerSecret = req.headers.get('x-cron-secret');
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* ignore */ }

    const topic = (body.topic as string) || '低碳生活 可再生能源 环保政策 最新资讯';
    const publish = Boolean(body.publish ?? (cronSecret && headerSecret === cronSecret));

    // 1. 检索最新资讯
    const sources = await tavilySearch(topic);

    // 2. 生成文章文本
    const article = await generateArticle(topic, sources);

    // 3. 获取封面大图
    const heroImageUrl = await fetchPixabayImageUrl((article.imagePrompt as string) || 'green energy nature ecology');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ article, heroImageUrl, sources, saved: false });
    }

    // 4. 保存到 Supabase
    const supabase = createClient(supabaseUrl, serviceKey);
    const firstSource = (sources[0] ?? {}) as Record<string, unknown>;
    const row = {
      slug: article.slug as string,
      title: article.title as string,
      tag: article.tag,
      summary: article.summary,
      reading_level: article.readingLevel,
      visual_style: (article.visualStyle as string) ?? 'encyclopedia',
      hero_image_url: heroImageUrl,
      facts: Array.isArray(article.facts) ? article.facts : [],
      comic_panels: Array.isArray(article.comicPanels) ? article.comicPanels : [],
      paragraphs: Array.isArray(article.paragraphs) ? article.paragraphs : [],
      image_prompt: article.imagePrompt,
      source_note: article.sourceNote,
      source_url: firstSource.url,
      source_name: firstSource.title,
      status: publish ? 'published' : 'reviewing',
      generated_by: Deno.env.get('SILICONFLOW_TEXT_MODEL') ?? 'Qwen3-8B',
      generated_at: new Date().toISOString(),
      published_at: publish ? new Date().toISOString() : null,
    };

    const { error } = await supabase.from('ai_articles').upsert(row, { onConflict: 'slug' });
    if (error) throw error;

    return jsonResponse({ article: row, heroImageUrl, sources: sources.length, saved: true, published: publish });
  } catch (error) {
    console.error('[generate-ai-article]', error);
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
