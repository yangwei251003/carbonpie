import type { BehaviorType } from '@/features/log/types';
import type { StoredLog } from '@/features/log/types';
import {
  eachDayOfInterval,
  endOfDay,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns';

export function weekInterval(now = new Date()) {
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const end = endOfWeek(now, { weekStartsOn: 1 });
  return { start, end };
}

export function sumIncludedAvoided(
  logs: StoredLog[],
  start: Date,
  end: Date,
): number {
  let sum = 0;
  for (const log of logs) {
    const t = parseISO(log.created_at);
    if (t < start || t > end) continue;
    if (!log.included_in_summary) continue;
    sum += log.avoided_kg_co2e;
  }
  return Math.round(sum * 10000) / 10000;
}

export function sumIncludedAvoidedToday(logs: StoredLog[], now = new Date()) {
  const start = startOfDay(now);
  const end = endOfDay(now);
  return sumIncludedAvoided(logs, start, end);
}

export function last7DaysIncludedSeries(logs: StoredLog[], now = new Date()) {
  const end = endOfDay(now);
  const start = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
  const days = eachDayOfInterval({ start, end });
  return days.map((day) => {
    const d0 = startOfDay(day);
    const d1 = endOfDay(day);
    const value = sumIncludedAvoided(logs, d0, d1);
    return {
      label: format(day, 'MM/dd'),
      value,
      date: day,
    };
  });
}

export function behaviorTitle(type: BehaviorType): string {
  switch (type) {
    case 'transport_bus':
      return '公交出行';
    case 'transport_metro':
      return '地铁出行';
    case 'bike':
      return '骑行';
    case 'walk':
      return '步行';
    case 'food_save':
      return '光盘 / 少浪费';
    case 'standby_off':
      return '关闭待机';
    case 'ac_habit':
      return '空调节能习惯';
    case 'virtue':
      return '好人好事';
    case 'mug':
      return '自带杯';
    default:
      return type;
  }
}
