import type { BehaviorType } from '@/features/log/types';
import {
  format,
  isWithinInterval,
  parseISO,
  startOfWeek,
  endOfWeek,
  subDays,
} from 'date-fns';
import {
  getHomesteadRow,
  listLogs,
  updateHomesteadRow,
  ensureHomesteadRow,
  getDailyTaskDone,
  setDailyTaskDone,
  type HomesteadRow,
} from '@/lib/db';

export const HOMESTEAD_XP_PER_LEVEL = 380;
export const DAILY_LOG_XP_CAP = 260;
export const SINGLE_EVENT_XP_CAP = 95;

export const TASK_KEYS = ['log_once', 'read_article', 'like_post'] as const;
export type TaskKey = (typeof TASK_KEYS)[number];

export type PlotStages = [number, number, number];

export type HomesteadDistrict = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  theme: string;
  unlocked: boolean;
  level: number;
  capacity: string;
  yieldLabel: string;
  status: string;
  unlockHint: string;
};

export type HomesteadOpportunity = {
  id: string;
  title: string;
  subtitle: string;
  reward: string;
  status: 'ready' | 'locked' | 'progress';
};

export type HomesteadOverview = {
  ecoProsperity: number;
  vitality: number;
  weeklyCarbon: number;
  weeklyVisitors: number;
  dailyCoinsForecast: number;
  districtLevel: number;
  canopyPercent: number;
  nextUnlockLabel: string;
};

export type HomesteadFarmPlot = {
  id: string;
  index: number;
  name: string;
  crop: string;
  stage: number;
  stageLabel: string;
  progress: number;
  ready: boolean;
  harvestedToday: boolean;
  rewardCoins: number;
  rewardXp: number;
  icon: string;
};

type LogSlice = {
  created_at: string;
  avoided_kg_co2e: number;
  included_in_summary: number;
};

export function levelFromXp(xp: number): number {
  return Math.min(99, Math.floor(xp / HOMESTEAD_XP_PER_LEVEL) + 1);
}

export function derivePlotStages(logsMineWeekIncluded: LogSlice[]): PlotStages {
  const distinctDays = new Set<string>();
  let kg = 0;
  for (const log of logsMineWeekIncluded) {
    if (!log.included_in_summary || log.avoided_kg_co2e <= 0) continue;
    const d = parseISO(log.created_at);
    distinctDays.add(format(d, 'yyyy-MM-dd'));
    kg += log.avoided_kg_co2e;
  }
  const score = distinctDays.size * 26 + Math.floor(kg * 38);
  const stages: PlotStages = [
    Math.min(2, Math.floor(score / 42)),
    Math.min(2, Math.floor(score / 72)),
    Math.min(2, Math.floor(score / 108)),
  ];
  return stages;
}

export function logsThisWeekMine(userId: string): LogSlice[] {
  const ws = startOfWeek(new Date(), { weekStartsOn: 1 });
  const we = endOfWeek(new Date(), { weekStartsOn: 1 });
  return listLogs(1200).filter((l) => {
    if (l.user_id !== userId) return false;
    const t = parseISO(l.created_at);
    return isWithinInterval(t, { start: ws, end: we });
  });
}

export function decorCatalog(row: HomesteadRow | null): { id: string; label: string; price: number; unlocked: boolean }[] {
  const items = [
    { id: 'tree', label: '小树', price: 0 },
    { id: 'pv', label: '光伏板', price: 100 },
    { id: 'bike_rack', label: '骑行驿站', price: 250 },
    { id: 'wind', label: '风车', price: 400 },
    { id: 'pond', label: '雨水花园', price: 600 },
    { id: 'bench', label: '休憩长椅', price: 800 },
    { id: 'hive', label: '昆虫旅馆', price: 1000 },
    { id: 'hub', label: '低碳小屋', price: 1500 },
  ];
  const owned = row?.owned_decors ? row.owned_decors.split(',') : ['tree'];
  return items.map((it) => ({
    ...it,
    unlocked: owned.includes(it.id),
  }));
}

