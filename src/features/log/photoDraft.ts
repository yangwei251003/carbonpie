import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PendingPhotoDraft } from '@/features/log/types';

const PHOTO_DRAFT_KEY = 'carbonpie_pending_photo_draft_v1';

export async function savePendingPhotoDraft(draft: PendingPhotoDraft) {
  await AsyncStorage.setItem(PHOTO_DRAFT_KEY, JSON.stringify(draft));
}

export async function getPendingPhotoDraft(): Promise<PendingPhotoDraft | null> {
  const raw = await AsyncStorage.getItem(PHOTO_DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingPhotoDraft;
  } catch {
    return null;
  }
}

export async function clearPendingPhotoDraft() {
  await AsyncStorage.removeItem(PHOTO_DRAFT_KEY);
}
