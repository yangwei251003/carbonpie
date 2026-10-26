import AsyncStorage from '@react-native-async-storage/async-storage';
import { PUBLIC_OFFLINE_DEMO } from '@/lib/publicDemo';

// 智谱 AI (ZhipuAI / BigModel) 服务
// API文档: https://bigmodel.cn/dev/api
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const DEFAULT_MODEL = 'glm-4-flash'; // 最快最省，免费额度大
export const VISION_MODEL = 'glm-4v-flash';
export const AI_KEY_STORAGE = 'carbonpie_zhipu_api_key';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export async function loadAiApiKey(): Promise<string> {
  if (PUBLIC_OFFLINE_DEMO) return '';
  const saved = await AsyncStorage.getItem(AI_KEY_STORAGE);
  return (saved || process.env.EXPO_PUBLIC_AI_API_KEY || '').trim();
}

const SYSTEM_PROMPT = `你是"碳派助手"，一个专注于节能减排、绿色低碳生活的智能问答助手，由碳派（CarbonPie）App 提供。

你的职责：
1. 解答关于低碳生活、节能减排、碳足迹计算的各类问题
2. 提供实用的绿色生活建议和环保小技巧
3. 科普气候变化、碳中和、可再生能源等知识
4. 鼓励用户践行绿色低碳生活方式

回答风格：
- 友好、亲切、鼓励性的语气
- 提供具体可操作的建议
- 数据准确，对估算值明确说明是估算
- 回答简洁有力，避免冗长
- 适当使用 emoji 让回答更生动`;

export async function askAI(messages: ChatMessage[], apiKey: string): Promise<string> {
  if (PUBLIC_OFFLINE_DEMO) throw new Error('公开演示未接入远程 AI，请勿填写真实密钥。');
  if (!apiKey || !apiKey.trim()) {
    throw new Error('请先配置智谱 API Key（在"我的"页面点击 AI 助手进入设置）');
  }

  try {
    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1024,
        stream: false,
      }),
    });

    if (!response.ok) {
      let errMsg = `HTTP ${response.status}`;
      try {
        const errData = await response.json();
        errMsg = errData?.error?.message || errMsg;
      } catch { /* ignore */ }
      throw new Error(`AI 请求失败: ${errMsg}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI 返回了空回复');
    return content;
  } catch (error: any) {
    console.error('[CarbonPie AI]', error);
    throw error;
  }
}