function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function yesterdayStr(): string {
  return format(subDays(new Date(), 1), 'yyyy-MM-dd');
}

export function rewardAfterLogSaved(
  userId: string,
  params: {
    avoidedKg: number;
    includedInSummary: boolean;
    type: BehaviorType;
  },
): { gained: number; note?: string } {
  ensureHomesteadRow(userId);
  const row = getHomesteadRow(userId);
  if (!row) return { gained: 0 };

  let raw = 0;
  if (params.type === 'virtue') {
    raw = 22;
  } else if (params.type === 'mug') {
    raw = 12;
  } else if (params.includedInSummary && params.avoidedKg > 0) {
    raw = Math.round(params.avoidedKg * 105);
    raw = Math.min(SINGLE_EVENT_XP_CAP, Math.max(10, raw));
  } else {
    return { gained: 0, note: '本条未计入家园经验（或无可用减排估算）。' };
  }

  const d = todayStr();
  let awardDate = row.award_date;
  let todayAwarded = row.today_awarded;
  if (awardDate !== d) {
    awardDate = d;
    todayAwarded = 0;
  }

  const room = Math.max(0, DAILY_LOG_XP_CAP - todayAwarded);
  const gained = Math.min(raw, room);
  const nextXp = row.xp + gained;
  const nextLevel = levelFromXp(nextXp);
  const coinsGained = gained; // 1 XP = 1 Coin for logging
  const nextCoins = row.carbon_coins + coinsGained;

  updateHomesteadRow(userId, {
    xp: nextXp,
    level: nextLevel,
    award_date: awardDate,
    today_awarded: todayAwarded + gained,
    carbon_coins: nextCoins,
    tasks_bonus_date: row.tasks_bonus_date,
    checkin_date: row.checkin_date,
    checkin_streak: row.checkin_streak,
    equipped_decor: row.equipped_decor,
  });

  const note =
    gained < raw ? `今日经验额度已满一部分，已获得 ${gained}/${raw} XP。` : undefined;
  return { gained, note };
}

export function applyTasksBonusIfEligible(userId: string): number {
  ensureHomesteadRow(userId);
  const row = getHomesteadRow(userId);
  if (!row) return 0;
  const d = todayStr();
  if (row.tasks_bonus_date === d) return 0;

  let ok = true;
  for (const k of TASK_KEYS) {
    if (!getDailyTaskDone(userId, d, k)) {
      ok = false;
      break;
    }
  }
  if (!ok) return 0;

  const bonus = 48;
  const coinsBonus = 50; // Task bonus gives 50 coins
  const nextXp = row.xp + bonus;
  updateHomesteadRow(userId, {
    xp: nextXp,
    level: levelFromXp(nextXp),
    award_date: row.award_date,
    today_awarded: row.today_awarded,
    tasks_bonus_date: d,
    carbon_coins: row.carbon_coins + coinsBonus,
    checkin_date: row.checkin_date,
    checkin_streak: row.checkin_streak,
    equipped_decor: row.equipped_decor,
  });
  return bonus;
}

export function homesteadCheckinStatus(userId: string): {
  checkedInToday: boolean;
  streak: number;
  todayRewardXp: number;
} {
  ensureHomesteadRow(userId);
  const row = getHomesteadRow(userId);
  const d = todayStr();
  const checkedInToday = row?.checkin_date === d;
  const streak = row?.checkin_streak ?? 0;
  const todayRewardXp = Math.min(36, 12 + Math.min(5, streak) * 4);
  return { checkedInToday, streak, todayRewardXp };
}

export function refreshHomesteadForToday(userId: string): HomesteadRow | null {
  ensureHomesteadRow(userId);
  const row = getHomesteadRow(userId);
  if (!row) return null;
  const d = todayStr();
  const owned = row.owned_decors ? row.owned_decors.split(',').filter(Boolean) : [];
  const patch: Partial<Omit<HomesteadRow, 'user_id'>> = {};

  if (!owned.includes('tree')) {
    patch.owned_decors = Array.from(new Set(['tree', ...owned])).join(',');
  }
  if (!row.equipped_decor) {
    patch.equipped_decor = 'tree';
  }
  if (row.last_interact_date !== d) {
    patch.cleanliness = Math.max(52, row.cleanliness - 16);
    patch.happiness = Math.max(58, row.happiness - 14);
    patch.clean_count = 0;
    patch.water_count = 0;
    patch.last_interact_date = d;
  }

  if (Object.keys(patch).length > 0) {
    updateHomesteadRow(userId, patch);
    return getHomesteadRow(userId);
  }
  return row;
}

