import {
  AC_OFF_SAVE_KWH_ONCE,
  AC_SETPOINT_SAVE_KWH_PER_DAY,
  EF_VERSION,
  EF_BIKE_PKM,
  EF_BUS_PKM,
  EF_CAR_SINGLE_OCCUPANT_PKM,
  EF_METRO_PKM,
  EF_WALK_PKM,
  FOOD_WASTE_AVOIDED_KG_HEAVY,
  FOOD_WASTE_AVOIDED_KG_NORMAL,
  FOOD_WASTE_AVOIDED_KG_SIMPLE,
  GRID_EF_KG_CO2E_PER_KWH,
  STANDBY_CHARGER_W,
  STANDBY_ROUTER_W,
  STANDBY_STB_W,
  STANDBY_TV_W,
  STANDBY_DAILY_COUNT_CAP,
  TRANSPORT_DAILY_KM_CAP,
  TRANSPORT_SINGLE_ENTRY_KM_MAX,
} from '@/constants/carbon';
import type { BehaviorType, LogPayload } from '@/features/log/types';

export type TodayUsage = {
  /** 今日已计入汇总的出行公里（included 口径） */
  transportKmIncludedToday: number;
  /** 今日已计入汇总的待机关闭次数 */
  standbyIncludedCountToday: number;
};

export type AvoidResult = {
  avoidedKg: number;
  includedInSummary: boolean;
  explanation: string;
};

