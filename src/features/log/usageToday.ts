import type { StoredLog } from '@/features/log/types';
import {
  endOfDay,
  isWithinInterval,
  parseISO,
  startOfDay,
} from 'date-fns';

function dayBounds(d: Date) {
  return { start: startOfDay(d), end: endOfDay(d) };
}

/** 基于列表估算今日已计入汇总口径（写入本条之前） */
export function computeTodayUsageBeforeInsert(
  logs: StoredLog[],
  now: Date = new Date(),
): {
  transportKmIncludedToday: number;
  standbyIncludedCountToday: number;
} {
  const { start, end } = dayBounds(now);
  let transportKmIncludedToday = 0;
  let standbyIncludedCountToday = 0;

  for (const log of logs) {
    const t = parseISO(log.created_at);
    if (!isWithinInterval(t, { start, end })) continue;
    if (!log.included_in_summary) continue;

    if (
      log.type === 'transport_bus' ||
      log.type === 'transport_metro' ||
      log.type === 'bike' ||
      log.type === 'walk'
    ) {
      if (log.payload.mode === 'transport') {
        transportKmIncludedToday +=
          Number(log.payload.km) * (log.payload.roundTrip ? 2 : 1);
      }
    }
    if (log.type === 'standby_off') {
      standbyIncludedCountToday += 1;
    }
  }

  return { transportKmIncludedToday, standbyIncludedCountToday };
}