/** 每日打卡：每天一次，连签 + XP。 */
export function claimDailyCheckin(userId: string): { gained: number; streak: number; already: boolean } {
  ensureHomesteadRow(userId);
  const row = getHomesteadRow(userId);
  if (!row) return { gained: 0, streak: 0, already: false };
  const d = todayStr();
  if (row.checkin_date === d) return { gained: 0, streak: row.checkin_streak, already: true };

  const y = yesterdayStr();
  const continued = row.checkin_date === y;
  const nextStreak = continued ? Math.min(365, row.checkin_streak + 1) : 1;
  const gained = Math.min(36, 12 + Math.min(5, nextStreak) * 4);
  const coinsGained = gained;

  const nextXp = row.xp + gained;
  updateHomesteadRow(userId, {
    xp: nextXp,
    level: levelFromXp(nextXp),
    award_date: row.award_date,
    today_awarded: row.today_awarded,
    tasks_bonus_date: row.tasks_bonus_date,
    checkin_date: d,
    checkin_streak: nextStreak,
    carbon_coins: row.carbon_coins + coinsGained,
    equipped_decor: row.equipped_decor,
  });

  return { gained, streak: nextStreak, already: false };
}

export function buyAndEquipDecor(userId: string, decorId: string): { success: boolean; msg?: string } {
  ensureHomesteadRow(userId);
  const row = getHomesteadRow(userId);
  if (!row) return { success: false };

  const catalog = decorCatalog(row);
  const item = catalog.find((i) => i.id === decorId);
  if (!item) return { success: false, msg: '商品不存在' };

  if (item.unlocked) {
    updateHomesteadRow(userId, { equipped_decor: decorId });
    return { success: true };
  }

  if (row.carbon_coins < item.price) {
    return { success: false, msg: '碳币不足' };
  }

  const owned = row.owned_decors ? row.owned_decors.split(',') : ['tree'];
  owned.push(decorId);

  updateHomesteadRow(userId, {
    carbon_coins: row.carbon_coins - item.price,
    owned_decors: owned.join(','),
    equipped_decor: decorId,
  });
  return { success: true };
}

export function interactWithHome(userId: string, action: 'clean' | 'water'): { success: boolean; msg: string; gainedXp: number; gainedCoins: number } {
  ensureHomesteadRow(userId);
  const row = getHomesteadRow(userId);
  if (!row) return { success: false, msg: '获取家园失败', gainedXp: 0, gainedCoins: 0 };

  const d = todayStr();
  let cleanCount = row.clean_count;
  let waterCount = row.water_count;
  if (row.last_interact_date !== d) {
    cleanCount = 0;
    waterCount = 0;
  }

  const LIMIT = 3;

  if (action === 'clean') {
    if (cleanCount >= LIMIT) return { success: false, msg: '今天打扫次数已达上限', gainedXp: 0, gainedCoins: 0 };
    if (row.cleanliness >= 100) return { success: false, msg: '家园已经很干净啦', gainedXp: 0, gainedCoins: 0 };
    
    const nextClean = Math.min(100, row.cleanliness + 20);
    const bonusXp = 5;
    const bonusCoins = 5;
    const nextXp = row.xp + bonusXp;
    updateHomesteadRow(userId, {
      cleanliness: nextClean,
      xp: nextXp,
      level: levelFromXp(nextXp),
      carbon_coins: row.carbon_coins + bonusCoins,
      last_interact_date: d,
      clean_count: cleanCount + 1,
      water_count: waterCount,
    });
    return { success: true, msg: `打扫完成！家园焕然一新 (今日 ${cleanCount + 1}/${LIMIT})`, gainedXp: bonusXp, gainedCoins: bonusCoins };
  } else {
    if (waterCount >= LIMIT) return { success: false, msg: '今天浇水次数已达上限', gainedXp: 0, gainedCoins: 0 };
    if (row.happiness >= 100) return { success: false, msg: '植物们已经很开心啦', gainedXp: 0, gainedCoins: 0 };
    
    const nextHappy = Math.min(100, row.happiness + 20);
    const bonusXp = 5;
    const bonusCoins = 5;
    const nextXp = row.xp + bonusXp;
    updateHomesteadRow(userId, {
      happiness: nextHappy,
      xp: nextXp,
      level: levelFromXp(nextXp),
      carbon_coins: row.carbon_coins + bonusCoins,
      last_interact_date: d,
      clean_count: cleanCount,
      water_count: waterCount + 1,
    });
    return { success: true, msg: `浇水完成！植物茁壮成长 (今日 ${waterCount + 1}/${LIMIT})`, gainedXp: bonusXp, gainedCoins: bonusCoins };
  }
}

