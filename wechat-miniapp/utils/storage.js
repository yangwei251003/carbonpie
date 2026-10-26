const config = require('./config');

const RECORDS_KEY = "carbonpie-records";
const PHOTOS_KEY = "carbonpie-photo-checkins";
const PROFILE_KEY = "carbonpie-profile";
const SYNC_KEY = "carbonpie-last-sync";

const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = config.supabase;
const CLOUD_ENABLED = config.cloudEnabled;

const ACTIONS = [
  { id: "bus",     title: "公交出行", unit: "km", carbonPerUnit: 0.09, reward: 10, theme: "#DDEBFF", icon: "🚌" },
  { id: "metro",   title: "地铁出行", unit: "km", carbonPerUnit: 0.08, reward: 10, theme: "#C5E1FF", icon: "🚇" },
  { id: "bike",    title: "骑行通勤", unit: "km", carbonPerUnit: 0.18, reward: 18, theme: "#D6F3E4", icon: "🚲" },
  { id: "walk",    title: "步行替代", unit: "km", carbonPerUnit: 0.12, reward: 12, theme: "#FFF1D8", icon: "🚶" },
  { id: "food",    title: "光盘行动", unit: "次", carbonPerUnit: 0.35, reward: 15, theme: "#E8F0DB", icon: "🍽️" },
  { id: "standby", title: "断电待机", unit: "次", carbonPerUnit: 0.45, reward: 20, theme: "#F6E4D8", icon: "🔌" },
  { id: "ac",      title: "空调习惯", unit: "次", carbonPerUnit: 0.52, reward: 22, theme: "#D4ECFF", icon: "❄️" },
  { id: "mug",     title: "自带杯",   unit: "次", carbonPerUnit: 0.08, reward: 8,  theme: "#E6E1F7", icon: "☕" },
  { id: "virtue",  title: "好人好事", unit: "次", carbonPerUnit: 0,    reward: 15, theme: "#FDE8E8", icon: "💝" },
  { id: "recycle", title: "回收利用", unit: "次", carbonPerUnit: 0.28, reward: 12, theme: "#E0F2FE", icon: "♻️" },
];

function nowId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function read(key) {
  return wx.getStorageSync(key) || [];
}

function write(key, value) {
  wx.setStorageSync(key, value);
}

/* ── 云端请求封装 ── */
function getAuthHeader() {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Prefer': 'return=representation',
  };
}

function cloudRequest({ url, method = 'GET', data, success, fail }) {
  wx.request({
    url,
    method,
    data,
    timeout: config.networkTimeout,
    header: getAuthHeader(),
    success,
    fail,
  });
}

function listRecords() {
  return read(RECORDS_KEY);
}

function listPhotoCheckins() {
  return read(PHOTOS_KEY);
}

function saveRecord(payload) {
  const action = ACTIONS.find((item) => item.id === payload.actionId);
  const amount = Number(payload.amount || 0);
  if (!action || !Number.isFinite(amount) || amount <= 0) throw new Error('记录类型或数量无效');
  const carbon = Number((amount * (action ? action.carbonPerUnit : 0)).toFixed(2));
  const reward = Math.round((action ? action.reward : 10) * Math.max(1, amount));
  const records = listRecords();
  const record = {
    id: nowId("record"),
    createdAt: new Date().toISOString(),
    actionId: payload.actionId,
    title: action ? action.title : "低碳记录",
    unit: action ? action.unit : "",
    amount,
    note: payload.note || "",
    carbon,
    reward
  };
  records.unshift(record);
  write(RECORDS_KEY, records.slice(0, 500));

  addHomesteadCoins(reward);
  addHomesteadXp(Math.round(reward / 2));

  // 实时同步到云端
  syncRecordToCloud(record);

  return record;
}

function syncRecordToCloud(record) {
  if (!CLOUD_ENABLED) return;
  const userId = wx.getStorageSync('wx_user_id');
  if (!userId) return;
  cloudRequest({
    url: `${SUPABASE_URL}/rest/v1/behavior_logs`,
    method: 'POST',
    data: [{
      user_id: userId,
      type: record.actionId,
      payload: record,
      avoided_kg_co2e: record.carbon,
      client_id: record.id,
    }],
    fail() {},
  });
}

