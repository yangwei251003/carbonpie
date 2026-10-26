const {
  getHomestead,
  getLevelTitle,
  interactHomestead,
  claimDailyCheckin,
  buyAndEquipDecor,
  getPlots,
  harvestPlot,
  DECOR_CATALOG,
  HOMESTEAD_XP_PER_LEVEL,
} = require("../../utils/storage");

Page({
  data: {
    homestead: null,
    plots: [],
    decor: [],
    selectedPlotIndex: 0,
    tool: 'harvest',
    snackVisible: false,
    snackText: '',
    snackTimer: null,
    levelTitle: '',
    xpProgress: 0,
    remainingWater: 3,
    remainingClean: 3,
    checkedInToday: false,
    tools: [
      { key: 'water', label: '浇水', icon: '💧' },
      { key: 'clean', label: '打扫', icon: '🧹' },
      { key: 'harvest', label: '收获', icon: '🧺' },
    ],
  },

  onLoad() {
    this.refreshData();
  },

  onShow() {
    this.refreshData();
  },

  refreshData() {
    const homestead = getHomestead();
    const plots = getPlots();
    const decor = DECOR_CATALOG.map((item, index) => ({
      ...item,
      unlocked: (homestead.owned_decor || ['tree']).includes(item.id),
      equipped: homestead.equipped_decor === item.id,
      leftPos: 20 + index * 110,
      topPos: index % 2 === 0 ? 80 : 130,
    }));

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const actionDate = homestead.last_action_date;
    const remainingWater = actionDate === today ? Math.max(0, 3 - (homestead.water_count || 0)) : 3;
    const remainingClean = actionDate === today ? Math.max(0, 3 - (homestead.clean_count || 0)) : 3;
    const checkedInToday = homestead.last_checkin === today;
    const xpProgress = Math.round(((homestead.xp || 0) % HOMESTEAD_XP_PER_LEVEL) / HOMESTEAD_XP_PER_LEVEL * 100);
    const levelTitle = getLevelTitle(homestead.level || 1);

    const decorUnlockCount = decor.filter(d => d.unlocked).length;
    const decorTotalCount = decor.length;
    const xpRemainder = (homestead.xp || 0) % HOMESTEAD_XP_PER_LEVEL;

    this.setData({
      homestead,
      plots,
      decor,
      decorUnlockCount,
      decorTotalCount,
      xpRemainder,
      remainingWater,
      remainingClean,
      checkedInToday,
      xpProgress,
      levelTitle,
    });
  },

  selectTool(event) {
    this.setData({ tool: event.currentTarget.dataset.key });
  },

  selectPlot(event) {
    const idx = event.currentTarget.dataset.index;
    this.setData({ selectedPlotIndex: idx });
    const plot = this.data.plots[idx];
    if (this.data.tool === 'harvest') {
      this.handleHarvest(plot);
    } else if (this.data.tool === 'water') {
      this.handleAction('water');
    } else {
      this.handleAction('clean');
    }
  },

  handleHarvest(plot) {
    if (!plot) {
      this.showSnack('请选择一块地');
      return;
    }
    const result = harvestPlot(plot.id);
    if (!result.success) {
      this.showSnack(result.msg);
      return;
    }
    this.showSnack(`收获 ${result.crop.crop}，获得 ${result.gainedCoins} 碳币和 ${result.gainedXp} XP`);
    this.refreshData();
  },

  handleAction(action) {
    const res = interactHomestead(action);
    if (!res.success) {
      this.showSnack(res.msg);
    } else {
      this.showSnack(`${res.msg} ✨ +${res.gainedXp} XP +${res.gainedCoins} 碳币`);
      this.refreshData();
    }
  },

  handleWater() {
    this.handleAction('water');
  },

  handleClean() {
    this.handleAction('clean');
  },

  handleCheckin() {
    const res = claimDailyCheckin();
    if (res.already) {
      this.showSnack('今日巡园已完成，明天再来 🌟');
    } else {
      this.showSnack(`🎊 巡园完成！+${res.gained} XP，连签第 ${res.streak} 天`);
    }
    this.refreshData();
  },

  handleEquip(event) {
    const decorId = event.currentTarget.dataset.id;
    const res = buyAndEquipDecor(decorId);
    this.showSnack(res.msg);
    if (res.success) this.refreshData();
  },

  goRecord() {
    wx.switchTab({ url: '/pages/record/record' });
  },

  goFarmHome() {
    wx.navigateTo({ url: "/pages/farm-home/index" });
  },

  showSnack(text) {
    if (this.data.snackTimer) clearTimeout(this.data.snackTimer);
    this.setData({ snackText: text, snackVisible: true });
    const timer = setTimeout(() => {
      this.setData({ snackVisible: false });
    }, 2800);
    this.setData({ snackTimer: timer });
  },
});