export function markDailyTask(userId: string, key: TaskKey): boolean {
  const d = todayStr();
  if (getDailyTaskDone(userId, d, key)) return false;
  setDailyTaskDone(userId, d, key, true);
  applyTasksBonusIfEligible(userId);
  return true;
}

export function dailyTaskSnapshot(userId: string): Record<TaskKey, boolean> {
  const d = todayStr();
  return {
    log_once: getDailyTaskDone(userId, d, 'log_once'),
    read_article: getDailyTaskDone(userId, d, 'read_article'),
    like_post: getDailyTaskDone(userId, d, 'like_post'),
  };
}

function harvestTaskKey(index: number) {
  return `harvest_plot_${index}`;
}

export function deriveFarmPlots(userId: string, stages: PlotStages): HomesteadFarmPlot[] {
  const d = todayStr();
  const names = ['晨露苗床', '林下果圃', '共生树岛'] as const;
  const crops = ['低碳树苗', '循环果蔬', '共生林木'] as const;
  return stages.map((stage, index) => {
    const harvestedToday = getDailyTaskDone(userId, d, harvestTaskKey(index));
    const ready = stage >= 2 && !harvestedToday;
    const progress = stage <= 0 ? 22 : stage === 1 ? 62 : 100;
    return {
      id: harvestTaskKey(index),
      index,
      name: names[index],
      crop: crops[index],
      stage,
      stageLabel: harvestedToday ? '今日已收获' : stage >= 2 ? '成熟可收' : stage === 1 ? '成长中' : '待播种',
      progress,
      ready,
      harvestedToday,
      rewardCoins: 18 + index * 8,
      rewardXp: 8 + index * 4,
      icon: harvestedToday ? 'basket-check' : stage >= 2 ? 'tree' : stage === 1 ? 'sprout' : 'seed-outline',
    };
  }) as HomesteadFarmPlot[];
}

export function harvestFarmPlot(
  userId: string,
  plot: HomesteadFarmPlot,
): { success: boolean; msg: string; gainedCoins: number; gainedXp: number } {
  ensureHomesteadRow(userId);
  const row = getHomesteadRow(userId);
  if (!row) return { success: false, msg: '家园加载失败', gainedCoins: 0, gainedXp: 0 };
  const d = todayStr();
  if (!plot.ready) {
    return {
      success: false,
      msg: plot.harvestedToday ? '这块地今天已经收过啦' : '作物还没成熟，先完成低碳记录或浇水吧',
      gainedCoins: 0,
      gainedXp: 0,
    };
  }

  const nextXp = row.xp + plot.rewardXp;
  setDailyTaskDone(userId, d, harvestTaskKey(plot.index), true);
  updateHomesteadRow(userId, {
    xp: nextXp,
    level: levelFromXp(nextXp),
    carbon_coins: row.carbon_coins + plot.rewardCoins,
    happiness: Math.min(100, row.happiness + 4),
  });
  return {
    success: true,
    msg: `${plot.name} 收获完成，获得 ${plot.rewardCoins} 碳币`,
    gainedCoins: plot.rewardCoins,
    gainedXp: plot.rewardXp,
  };
}

