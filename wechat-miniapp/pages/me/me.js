const config = require("../../utils/config");
const storage = require("../../utils/storage");

Page({
  data: {
    totalCarbon: 0,
    activeDays: 0,
    checkinStreak: 0,
    level: 1,
    levelTitle: "见习园丁",
    carbonCoins: 0,
    nickname: "碳友",
    cloudEnabled: false,
    cloudStatus: "本机模式",
    snackMsg: "",
    showClearModal: false,
    activityList: [
      { icon: "leaf", title: "绿色发现", sub: "浏览科普与社区挑战", url: "/pages/discover/discover" },
      { icon: "home", title: "我的家园", sub: "查看家园经营状态", url: "/pages/grow/grow" },
      { icon: "photo", title: "打卡影像册", sub: "查看我保存的照片记录", url: "/pages/photo-album/photo-album" },
      { icon: "ai", title: "低碳锦囊", sub: "查看行动建议与清单", url: "/pages/ai/ai" },
      { icon: "rank", title: "低碳排行榜", sub: "查看减碳排行", url: "" },
    ],
    toolList: [
      { icon: "json", title: "导出记录 JSON", sub: "备份完整低碳记录数据", action: "exportJSON" },
      { icon: "csv", title: "导出记录 CSV", sub: "导出便于表格整理的数据", action: "exportCSV" },
      { icon: "poster", title: "导出周报文件", sub: "导出本周数据快照文件", url: "/pages/share-week/share-week" },
      { icon: "edit", title: "编辑资料", sub: "修改昵称和个人信息", url: "/pages/profile-edit/profile-edit" },
      { icon: "about", title: "关于 / 设置", sub: "版本与方法学说明", url: "/pages/about/about" },
      { icon: "privacy", title: "隐私政策", sub: "数据使用说明", url: "/pages/privacy/privacy" },
    ],
  },

  onLoad() {
    this.refreshData();
  },

  onShow() {
    this.refreshData();
  },

  refreshData() {
    const summary = storage.summarizeHome();
    const homestead = storage.getHomestead();
    const profile = storage.getProfile();
    const app = getApp();
    const levelTitle = storage.getLevelTitle(homestead.level);
    const cloudEnabled = !!(app.globalData && app.globalData.cloudEnabled);
    const cloudStatus = app.globalData && app.globalData.isLogin ? "云端同步已连接" : (cloudEnabled ? "云端暂未连接，当前使用本机数据" : "本机模式");

    this.setData({
      totalCarbon: summary.totalCarbon,
      activeDays: summary.activeDays,
      checkinStreak: homestead.checkin_streak || 0,
      level: homestead.level || 1,
      levelTitle: levelTitle,
      carbonCoins: homestead.carbon_coins || 0,
      nickname: profile.nickname || "碳友",
      cloudEnabled,
      cloudStatus,
      version: config.version,
    });
  },

  showSnack(msg) {
    this.setData({ snackMsg: msg });
    setTimeout(() => {
      this.setData({ snackMsg: "" });
    }, 2400);
  },

  onActivityTap(e) {
    const { url } = e.currentTarget.dataset;
    if (!url) {
      this.showSnack("排行榜功能暂为本地预留入口");
      return;
    }
    const tabPages = ["/pages/home/home", "/pages/record/record", "/pages/discover/discover", "/pages/grow/grow", "/pages/me/me"];
    if (tabPages.includes(url)) {
      wx.switchTab({ url });
    } else {
      wx.navigateTo({ url });
    }
  },

  onToolTap(e) {
    const { action, url } = e.currentTarget.dataset;
    if (action === "exportJSON") {
      this.handleExportJSON();
    } else if (action === "exportCSV") {
      this.handleExportCSV();
    } else if (url) {
      wx.navigateTo({ url: url });
    }
  },

  handleExportJSON() {
    const content = storage.exportJSON();
    const fs = wx.getFileSystemManager();
    const filePath = `${wx.env.USER_DATA_PATH}/carbonpie-export-${Date.now()}.json`;
    fs.writeFileSync(filePath, content, "utf8");
    wx.openDocument({
      filePath: filePath,
      fileType: "json",
      showMenu: true,
      success: () => this.showSnack("JSON 文件已生成"),
      fail: () => this.showSnack("导出失败"),
    });
  },

  handleExportCSV() {
    const content = storage.exportCSV();
    const fs = wx.getFileSystemManager();
    const filePath = `${wx.env.USER_DATA_PATH}/carbonpie-export-${Date.now()}.csv`;
    fs.writeFileSync(filePath, content, "utf8");
    wx.openDocument({
      filePath: filePath,
      fileType: "csv",
      showMenu: true,
      success: () => this.showSnack("CSV 文件已生成"),
      fail: () => this.showSnack("导出失败"),
    });
  },

  goShop() {
    wx.switchTab({ url: "/pages/grow/grow" });
  },

  showClearConfirm() {
    this.setData({ showClearModal: true });
  },

  cancelClear() {
    this.setData({ showClearModal: false });
  },

  confirmClear() {
    storage.wipeAllData();
    this.setData({ showClearModal: false });
    this.showSnack("本机数据已清除");
    this.refreshData();
  },
});
