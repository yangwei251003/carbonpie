/** 与方法学文档 `docs/05` 对齐，禁止在业务代码中硬编码散落 */
export const EF_VERSION = 'CN-GRID-2024-MEF-0.5777' as const;

export const GRID_EF_KG_CO2E_PER_KWH = 0.5777;

export const EF_CAR_SINGLE_OCCUPANT_PKM = 0.2;
export const EF_BUS_PKM = 0.045;
export const EF_METRO_PKM = 0.035;
export const EF_WALK_PKM = 0;
export const EF_BIKE_PKM = 0;

export const FOOD_WASTE_AVOIDED_KG_SIMPLE = 0.25;
export const FOOD_WASTE_AVOIDED_KG_NORMAL = 0.4;
export const FOOD_WASTE_AVOIDED_KG_HEAVY = 0.55;

export const STANDBY_STB_W = 12;
export const STANDBY_ROUTER_W = 8;
export const STANDBY_TV_W = 3;
export const STANDBY_CHARGER_W = 2;

export const AC_SETPOINT_SAVE_KWH_PER_DAY = 0.8;
export const AC_OFF_SAVE_KWH_ONCE = 0.5;

export const TRANSPORT_DAILY_KM_CAP = 80;
export const TRANSPORT_SINGLE_ENTRY_KM_MAX = 50;
export const STANDBY_DAILY_COUNT_CAP = 3;

export const METHODOLOGY_LINK =
  'https://www.mee.gov.cn/xxgk2018/xxgk/xxgk01/202510/t20251024_1130734.html';