export function deriveHomesteadOverview(
  row: HomesteadRow | null,
  weekLogs: LogSlice[],
  plots: PlotStages,
): HomesteadOverview {
  const weeklyCarbon = weekLogs.reduce((sum, item) => {
    if (!item.included_in_summary || item.avoided_kg_co2e <= 0) return sum;
    return sum + item.avoided_kg_co2e;
  }, 0);
  const treeStages = plots.reduce((sum, value) => sum + value, 0);
  const vitality = Math.round(((row?.cleanliness ?? 100) + (row?.happiness ?? 100)) / 2);
  const canopyPercent = Math.min(100, 18 + treeStages * 14 + Math.floor(weeklyCarbon * 7));
  const ecoProsperity = Math.min(
    100,
    Math.round(vitality * 0.45 + Math.min(100, weeklyCarbon * 16) * 0.35 + canopyPercent * 0.2),
  );
  const districtLevel = Math.max(1, Math.floor(((row?.level ?? 1) + treeStages) / 2));
  const weeklyVisitors = Math.max(6, Math.round(weeklyCarbon * 5 + vitality / 8 + districtLevel * 3));
  const dailyCoinsForecast = Math.round(districtLevel * 8 + treeStages * 6 + weeklyCarbon * 10);

  let nextUnlockLabel = '解锁更多生态建筑';
  if ((row?.level ?? 1) < 2) nextUnlockLabel = 'Lv.2 解锁“溪谷苗圃”经营线';
  else if (!(row?.owned_decors ?? '').includes('pv')) nextUnlockLabel = '购买光伏板，开启清洁供能';
  else if (!(row?.owned_decors ?? '').includes('pond')) nextUnlockLabel = '建造雨水花园，提升生态恢复力';
  else if (!(row?.owned_decors ?? '').includes('hub')) nextUnlockLabel = '建造低碳小屋，开放访客接待';

  return {
    ecoProsperity,
    vitality,
    weeklyCarbon: Number(weeklyCarbon.toFixed(2)),
    weeklyVisitors,
    dailyCoinsForecast,
    districtLevel,
    canopyPercent,
    nextUnlockLabel,
  };
}

