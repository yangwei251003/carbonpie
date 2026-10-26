import { loadAiApiKey, VISION_MODEL } from '@/features/ai/service';
import type { PhotoCheckinCategory, PhotoInsight } from '@/features/log/types';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type PreparedCheckinPhoto = {
  uri: string;
  source: 'camera' | 'library';
  mimeType: string;
  dataUrl?: string;
};

const CHECKIN_DIR = `${FileSystem.documentDirectory ?? ''}carbonpie-checkins/`;
const FALLBACK_INSIGHT: PhotoInsight = {
  category: 'unknown',
  title: '已记录这次绿色瞬间',
  summary: '照片已经保存成功，你可以继续手动选择分类并补充本次低碳记录。',
  encouragement: '每一次愿意记录的行动，都会让低碳生活更容易坚持下去。',
  confidence: 'low',
  tags: ['拍照打卡', '待补充'],
};

const CATEGORY_HINTS: PhotoCheckinCategory[] = [
  'transport_bus',
  'transport_metro',
  'bike',
  'walk',
  'food_save',
  'standby_off',
  'ac_habit',
  'mug',
  'virtue',
  'unknown',
];

function fileExtensionFromAsset(asset: ImagePicker.ImagePickerAsset) {
  const byMime = asset.mimeType?.split('/')[1];
  if (byMime) return byMime.replace('jpeg', 'jpg');
  const match = asset.fileName?.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1] ?? 'jpg';
}

async function ensureCheckinDir() {
  if (!CHECKIN_DIR) return;
  const info = await FileSystem.getInfoAsync(CHECKIN_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CHECKIN_DIR, { intermediates: true });
  }
}

async function persistAsset(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  if (Platform.OS === 'web' || !CHECKIN_DIR) return asset.uri;
  await ensureCheckinDir();
  const ext = fileExtensionFromAsset(asset);
  const target = `${CHECKIN_DIR}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await FileSystem.copyAsync({ from: asset.uri, to: target });
  return target;
}

async function dataUrlFromAsset(asset: ImagePicker.ImagePickerAsset, uri: string) {
  if (asset.base64) {
    const mimeType = asset.mimeType || 'image/jpeg';
    return `data:${mimeType};base64,${asset.base64}`;
  }
  if (Platform.OS === 'web') {
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return base64;
  }
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:${asset.mimeType || 'image/jpeg'};base64,${base64}`;
}

async function openPicker(
  source: 'camera' | 'library',
): Promise<ImagePicker.ImagePickerResult> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error('需要相机权限后才能拍照打卡。');
    }
    return ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsEditing: true,
      aspect: [4, 3],
      base64: true,
    });
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('需要相册权限后才能选择图片。');
  }
  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.75,
    allowsEditing: true,
    aspect: [4, 3],
    base64: true,
    selectionLimit: 1,
  });
}

export async function captureCheckinPhoto(
  source: 'camera' | 'library',
): Promise<PreparedCheckinPhoto | null> {
  const result = await openPicker(source);
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const uri = await persistAsset(asset);
  return {
    uri,
    source,
    mimeType: asset.mimeType || 'image/jpeg',
    dataUrl: await dataUrlFromAsset(asset, uri),
  };
}

function parseJsonBlock(raw: string) {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  const plain = fenced?.[1] ?? raw;
  return JSON.parse(plain.trim());
}

function normalizeCategory(raw: string): PhotoCheckinCategory {
  return CATEGORY_HINTS.includes(raw as PhotoCheckinCategory)
    ? (raw as PhotoCheckinCategory)
    : 'unknown';
}

function normalizeConfidence(raw: string): PhotoInsight['confidence'] {
  if (raw === 'high' || raw === 'medium' || raw === 'low') return raw;
  return 'low';
}

function normalizeInsight(candidate: Partial<PhotoInsight> | null | undefined): PhotoInsight {
  if (!candidate) return FALLBACK_INSIGHT;
  return {
    category: normalizeCategory(String(candidate.category || 'unknown')),
    title: String(candidate.title || FALLBACK_INSIGHT.title).slice(0, 40),
    summary: String(candidate.summary || FALLBACK_INSIGHT.summary).slice(0, 120),
    encouragement: String(candidate.encouragement || FALLBACK_INSIGHT.encouragement).slice(0, 120),
    confidence: normalizeConfidence(String(candidate.confidence || 'low')),
    tags: Array.isArray(candidate.tags)
      ? candidate.tags.map((tag) => String(tag).slice(0, 12)).filter(Boolean).slice(0, 4)
      : FALLBACK_INSIGHT.tags,
  };
}

export async function analyzeCheckinPhoto(
  photo: PreparedCheckinPhoto,
): Promise<{ insight: PhotoInsight; usedAi: boolean }> {
  const apiKey = await loadAiApiKey();
  if (!apiKey || !photo.dataUrl) {
    return { insight: FALLBACK_INSIGHT, usedAi: false };
  }

  const prompt = [
    '你是环保记录 App 的图像识别助手。',
    '请根据图片判断它最可能对应哪一种低碳打卡分类，只能返回 JSON。',
    `分类枚举：${CATEGORY_HINTS.join(', ')}`,
    '返回字段：category,title,summary,encouragement,confidence,tags。',
    '要求：',
    '1. 不确定时 category 返回 unknown。',
    '2. title 用 8-16 个中文概括场景。',
    '3. summary 用 1 句话描述看到的低碳行为线索，不要编造不可见细节。',
    '4. encouragement 用积极、温和、鼓励的中文短句。',
    '5. confidence 只能是 high、medium、low。',
    '6. tags 返回 2-4 个简短中文标签。',
  ].join('\n');

  try {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: photo.dataUrl } },
            ],
          },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return { insight: FALLBACK_INSIGHT, usedAi: false };
    }
    return {
      insight: normalizeInsight(parseJsonBlock(String(content))),
      usedAi: true,
    };
  } catch {
    return { insight: FALLBACK_INSIGHT, usedAi: false };
  }
}
