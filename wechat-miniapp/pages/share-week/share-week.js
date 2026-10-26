const config = require("../../utils/config");
const { getWeekReport, summarizeHome, exportJSON } = require("../../utils/storage");

Page({
  data: {
    report: null,
    weekDays: [],
    maxCarbon: 0,
    savedFilePath: ""
  },

  onLoad() {
    this.loadReport();
    wx.showShareMenu({ withShareTicket: true, menus: ["shareAppMessage", "shareTimeline"] });
  },

  onShow() {
    this.loadReport();
  },

  loadReport() {
    const report = getWeekReport();
    const summary = summarizeHome();
    const weekData = summary.weekData || [];
    const maxCarbon = Math.max(...weekData.map(d => d.carbon), 0.01);

    this.setData({
      report,
      weekDays: weekData.map(d => ({
        ...d,
        height: maxCarbon > 0 ? Math.round((d.carbon / maxCarbon) * 100) : 0
      })),
      maxCarbon
    });
  },

  onSavePoster() {
    if (!this.data.report) {
      wx.showToast({ title: "暂无可保存的周报", icon: "none" });
      return;
    }
    try {
      const fs = wx.getFileSystemManager();
      const filePath = `${wx.env.USER_DATA_PATH}/carbonpie-week-report-${Date.now()}.json`;
      const content = JSON.stringify({
        appName: config.appName,
        generatedAt: new Date().toISOString(),
        report: this.data.report,
        weekDays: this.data.weekDays,
        backup: JSON.parse(exportJSON())
      }, null, 2);
      fs.writeFileSync(filePath, content, "utf8");
      this.setData({ savedFilePath: filePath });
      wx.openDocument({
        filePath,
        fileType: "json",
        showMenu: true,
        success: () => wx.showToast({ title: "周报文件已生成", icon: "success" }),
        fail: () => wx.showToast({ title: "已生成周报文件", icon: "none" }),
      });
    } catch (error) {
      wx.showToast({ title: "周报保存失败", icon: "none" });
    }
  },

  onShareAppMessage() {
    const { report } = this.data;
    return {
      title: `${report.nickname} 本周减碳 ${report.weekCarbon}kg`,
      path: "/pages/home/home"
    };
  },

  onShareTimeline() {
    const { report } = this.data;
    return {
      title: `${report.nickname} 本周减碳 ${report.weekCarbon}kg`
    };
  }
});