function roundKg(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function efForTransport(type: BehaviorType): number {
  switch (type) {
    case 'transport_bus':
      return EF_BUS_PKM;
    case 'transport_metro':
      return EF_METRO_PKM;
    case 'bike':
      return EF_BIKE_PKM;
    case 'walk':
      return EF_WALK_PKM;
    default:
      return EF_BIKE_PKM;
  }
}

export function calculateAvoided(
  type: BehaviorType,
  payload: LogPayload,
  usage: TodayUsage,
): AvoidResult {
  if (type === 'virtue') {
    if (payload.mode !== 'virtue') {
      return {
        avoidedKg: 0,
        includedInSummary: false,
        explanation:
          '好人好事纳入美德记录；默认不计入碳换算汇总（可与家园玩法衔接）。',
      };
    }
    return {
      avoidedKg: 0,
      includedInSummary: false,
      explanation:
        '本条为美德记录，不计入估算碳减排汇总；如需关联节电行为请在对应分类记录。',
    };
  }

  if (type === 'mug') {
    return {
      avoidedKg: 0,
      includedInSummary: false,
      explanation:
        '自带杯等行为默认不计入 kg CO₂e（可选因子争议较大），仍会出现在记录列表。',
    };
  }

  if (
    type === 'transport_bus' ||
    type === 'transport_metro' ||
    type === 'bike' ||
    type === 'walk'
  ) {
    if (payload.mode !== 'transport') {
      return {
        avoidedKg: 0,
        includedInSummary: false,
        explanation: 'payload 不匹配。',
      };
    }
    if (!Number.isFinite(Number(payload.km)) || !Number.isFinite(usage.transportKmIncludedToday) || usage.transportKmIncludedToday < 0) {
      return { avoidedKg: 0, includedInSummary: false, explanation: '里程或当日用量无效，未计入估算。' };
    }
    const rawKm =
      Number(payload.km) *
      (payload.roundTrip ? 2 : 1);
    const singleCapKm = Math.min(
      Math.max(rawKm, 0),
      TRANSPORT_SINGLE_ENTRY_KM_MAX,
    );
    const allowanceKm = Math.max(
      0,
      TRANSPORT_DAILY_KM_CAP - usage.transportKmIncludedToday,
    );
    const includedKm = Math.min(singleCapKm, allowanceKm);
    const avoidedPerKm = Math.max(
      0,
      EF_CAR_SINGLE_OCCUPANT_PKM - efForTransport(type),
    );
    const avoidedKg = roundKg(includedKm * avoidedPerKm);
    const includedInSummary = includedKm > 0 && avoidedKg > 0;

    let explanation = `基准：单人驾乘汽油乘用车（假设 ${EF_CAR_SINGLE_OCCUPANT_PKM} kg CO₂e/人·km）。`;
    explanation += ` 对比方式因子：${efForTransport(type)} kg CO₂e/人·km。`;
    explanation += ` 行程按单程输入×${payload.roundTrip ? 2 : 1}；单次计入上限 ${TRANSPORT_SINGLE_ENTRY_KM_MAX} km；`;
    explanation += ` 当日计入上限剩余 ${allowanceKm.toFixed(2)} km。`;
    explanation += ` 本次计入里程 ${includedKm.toFixed(2)} km，估算避免约 ${avoidedKg} kg CO₂e。`;
    if (singleCapKm < rawKm) {
      explanation += ' 单次超出部分未计入。';
    }
    if (includedKm < singleCapKm) {
      explanation += ' 当日额度不足，超出部分仍可保存但不计入汇总。';
    }

    return { avoidedKg, includedInSummary, explanation };
  }

  if (type === 'food_save') {
    if (payload.mode !== 'food') {
      return { avoidedKg: 0, includedInSummary: false, explanation: 'payload 不匹配。' };
    }
    const kg =
      payload.level === 'simple'
        ? FOOD_WASTE_AVOIDED_KG_SIMPLE
        : payload.level === 'heavy'
          ? FOOD_WASTE_AVOIDED_KG_HEAVY
          : FOOD_WASTE_AVOIDED_KG_NORMAL;
    const avoidedKg = roundKg(kg);
    const explanation =
      '光盘/少浪费：采用文献数量级的区间估算（偏素/普通/荤食），非个体实测。';
    return {
      avoidedKg,
      includedInSummary: avoidedKg > 0,
      explanation,
    };
  }

  if (type === 'standby_off') {
    if (payload.mode !== 'standby') {
      return { avoidedKg: 0, includedInSummary: false, explanation: 'payload 不匹配。' };
    }
    if (!Number.isFinite(Number(payload.hours)) || !Number.isFinite(usage.standbyIncludedCountToday) || usage.standbyIncludedCountToday < 0 || (payload.preset === 'custom' && !Number.isFinite(Number(payload.watts ?? 10)))) {
      return { avoidedKg: 0, includedInSummary: false, explanation: '时长、功率或当日次数无效，未计入估算。' };
    }
    const wattsDefault =
      payload.preset === 'stb'
        ? STANDBY_STB_W
        : payload.preset === 'router'
          ? STANDBY_ROUTER_W
          : payload.preset === 'tv'
            ? STANDBY_TV_W
            : payload.preset === 'charger'
              ? STANDBY_CHARGER_W
              : Math.min(
                  50,
                  Math.max(1, Number(payload.watts ?? 10)),
                );
    const hours = Math.max(0, Number(payload.hours));
    const deltaKwh = (wattsDefault / 1000) * hours;
    const theoretical = roundKg(deltaKwh * GRID_EF_KG_CO2E_PER_KWH);

    const countOk =
      usage.standbyIncludedCountToday < STANDBY_DAILY_COUNT_CAP;
    const avoidedKg = countOk ? theoretical : 0;
    const includedInSummary = countOk && avoidedKg > 0;

    let explanation = `待机功率 ${wattsDefault} W × ${hours} h → Δ电 ${deltaKwh.toFixed(4)} kWh；`;
    explanation += ` 电网因子 ${GRID_EF_KG_CO2E_PER_KWH} kg CO₂e/kWh（${EF_VERSION}）。`;
    explanation += countOk
      ? ` 估算避免约 ${avoidedKg} kg CO₂e。`
      : ` 当日计入次数已达上限（${STANDBY_DAILY_COUNT_CAP} 次），本条仍可保存但不计入汇总。`;

    return { avoidedKg, includedInSummary, explanation };
  }

  if (type === 'ac_habit') {
    if (payload.mode !== 'ac') {
      return { avoidedKg: 0, includedInSummary: false, explanation: 'payload 不匹配。' };
    }
    const kwh =
      payload.variant === 'setpoint'
        ? AC_SETPOINT_SAVE_KWH_PER_DAY
        : AC_OFF_SAVE_KWH_ONCE;
    const avoidedKg = roundKg(kwh * GRID_EF_KG_CO2E_PER_KWH);
    const explanation =
      payload.variant === 'setpoint'
        ? `假定夏季调高 1℃、典型卧室空调运行约 8h，估算节电 ${kwh} kWh（典型场景）。`
        : `假定离开房间关闭空调，估算避免无效耗电 ${kwh} kWh（典型场景）。`;
    return {
      avoidedKg,
      includedInSummary: avoidedKg > 0,
      explanation: `${explanation} × 电网因子 → 约 ${avoidedKg} kg CO₂e。`,
    };
  }

  return {
    avoidedKg: 0,
    includedInSummary: false,
    explanation: '未知类型。',
  };
}
