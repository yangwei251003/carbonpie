import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { LogPhotoRecord, StoredLog } from '@/features/log/types';
import { behaviorTitle } from '@/lib/stats';
import { Platform } from 'react-native';

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function logsToCsv(logs: StoredLog[], photos: LogPhotoRecord[] = []): string {
  const photoMap = new Map(photos.map((photo) => [photo.log_client_id, photo]));
  const header = [
    'created_at',
    'type',
    'included_in_summary',
    'avoided_kg_co2e',
    'payload_json',
    'has_photo',
    'ai_category',
  ].join(',');
  const rows = logs.map((log) =>
    (() => {
      const photo = photoMap.get(log.client_id);
      return [
      csvEscape(log.created_at),
      csvEscape(log.type),
      csvEscape(String(log.included_in_summary)),
      csvEscape(String(log.avoided_kg_co2e)),
      csvEscape(JSON.stringify(log.payload)),
      csvEscape(String(Boolean(photo))),
      csvEscape(photo?.ai_category ?? ''),
    ].join(',');
    })(),
  );
  return [header, ...rows].join('\n');
}

export function logsToJson(logs: StoredLog[], photos: LogPhotoRecord[] = []): string {
  const photoMap = new Map(photos.map((photo) => [photo.log_client_id, photo]));
  const archive = logs.map((log) => ({
    ...log,
    photo: photoMap.get(log.client_id) ?? null,
  }));
  return JSON.stringify(archive, null, 2);
}

export async function shareUtf8Text(filename: string, content: string) {
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
    return;
  }

  const dir = FileSystem.cacheDirectory;
  if (!dir) {
    console.warn('cacheDirectory unavailable');
    return;
  }
  const path = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(path, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    console.warn('Sharing unavailable');
    return;
  }
  await Sharing.shareAsync(path, {
    mimeType: filename.endsWith('.csv') ? 'text/csv' : 'application/json',
    dialogTitle: filename,
  });
}

export function describeLogLine(log: StoredLog): string {
  const title = behaviorTitle(log.type);
  if (log.included_in_summary && log.avoided_kg_co2e > 0) {
    return `${title} · 约 ${log.avoided_kg_co2e} kg`;
  }
  return `${title}`;
}
