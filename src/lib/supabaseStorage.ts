import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

export const PHOTO_BUCKET = 'checkin-photos';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = base64.replace(/=+$/, '');
  let output = '';
  for (
    let bc = 0, bs: number | undefined, buffer: number, idx = 0;
    (buffer = str.charAt(idx++) ? chars.indexOf(str.charAt(idx - 1)) : 0) !== 64;
  ) {
    if (buffer === -1) continue;
    bs = bc % 4 ? (bs! * 64) + buffer : buffer;
    if (bc++ % 4) {
      output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  const bytes = new Uint8Array(output.length);
  for (let i = 0; i < output.length; i += 1) {
    bytes[i] = output.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function fileUriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    return response.arrayBuffer();
  }
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToArrayBuffer(base64);
}

export async function uploadPhotoToCloud(
  userId: string,
  photoId: string,
  localUri: string,
  contentType = 'image/jpeg',
): Promise<{ storagePath: string; publicUrl: string }> {
  const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
  const storagePath = `${userId}/${photoId}.${ext}`;
  const payload = await fileUriToArrayBuffer(localUri);
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(storagePath, payload, {
      contentType,
      upsert: true,
    });
  if (error) {
    throw error;
  }
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(storagePath);
  return {
    storagePath,
    publicUrl: data.publicUrl,
  };
}

export function getPhotoPublicUrl(storagePath: string): string {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}
