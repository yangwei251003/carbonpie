export type EditorialProviderConfig = {
  provider: 'siliconflow' | 'volcengine';
  baseUrl: string;
  textModel: string;
  imageModel: string;
  requiredEnv: string[];
  optionalEnv: string[];
};

export const recommendedEditorialConfig: EditorialProviderConfig = {
  provider: 'siliconflow',
  baseUrl: 'https://api.siliconflow.cn/v1',
  textModel: 'Qwen/Qwen3-8B',
  imageModel: 'Qwen/Qwen-Image',
  requiredEnv: ['SILICONFLOW_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
  optionalEnv: [
    'VOLCENGINE_ARK_API_KEY',
    'VOLCENGINE_ARK_ENDPOINT_ID',
    'NEWS_API_KEY',
    'TAVILY_API_KEY',
    'PEXELS_API_KEY',
    'PIXABAY_API_KEY',
    'CARBON_INTERFACE_API_KEY',
    'OPENAQ_API_KEY',
  ],
};

export const ARTICLE_GENERATION_PROMPT = `
你是 CarbonPie 的低碳百科主编。请把给定新闻、政策或主题改写成适合中学生和大学生阅读的中文科普文章。
要求：
1. 不编造来源、数字、政策名称；不确定就写“需查证”。
2. 输出 JSON：title, tag, summary, readingLevel, facts[], comicPanels[], paragraphs[], imagePrompt, sourceNote。
3. facts 用 3 条短知识点；comicPanels 用 3 格漫画分镜，每格包含 title/body/icon。
4. paragraphs 保持 3-5 段，每段 80-140 字，语气积极、具体、可行动。
5. imagePrompt 用适合生成封面图的英文提示词，风格为温暖、自然、百科插画。
`.trim();