function syncPhotoToCloud(record) {
  if (!CLOUD_ENABLED) return;
  const userId = wx.getStorageSync('wx_user_id');
  if (!userId) return;
  cloudRequest({
    url: `${SUPABASE_URL}/rest/v1/behavior_logs`,
    method: 'POST',
    data: [{
      user_id: userId,
      type: `photo_${record.category || 'checkin'}`,
      payload: {
        ...record,
        localPath: '',
      },
      avoided_kg_co2e: 0,
      client_id: record.id,
    }],
    fail() {},
  });
}

function savePhotoCheckin(payload) {
  const photos = listPhotoCheckins();
  const record = {
    id: nowId("photo"),
    createdAt: new Date().toISOString(),
    localPath: payload.localPath,
    category: payload.category,
    title: payload.title,
    note: payload.note || "",
    encouragement: payload.encouragement || "这一刻被好好记录下来了，继续把低碳生活过成日常。",
    reward: payload.reward || 20
  };
  photos.unshift(record);
  write(PHOTOS_KEY, photos.slice(0, 100));

  addHomesteadCoins(record.reward);
  addHomesteadXp(10);
  syncPhotoToCloud(record);

  return record;
}

function summarizeHome() {
  const records = listRecords();
  const photos = listPhotoCheckins();
  const totalCarbon = records.reduce((sum, item) => sum + Number(item.carbon || 0), 0);
  const totalReward = records.reduce((sum, item) => sum + Number(item.reward || 0), 0) +
    photos.reduce((sum, item) => sum + Number(item.reward || 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = records.filter((item) => String(item.createdAt).slice(0, 10) === today).length +
    photos.filter((item) => String(item.createdAt).slice(0, 10) === today).length;

  const weekData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const ds = d.toISOString().slice(0, 10);
    const dayRecords = records.filter((item) => String(item.createdAt).slice(0, 10) === ds);
    const dayCarbon = dayRecords.reduce((s, r) => s + Number(r.carbon || 0), 0);
    weekData.push({
      date: ds,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      carbon: Number(dayCarbon.toFixed(2)),
      count: dayRecords.length
    });
  }
  // 预计算柱状图高度（避免WXML中使用Math.max）
  const maxCarbon = Math.max(...weekData.map(w => w.carbon), 1);
  weekData.forEach(w => {
    w.barHeight = Math.max(8, Math.round(w.carbon / maxCarbon * 100));
    w.carbonDisplay = w.carbon > 0 ? w.carbon : '-';
  });

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekCarbon = records
    .filter((r) => new Date(r.createdAt) >= weekStart)
    .reduce((s, r) => s + Number(r.carbon || 0), 0);

  return {
    totalCarbon: Number(totalCarbon.toFixed(2)),
    totalReward,
    todayCount,
    weekCarbon: Number(weekCarbon.toFixed(2)),
    activeDays: new Set(records.map((r) => String(r.createdAt).slice(0, 10))).size,
    weekData,
    recentRecords: records.slice(0, 4),
    recentPhotos: photos.slice(0, 3)
  };
}

function wipeAllData() {
  wx.removeStorageSync(RECORDS_KEY);
  wx.removeStorageSync(PHOTOS_KEY);
  wx.removeStorageSync(HOMESTEAD_KEY);
  wx.removeStorageSync(PROFILE_KEY);
}

/* ── 用户资料 ── */
function getProfile() {
  return wx.getStorageSync(PROFILE_KEY) || {
    nickname: "碳友",
    avatar: "",
    bio: "",
    city: "大连"
  };
}

function saveProfile(data) {
  const profile = {
    nickname: data.nickname || "碳友",
    avatar: data.avatar || "",
    bio: data.bio || "",
    city: data.city || config.defaultCity,
  };
  wx.setStorageSync(PROFILE_KEY, profile);
  if (!CLOUD_ENABLED) return;
  const userId = wx.getStorageSync('wx_user_id');
  if (userId) {
    cloudRequest({
      url: `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
      method: 'PATCH',
      data: {
        display_name: profile.nickname,
        avatar_url: profile.avatar,
        bio: profile.bio,
        city: profile.city,
      },
      fail() {},
    });
  }
}

/* ── 云端同步 ── */
function loadFromCloud(userId) {
  if (!CLOUD_ENABLED || !userId) return;
  cloudRequest({
    url: `${SUPABASE_URL}/rest/v1/behavior_logs?user_id=eq.${userId}&order=created_at.desc&limit=200`,
    method: 'GET',
    success(res) {
      const remoteLogs = res.data;
      if (!Array.isArray(remoteLogs)) {
        console.warn('[storage] loadFromCloud: response is not array', remoteLogs);
        return;
      }
      const localRecords = listRecords();
      const localPhotos = listPhotoCheckins();
      const localRecordIds = new Set(localRecords.map(r => r.id));
      const localPhotoIds = new Set(localPhotos.map(p => p.id));
      const mergedRecords = [...localRecords];
      const mergedPhotos = [...localPhotos];
      remoteLogs.forEach(log => {
        if (!log.client_id) return;
        const payload = log.payload || {};
        if (String(log.type || '').indexOf('photo_') === 0) {
          if (!localPhotoIds.has(log.client_id)) {
            mergedPhotos.push({
              id: log.client_id,
              createdAt: log.created_at,
              localPath: '',
              category: payload.category || '',
              title: payload.title || '低碳影像打卡',
              note: payload.note || '',
              encouragement: payload.encouragement || '继续保持真实记录。',
              reward: payload.reward || 0,
              cloudOnly: true,
            });
          }
          return;
        }
        if (!localRecordIds.has(log.client_id)) {
          mergedRecords.push({
            id: log.client_id,
            createdAt: log.created_at,
            actionId: log.type,
            title: (ACTIONS.find(a => a.id === log.type) || {}).title || log.type,
            amount: payload.amount || 1,
            unit: payload.unit || '',
            note: payload.note || '',
            carbon: log.avoided_kg_co2e || 0,
            reward: payload.reward || 0,
          });
        }
      });
      mergedRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      mergedPhotos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      write(RECORDS_KEY, mergedRecords.slice(0, 500));
      write(PHOTOS_KEY, mergedPhotos.slice(0, 100));
      wx.setStorageSync(SYNC_KEY, new Date().toISOString());
    },
    fail(err) {
      console.warn('[storage] loadFromCloud failed', err);
    }
  });
}

function syncToCloud(userId) {
  if (!CLOUD_ENABLED || !userId) return;
  const records = listRecords();
  const photos = listPhotoCheckins();
  records.forEach(r => {
    cloudRequest({
      url: `${SUPABASE_URL}/rest/v1/behavior_logs`,
      method: 'POST',
      data: [{
        user_id: userId,
        type: r.actionId,
        payload: r,
        avoided_kg_co2e: r.carbon,
        client_id: r.id,
      }],
      fail() {},
    });
  });
  photos.forEach(photo => {
    syncPhotoToCloud(photo);
  });
}

/* ── 数据导出 ── */
function exportJSON() {
  const records = listRecords();
  const photos = listPhotoCheckins().map(p => ({ ...p }));
  return JSON.stringify({ records, photos, exportedAt: new Date().toISOString() }, null, 2);
}

function exportCSV() {
  const records = listRecords();
  const header = "id,createdAt,actionId,title,amount,unit,carbon,reward,note";
  const rows = records.map(r =>
    `${r.id},${r.createdAt},${r.actionId},${r.title},${r.amount},${r.unit},${r.carbon},${r.reward},"${(r.note || '').replace(/"/g, '""')}"`
  );
  return [header, ...rows].join("\n");
}

/* ── 排行榜（本地模拟） ── */
function getLocalLeaderboard() {
  const records = listRecords();
  const totalCarbon = records.reduce((sum, item) => sum + Number(item.carbon || 0), 0);
  const profile = getProfile();

  const bots = [
    { nickname: "绿叶先锋", carbon: 156.8, avatar: "🌿" },
    { nickname: "低碳达人", carbon: 132.4, avatar: "🌱" },
    { nickname: "环保小卫士", carbon: 98.7, avatar: "🛡️" },
    { nickname: "绿色行者", carbon: 87.3, avatar: "🚶" },
    { nickname: "碳中和先锋", carbon: 76.1, avatar: "🌍" },
    { nickname: "节能小能手", carbon: 65.5, avatar: "💡" },
    { nickname: "光盘侠", carbon: 54.2, avatar: "🍽️" },
    { nickname: "骑行侠", carbon: 43.8, avatar: "🚲" },
    { nickname: "太阳之子", carbon: 32.6, avatar: "☀️" },
  ];

  const me = { nickname: profile.nickname || "我", carbon: totalCarbon, avatar: "⭐", isMe: true };
  const all = [...bots, me].sort((a, b) => b.carbon - a.carbon);
  return all;
}

/* ── 周报数据 ── */
function getWeekReport() {
  const records = listRecords();
  const photos = listPhotoCheckins();
  const profile = getProfile();

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekRecords = records.filter(r => new Date(r.createdAt) >= weekStart);
  const weekPhotos = photos.filter(r => new Date(r.createdAt) >= weekStart);

  const weekCarbon = weekRecords.reduce((s, r) => s + Number(r.carbon || 0), 0);
  const weekReward = weekRecords.reduce((s, r) => s + Number(r.reward || 0), 0) +
    weekPhotos.reduce((s, r) => s + Number(r.reward || 0), 0);
  const activeDays = new Set(weekRecords.map(r => String(r.createdAt).slice(0, 10))).size;

  const actionCounts = {};
  weekRecords.forEach(r => {
    actionCounts[r.actionId] = (actionCounts[r.actionId] || 0) + Number(r.amount || 1);
  });

  const topAction = Object.entries(actionCounts)
    .sort((a, b) => b[1] - a[1])[0];

  const topActionInfo = topAction ? ACTIONS.find(a => a.id === topAction[0]) : null;

  return {
    nickname: profile.nickname,
    weekCarbon: Number(weekCarbon.toFixed(2)),
    weekReward,
    activeDays,
    totalRecords: weekRecords.length,
    totalPhotos: weekPhotos.length,
    topAction: topActionInfo ? topActionInfo.title : "暂无",
    topActionCount: topAction ? topAction[1] : 0,
    actionCounts,
    weekStart: weekStart.toISOString().slice(0, 10),
    weekEnd: now.toISOString().slice(0, 10),
  };
}

/* ── 家园系统常量 ── */
const HOMESTEAD_KEY = "carbonpie-homestead";
const HOMESTEAD_XP_PER_LEVEL = 100;

const DECOR_CATALOG = [
  { id: "tree",     icon: "🌳", label: "绿荫大树",   price: 50 },
  { id: "flower",   icon: "🌸", label: "花圃小径",   price: 80 },
  { id: "solar",    icon: "☀️", label: "太阳能板",   price: 120 },
  { id: "windmill", icon: "🌬️", label: "风力发电",   price: 150 },
  { id: "pond",     icon: "💧", label: "生态池塘",   price: 200 },
  { id: "bench",    icon: "🪑", label: "环保长椅",   price: 60 },
  { id: "fence",    icon: "🏠", label: "木栅围栏",   price: 90 },
  { id: "recycle",  icon: "♻️", label: "回收站",     price: 100 },
];

const PLOT_CROPS = [
  { id: "p1", name: "菜地A",  crop: "白菜", icon: "🥬", totalSteps: 6, rewardCoins: 15, rewardXp: 10 },
  { id: "p2", name: "菜地B",  crop: "番茄", icon: "🍅", totalSteps: 8, rewardCoins: 20, rewardXp: 15 },
  { id: "p3", name: "花田",   crop: "向日葵", icon: "🌻", totalSteps: 10, rewardCoins: 30, rewardXp: 20 },
  { id: "p4", name: "果园",   crop: "苹果", icon: "🍎", totalSteps: 12, rewardCoins: 40, rewardXp: 25 },
];

const STAGE_LABELS = ["种子", "发芽", "幼苗", "生长", "茂盛", "开花", "结果"];

/* ── 家园系统函数 ── */
function getHomestead() {
  return wx.getStorageSync(HOMESTEAD_KEY) || {
    level: 1,
    xp: 0,
    carbon_coins: 0,
    eco_prosperity: 0,
    happiness: 100,
    owned_decor: ["tree"],
    equipped_decor: "tree",
    checkin_streak: 0,
    last_checkin: "",
    last_action_date: "",
    water_count: 0,
    clean_count: 0,
    plot_progress: {},
  };
}

function saveHomestead(data) {
  wx.setStorageSync(HOMESTEAD_KEY, data);
}

function addHomesteadCoins(amount) {
  const h = getHomestead();
  h.carbon_coins = (h.carbon_coins || 0) + amount;
  saveHomestead(h);
}

function addHomesteadXp(amount) {
  const h = getHomestead();
  h.xp = (h.xp || 0) + amount;
  if (h.xp >= HOMESTEAD_XP_PER_LEVEL) {
    h.level = (h.level || 1) + Math.floor(h.xp / HOMESTEAD_XP_PER_LEVEL);
    h.xp = h.xp % HOMESTEAD_XP_PER_LEVEL;
    h.eco_prosperity = (h.eco_prosperity || 0) + 10;
  }
  saveHomestead(h);
}

function getLevelTitle(level) {
  const titles = ["", "见习园丁", "绿色新手", "低碳学徒", "环保达人", "生态先锋", "绿色守护者", "碳中大师", "低碳传奇"];
  return titles[Math.min(level || 1, titles.length - 1)] || "低碳传奇";
}

function getPlots() {
  const h = getHomestead();
  const progress = h.plot_progress || {};
  return PLOT_CROPS.map((p) => {
    const step = progress[p.id] || 0;
    const ready = step >= p.totalSteps;
    const stageIdx = Math.min(Math.floor(step / (p.totalSteps / STAGE_LABELS.length)), STAGE_LABELS.length - 1);
    return {
      ...p,
      step,
      ready,
      progress: Math.min(Math.round(step / p.totalSteps * 100), 100),
      stageLabel: ready ? "已成熟" : STAGE_LABELS[stageIdx],
    };
  });
}

function interactHomestead(action) {
  const h = getHomestead();
  const today = new Date().toISOString().slice(0, 10);
  if (h.last_action_date !== today) {
    h.water_count = 0;
    h.clean_count = 0;
    h.last_action_date = today;
  }

  let gainedCoins = 2;
  let gainedXp = 5;

  if (action === "water") {
    if (h.water_count >= 3) return { success: false, msg: "今日浇水次数已用完，明天再来 💧" };
    h.water_count = (h.water_count || 0) + 1;
    const pp = h.plot_progress || {};
    for (const p of PLOT_CROPS) {
      if (!pp[p.id] || pp[p.id] < p.totalSteps) {
        pp[p.id] = Math.min((pp[p.id] || 0) + 1, p.totalSteps);
      }
    }
    h.plot_progress = pp;
    gainedCoins = 3;
    gainedXp = 8;
  } else if (action === "clean") {
    if (h.clean_count >= 3) return { success: false, msg: "今日打扫次数已用完，明天再来 🧹" };
    h.clean_count = (h.clean_count || 0) + 1;
    h.happiness = Math.min((h.happiness || 100) + 5, 200);
    h.eco_prosperity = (h.eco_prosperity || 0) + 2;
    gainedCoins = 3;
    gainedXp = 8;
  } else {
    gainedCoins = 1;
    gainedXp = 3;
  }

  h.carbon_coins = (h.carbon_coins || 0) + gainedCoins;
  h.xp = (h.xp || 0) + gainedXp;
  if (h.xp >= HOMESTEAD_XP_PER_LEVEL) {
    h.level = (h.level || 1) + Math.floor(h.xp / HOMESTEAD_XP_PER_LEVEL);
    h.xp = h.xp % HOMESTEAD_XP_PER_LEVEL;
  }
  saveHomestead(h);
  const labels = { water: "浇水成功", clean: "打扫完成", harvest: "收获" };
  return { success: true, msg: labels[action] || "操作成功", gainedCoins, gainedXp };
}

function claimDailyCheckin() {
  const h = getHomestead();
  const today = new Date().toISOString().slice(0, 10);
  if (h.last_checkin === today) {
    return { already: true, gained: 0, streak: h.checkin_streak || 0 };
  }
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = h.last_checkin === yesterday ? (h.checkin_streak || 0) + 1 : 1;
  const gained = 10 + Math.min(streak, 7) * 2;

  h.last_checkin = today;
  h.checkin_streak = streak;
  h.xp = (h.xp || 0) + gained;
  h.carbon_coins = (h.carbon_coins || 0) + 5;
  if (h.xp >= HOMESTEAD_XP_PER_LEVEL) {
    h.level = (h.level || 1) + Math.floor(h.xp / HOMESTEAD_XP_PER_LEVEL);
    h.xp = h.xp % HOMESTEAD_XP_PER_LEVEL;
  }
  saveHomestead(h);
  return { already: false, gained, streak };
}

function buyAndEquipDecor(decorId) {
  const h = getHomestead();
  const item = DECOR_CATALOG.find((d) => d.id === decorId);
  if (!item) return { success: false, msg: "未找到该设施" };

  const owned = h.owned_decor || [];
  if (!owned.includes(decorId)) {
    if ((h.carbon_coins || 0) < item.price) return { success: false, msg: "碳币不足，继续低碳行动攒碳币吧" };
    h.carbon_coins -= item.price;
    owned.push(decorId);
    h.owned_decor = owned;
  }

  h.equipped_decor = decorId;
  h.eco_prosperity = (h.eco_prosperity || 0) + 5;
  saveHomestead(h);
  return { success: true, msg: `${item.label}已${owned.includes(decorId) ? "更换展示" : "购买并展示"}` };
}

function harvestPlot(plotId) {
  const crop = PLOT_CROPS.find((item) => item.id === plotId);
  if (!crop) return { success: false, msg: '未找到地块' };
  const h = getHomestead();
  const progress = h.plot_progress || {};
  const currentStep = progress[plotId] || 0;
  if (currentStep < crop.totalSteps) {
    return { success: false, msg: `${crop.name}还没成熟，继续记录低碳行动吧` };
  }
  progress[plotId] = 0;
  h.plot_progress = progress;
  h.carbon_coins = (h.carbon_coins || 0) + crop.rewardCoins;
  h.xp = (h.xp || 0) + crop.rewardXp;
  if (h.xp >= HOMESTEAD_XP_PER_LEVEL) {
    h.level = (h.level || 1) + Math.floor(h.xp / HOMESTEAD_XP_PER_LEVEL);
    h.xp = h.xp % HOMESTEAD_XP_PER_LEVEL;
    h.eco_prosperity = (h.eco_prosperity || 0) + 10;
  }
  saveHomestead(h);
  return {
    success: true,
    crop,
    gainedCoins: crop.rewardCoins,
    gainedXp: crop.rewardXp,
  };
}

module.exports = {
  ACTIONS,
  DECOR_CATALOG,
  HOMESTEAD_XP_PER_LEVEL,
  listRecords,
  listPhotoCheckins,
  saveRecord,
  savePhotoCheckin,
  summarizeHome,
  getHomestead,
  addHomesteadCoins,
  addHomesteadXp,
  getLevelTitle,
  getPlots,
  interactHomestead,
  claimDailyCheckin,
  buyAndEquipDecor,
  harvestPlot,
  getProfile,
  saveProfile,
  wipeAllData,
  exportJSON,
  exportCSV,
  getLocalLeaderboard,
  getWeekReport,
  loadFromCloud,
  syncToCloud,
};