export function deriveHomesteadDistricts(
  row: HomesteadRow | null,
  overview: HomesteadOverview,
  plots: PlotStages,
): HomesteadDistrict[] {
  const level = row?.level ?? 1;
  const owned = row?.owned_decors ? row.owned_decors.split(',') : ['tree'];
  const has = (id: string) => owned.includes(id);
  const orchardYield = `${Math.max(6, plots[0] * 8 + plots[1] * 10 + plots[2] * 12)} 碳币/日`;
  const energyYield = `${Math.max(0, (has('pv') ? 18 : 0) + (has('wind') ? 22 : 0))}% 供能`;
  const wetlandYield = `${Math.max(0, (has('pond') ? 16 : 0) + Math.round(overview.vitality / 8))} 生态值`;
  const visitorYield = `${Math.max(0, (has('hub') ? 12 : 0) + (has('bench') ? 8 : 0))} 访客/日`;

  return [
    {
      id: 'orchard',
      title: '林间苗圃',
      subtitle: '通过低碳打卡培育树苗与花圃，是家园最基础的生产区。',
      icon: 'sprout',
      theme: '#DFF3D4',
      unlocked: true,
      level: Math.max(1, plots[0] + 1),
      capacity: `${plots.filter((item) => item > 0).length}/3 地块激活`,
      yieldLabel: orchardYield,
      status: plots[2] >= 1 ? '进入稳定产出期' : '继续完成记录让苗圃成熟',
      unlockHint: '记录绿色行为即可提升苗圃产能',
    },
    {
      id: 'energy',
      title: '清洁工坊',
      subtitle: '光伏、风车和骑行驿站组成的低碳供能区，提升运营效率。',
      icon: 'solar-power',
      theme: '#FFF0CE',
      unlocked: level >= 2 || has('pv') || has('wind') || has('bike_rack'),
      level: 1 + Number(has('pv')) + Number(has('wind')) + Number(has('bike_rack')),
      capacity: `${['pv', 'wind', 'bike_rack'].filter(has).length}/3 设备在线`,
      yieldLabel: energyYield,
      status: has('pv') || has('wind') ? '清洁能源正在为家园供电' : '购入首个设备即可启动工坊',
      unlockHint: 'Lv.2 或购买光伏板后开放',
    },
    {
      id: 'wetland',
      title: '雨水湿地',
      subtitle: '雨水花园与昆虫旅馆让家园形成自循环生态系统。',
      icon: 'water-outline',
      theme: '#D8F3F0',
      unlocked: level >= 3 || has('pond') || has('hive'),
      level: 1 + Number(has('pond')) + Number(has('hive')),
      capacity: `${['pond', 'hive'].filter(has).length}/2 生态节点启用`,
      yieldLabel: wetlandYield,
      status: has('pond') ? '湿地正在修复空气与土壤' : '建设雨水花园后可提升幸福与清洁联动',
      unlockHint: 'Lv.3 或购买雨水花园后开放',
    },
    {
      id: 'visitor',
      title: '共生客厅',
      subtitle: '长椅、低碳小屋和共享空间让更多人愿意来到你的家园。',
      icon: 'home-heart',
      theme: '#F6E4D4',
      unlocked: level >= 4 || has('bench') || has('hub'),
      level: 1 + Number(has('bench')) + Number(has('hub')),
      capacity: `${['bench', 'hub'].filter(has).length}/2 服务设施完成`,
      yieldLabel: visitorYield,
      status: has('hub') ? '访客正把这里当作低碳生活样板间' : '建造服务设施后能显著提升繁荣度',
      unlockHint: 'Lv.4 或购买长椅/低碳小屋后开放',
    },
  ];
}

export function deriveHomesteadOpportunities(
  row: HomesteadRow | null,
  tasks: Record<TaskKey, boolean>,
  checkin: { checkedInToday: boolean; streak: number; todayRewardXp: number } | null,
  overview: HomesteadOverview,
): HomesteadOpportunity[] {
  return [
    {
      id: 'checkin',
      title: checkin?.checkedInToday ? '今日巡园已完成' : '完成今日巡园打卡',
      subtitle: checkin?.checkedInToday
        ? `保持连签 ${checkin.streak} 天，明天继续可领奖励`
        : `签到后获得 ${checkin?.todayRewardXp ?? 0} XP 与同额碳币`,
      reward: `+${checkin?.todayRewardXp ?? 0} XP`,
      status: checkin?.checkedInToday ? 'progress' : 'ready',
    },
    {
      id: 'log_once',
      title: tasks.log_once ? '今日低碳记录已完成' : '记录 1 次低碳生活',
      subtitle: tasks.log_once ? '苗圃已收到今日的成长能量' : '完成一次出行、饮食或节能记录，拉动地块成长',
      reward: '推动苗圃成长',
      status: tasks.log_once ? 'progress' : 'ready',
    },
    {
      id: 'task_combo',
      title: '完成每日任务组合',
      subtitle:
        Object.values(tasks).every(Boolean)
          ? '三项任务全部完成，今天的运营奖励已结算'
          : '完成记录、阅读、点赞三项任务，额外获得 48 XP 与 50 碳币',
      reward: '+48 XP / +50 碳币',
      status: Object.values(tasks).every(Boolean) ? 'progress' : 'ready',
    },
    {
      id: 'prosperity',
      title: overview.ecoProsperity >= 82 ? '家园达到明星运营状态' : '将生态繁荣提升到 82',
      subtitle:
        overview.ecoProsperity >= 82
          ? '目前家园对外展示效果极佳，适合冲击更高等级'
          : '继续浇水、打扫并扩建建筑，可解锁更高访客热度',
      reward: overview.nextUnlockLabel,
      status: overview.ecoProsperity >= 82 ? 'progress' : 'locked',
    },
  ];
}
