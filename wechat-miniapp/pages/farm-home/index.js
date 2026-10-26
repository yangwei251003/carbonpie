const SAVE_KEY = "pixel_farm_save_v2";
const WEATHER_SECONDS = 180;
const FRIEND_COOLDOWN = 60;
const OFFLINE_CAP_SECONDS = 6 * 3600;

const SEEDS = [
  { id: "turnip", name: "白萝卜", cost: 8, sell: 22, grow: 45, color: "turnip" },
  { id: "tomato", name: "番茄", cost: 18, sell: 45, grow: 90, color: "tomato" },
  { id: "corn", name: "玉米", cost: 32, sell: 76, grow: 150, color: "corn" },
  { id: "pumpkin", name: "南瓜", cost: 56, sell: 128, grow: 240, color: "pumpkin" }
];

const TOOLS = [
  { id: "plant", name: "播种", hint: "选种子后点空地" },
  { id: "water", name: "浇水", hint: "缩短成熟时间" },
  { id: "clean", name: "清理", hint: "除虫除草" },
  { id: "harvest", name: "收获", hint: "成熟后入仓" },
  { id: "friend", name: "好友", hint: "访问好友农场" },
  { id: "build", name: "建造", hint: "美化家园" }
];

const DECORS = [
  { id: "well", name: "水井", cost: 180, cls: "decor-well", x: 548, y: 128 },
  { id: "flower", name: "花圃", cost: 260, cls: "decor-flower", x: 214, y: 274 },
  { id: "carousel", name: "小风车", cost: 420, cls: "decor-windmill", x: 602, y: 180 },
  { id: "pond", name: "鱼塘", cost: 520, cls: "decor-pond", x: 548, y: 262 }
];

const WEATHER = [
  { id: "sunny", name: "晴天", cls: "weather-sunny", growRate: 1 },
  { id: "rain", name: "小雨", cls: "weather-rain", growRate: 0.75 },
  { id: "cloud", name: "多云", cls: "weather-cloud", growRate: 0.9 }
];

const PLOT_POSITIONS = [
  [256, 112], [314, 112], [372, 112], [430, 112],
  [256, 169], [314, 169], [372, 169], [430, 169],
  [256, 226], [314, 226], [372, 226], [430, 226],
  [492, 169], [550, 169], [608, 169],
  [492, 226], [550, 226], [608, 226]
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function seedById(id) {
  return SEEDS.find((seed) => seed.id === id) || SEEDS[0];
}

function weatherById(id) {
  return WEATHER.find((item) => item.id === id) || WEATHER[0];
}

function createPlots() {
  return PLOT_POSITIONS.map(([x, y], index) => ({
    id: index + 1,
    x,
    y,
    cropId: "",
    plantedAt: 0,
    readyAt: 0,
    watered: false,
    issue: ""
  }));
}

function createState(now) {
  return {
    coins: 860,
    gems: 12,
    level: 1,
    exp: 0,
    stamina: 30,
    selectedSeed: "turnip",
    activeTool: "plant",
    weatherId: "sunny",
    weatherUntil: now + WEATHER_SECONDS * 1000,
    plots: createPlots(),
    bag: { turnip: 2, tomato: 0, corn: 0, pumpkin: 0 },
    decors: [],
    friends: [
      { id: "a", name: "桃枝农场", level: 8, score: 4200, ready: 4, stolenAt: 0 },
      { id: "b", name: "麦芽小镇", level: 6, score: 3600, ready: 3, stolenAt: 0 },
      { id: "c", name: "青梨牧场", level: 5, score: 3100, ready: 2, stolenAt: 0 }
    ],
    tasks: [
      { id: "harvest", name: "收获5份作物", target: 5, progress: 0, reward: 120, done: false },
      { id: "friend", name: "拜访1位好友", target: 1, progress: 0, reward: 90, done: false },
      { id: "build", name: "购入1件装饰", target: 1, progress: 0, reward: 110, done: false }
    ],
    avatarX: 438,
    avatarY: 152,
    notice: "拖动地图查看农场全貌",
    updatedAt: now
  };
}

function fmt(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

function grantExp(state, amount) {
  state.exp += amount;
  while (state.exp >= state.level * 120) {
    state.exp -= state.level * 120;
    state.level += 1;
    state.coins += 80;
    state.notice = `升级到 Lv.${state.level}，奖励80金币`;
  }
}

function bumpTask(state, id, amount) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task || task.done) return;
  task.progress = Math.min(task.target, task.progress + amount);
}

function cycleWeather(state, now) {
  if (now < state.weatherUntil) return;
  const next = WEATHER[rand(0, WEATHER.length - 1)];
  state.weatherId = next.id;
  state.weatherUntil = now + WEATHER_SECONDS * 1000;
  state.notice = `${next.name}来了，作物生长速度变化`;
}

function applyIssues(state) {
  state.plots = state.plots.map((plot) => {
    if (!plot.cropId || plot.issue) return plot;
    if (Math.random() < 0.025) {
      return { ...plot, issue: Math.random() > 0.5 ? "weed" : "bug" };
    }
    return plot;
  });
}

function processGrowth(state, now) {
  const weather = weatherById(state.weatherId);
  state.plots = state.plots.map((plot) => {
    if (!plot.cropId || plot.readyAt <= now) return plot;
    const seed = seedById(plot.cropId);
    const base = seed.grow * 1000;
    const waterBonus = plot.watered ? 0.82 : 1;
    const issuePenalty = plot.issue ? 1.24 : 1;
    const adjustedReadyAt = plot.plantedAt + base * weather.growRate * waterBonus * issuePenalty;
    return { ...plot, readyAt: adjustedReadyAt };
  });
}

Page({
  data: {
    state: createState(Date.now()),
    seeds: SEEDS,
    tools: TOOLS,
    decors: DECORS,
    plotsView: [],
    bagView: [],
    friendView: [],
    taskView: [],
    decorView: [],
    weatherView: {},
    activePanel: "bag",
    panelOpen: false,
    mapScrollLeft: 96,
    mapScrollTop: 56,
    timeText: "0:00",
    expText: "0/120"
  },

  onLoad() {
    this.load();
    this.startTicker();
  },

  onShow() {
    this.refresh(true);
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer);
  },

  startTicker() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.refresh(false), 1000);
  },

  load() {
    const now = Date.now();
    const saved = wx.getStorageSync(SAVE_KEY);
    const state = saved && saved.plots ? saved : createState(now);
    const offline = Math.min(OFFLINE_CAP_SECONDS, Math.max(0, Math.floor((now - (state.updatedAt || now)) / 1000)));
    const bonus = Math.floor(offline / 60) * 18;
    if (bonus > 0) {
      state.coins += bonus;
      state.notice = `离线收益 +${bonus} 金币`;
    }
    this.persist(state);
    this.refresh(true);
  },

  persist(state) {
    state.updatedAt = Date.now();
    wx.setStorageSync(SAVE_KEY, state);
    this.setData({ state });
  },

  refresh(isImmediate) {
    const now = Date.now();
    const state = clone(this.data.state);
    cycleWeather(state, now);
    processGrowth(state, now);
    if (!isImmediate && now % 7 < 1000) applyIssues(state);
    this.persist(state);
    this.rebuild(state, now);
  },

  rebuild(state, now) {
    const weather = weatherById(state.weatherId);
    const plotsView = state.plots.map((plot) => {
      const seed = seedById(plot.cropId);
      const hasCrop = !!plot.cropId;
      const ready = hasCrop && plot.readyAt <= now;
      const total = hasCrop ? Math.max(1, plot.readyAt - plot.plantedAt) : 1;
      const progress = hasCrop ? Math.min(100, Math.floor(((now - plot.plantedAt) / total) * 100)) : 0;
      let stage = "stage-0";
      if (progress >= 34) stage = "stage-1";
      if (progress >= 67) stage = "stage-2";
      if (ready) stage = "stage-3";
      return {
        ...plot,
        hasCrop,
        ready,
        cropName: hasCrop ? seed.name : "空地",
        cropCls: hasCrop ? `crop-${seed.color}` : "",
        stageCls: stage,
        issueCls: plot.issue ? `issue-${plot.issue}` : "",
        progress,
        remainText: ready ? "成熟" : hasCrop ? fmt((plot.readyAt - now) / 1000) : "可播种"
      };
    });

    const bagView = SEEDS.map((seed) => ({
      ...seed,
      count: state.bag[seed.id] || 0,
      selected: state.selectedSeed === seed.id
    }));

    const friendView = state.friends.map((friend) => {
      const left = FRIEND_COOLDOWN - Math.floor((now - friend.stolenAt) / 1000);
      return { ...friend, cooldown: left > 0 ? `${left}s` : "可采摘" };
    });

    const taskView = state.tasks.map((task) => ({
      ...task,
      canClaim: !task.done && task.progress >= task.target
    }));

    const decorView = DECORS.map((decor) => ({
      ...decor,
      owned: state.decors.includes(decor.id)
    }));

    this.setData({
      plotsView,
      bagView,
      friendView,
      taskView,
      decorView,
      weatherView: {
        ...weather,
        left: fmt((state.weatherUntil - now) / 1000)
      },
      timeText: new Date(now).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }),
      expText: `${state.exp}/${state.level * 120}`
    });
  },

  selectSeed(e) {
    const id = e.currentTarget.dataset.id;
    const state = clone(this.data.state);
    state.selectedSeed = id;
    state.activeTool = "plant";
    state.notice = `已选择${seedById(id).name}`;
    this.persist(state);
    this.rebuild(state, Date.now());
  },

  selectTool(e) {
    const id = e.currentTarget.dataset.id;
    const panel = id === "friend" ? "friends" : id === "build" ? "build" : "bag";
    const state = clone(this.data.state);
    state.activeTool = id;
    state.notice = TOOLS.find((item) => item.id === id).hint;
    this.persist(state);
    this.setData({ activePanel: panel, panelOpen: id === "friend" || id === "build" ? true : this.data.panelOpen });
    this.rebuild(state, Date.now());
  },

  togglePanel() {
    this.setData({ panelOpen: !this.data.panelOpen });
  },

  tapPlot(e) {
    const id = Number(e.currentTarget.dataset.id);
    const state = clone(this.data.state);
    const idx = state.plots.findIndex((plot) => plot.id === id);
    const plot = state.plots[idx];
    const now = Date.now();
    state.avatarX = plot.x + 26;
    state.avatarY = plot.y + 44;

    if (state.activeTool === "plant") {
      this.plant(state, idx, now);
    } else if (state.activeTool === "water") {
      this.water(state, idx, now);
    } else if (state.activeTool === "clean") {
      this.clean(state, idx);
    } else {
      this.harvest(state, idx, now);
    }
  },

  plant(state, idx, now) {
    const plot = state.plots[idx];
    if (plot.cropId) {
      state.notice = "这块地已经种上作物了";
      this.persist(state);
      this.rebuild(state, now);
      return;
    }
    const seed = seedById(state.selectedSeed);
    if (state.coins < seed.cost) {
      state.notice = "金币不足，先收获或出售作物";
      this.persist(state);
      this.rebuild(state, now);
      return;
    }
    state.coins -= seed.cost;
    state.plots[idx] = {
      ...plot,
      cropId: seed.id,
      plantedAt: now,
      readyAt: now + seed.grow * 1000,
      watered: false,
      issue: ""
    };
    state.notice = `${seed.name}种下啦`;
    this.persist(state);
    this.rebuild(state, now);
  },

  water(state, idx, now) {
    const plot = state.plots[idx];
    if (!plot.cropId) state.notice = "空地不用浇水";
    else if (plot.watered) state.notice = "这块地已经浇过水";
    else if (state.stamina <= 0) state.notice = "体力不足";
    else {
      state.stamina -= 1;
      state.plots[idx] = { ...plot, watered: true, readyAt: Math.max(now + 5000, plot.readyAt - 18000) };
      grantExp(state, 5);
      state.notice = "浇水完成，成熟时间缩短";
    }
    this.persist(state);
    this.rebuild(state, now);
  },

  clean(state, idx) {
    const plot = state.plots[idx];
    if (!plot.issue) state.notice = "这块地很干净";
    else {
      state.plots[idx] = { ...plot, issue: "" };
      grantExp(state, 6);
      state.notice = "清理完成，作物恢复健康";
    }
    this.persist(state);
    this.rebuild(state, Date.now());
  },

  harvest(state, idx, now) {
    const plot = state.plots[idx];
    if (!plot.cropId) state.notice = "这里还没有作物";
    else if (plot.readyAt > now) state.notice = `还需 ${fmt((plot.readyAt - now) / 1000)}`;
    else {
      const seed = seedById(plot.cropId);
      state.bag[seed.id] = (state.bag[seed.id] || 0) + 1;
      state.plots[idx] = { ...plot, cropId: "", plantedAt: 0, readyAt: 0, watered: false, issue: "" };
      grantExp(state, 12);
      bumpTask(state, "harvest", 1);
      state.notice = `收获${seed.name}，已放入仓库`;
    }
    this.persist(state);
    this.rebuild(state, now);
  },

  sellAll() {
    const state = clone(this.data.state);
    let income = 0;
    SEEDS.forEach((seed) => {
      const count = state.bag[seed.id] || 0;
      income += count * seed.sell;
      state.bag[seed.id] = 0;
    });
    state.coins += income;
    state.notice = income > 0 ? `出售完成，获得${income}金币` : "仓库还没有可出售作物";
    this.persist(state);
    this.rebuild(state, Date.now());
  },

  stealFriend(e) {
    const id = e.currentTarget.dataset.id;
    const state = clone(this.data.state);
    const friend = state.friends.find((item) => item.id === id);
    const now = Date.now();
    const left = FRIEND_COOLDOWN - Math.floor((now - friend.stolenAt) / 1000);
    if (left > 0) state.notice = `好友家还在冷却，剩余${left}秒`;
    else if (friend.ready <= 0) state.notice = "好友家暂时没有成熟作物";
    else {
      const seed = SEEDS[rand(0, SEEDS.length - 1)];
      friend.ready -= 1;
      friend.stolenAt = now;
      state.bag[seed.id] = (state.bag[seed.id] || 0) + 1;
      grantExp(state, 10);
      bumpTask(state, "friend", 1);
      state.notice = `拜访${friend.name}，带回${seed.name}`;
    }
    this.persist(state);
    this.rebuild(state, now);
  },

  buyDecor(e) {
    const id = e.currentTarget.dataset.id;
    const state = clone(this.data.state);
    const decor = DECORS.find((item) => item.id === id);
    if (state.decors.includes(id)) state.notice = "这件装饰已经拥有";
    else if (state.coins < decor.cost) state.notice = "金币不足，先卖点作物";
    else {
      state.coins -= decor.cost;
      state.decors.push(id);
      grantExp(state, 16);
      bumpTask(state, "build", 1);
      state.notice = `${decor.name}已经摆进家园`;
    }
    this.persist(state);
    this.rebuild(state, Date.now());
  },

  claimTask(e) {
    const id = e.currentTarget.dataset.id;
    const state = clone(this.data.state);
    const task = state.tasks.find((item) => item.id === id);
    if (!task || task.done || task.progress < task.target) {
      state.notice = "任务还没完成";
    } else {
      task.done = true;
      state.coins += task.reward;
      grantExp(state, 18);
      state.notice = `任务奖励 +${task.reward} 金币`;
    }
    this.persist(state);
    this.rebuild(state, Date.now());
  },

  resetGame() {
    const state = createState(Date.now());
    this.persist(state);
    this.rebuild(state, Date.now());
  }
});
