const { fetchEnvironment, fetchArticles } = require("../../utils/api");
const { summarizeHome, getHomestead, getLevelTitle } = require("../../utils/storage");

Page({
  data: {
    loading: true,
    environment: null,
    summary: null,
    featuredArticle: null,
    homestead: null,
    levelTitle: "",
    articleCount: 0
  },

  onLoad() {
    this.loadPage();
  },

  onShow() {
    this.loadLocalData();
  },

  onPullDownRefresh() {
    this.loadPage().finally(() => wx.stopPullDownRefresh());
  },

  async loadPage() {
    this.setData({ loading: true });
    try {
      const [environment, articles] = await Promise.all([fetchEnvironment(), fetchArticles()]);
      this.setData({
        environment,
        featuredArticle: articles[0] || null,
        articleCount: articles.length,
      });
      this.loadLocalData();
    } finally {
      this.setData({ loading: false });
    }
  },

  loadLocalData() {
    const summary = summarizeHome();
    const homestead = getHomestead();
    this.setData({
      summary,
      homestead,
      levelTitle: getLevelTitle(homestead.level || 1)
    });
  },

  handleRelocate() {
    this.loadPage();
  },

  goRecord() {
    wx.switchTab({ url: "/pages/record/record" });
  },

  goDiscover() {
    wx.switchTab({ url: "/pages/discover/discover" });
  },

  goGrow() {
    wx.switchTab({ url: "/pages/grow/grow" });
  },

  goAI() {
    wx.navigateTo({ url: "/pages/ai/ai" });
  },

  goWeekReport() {
    wx.navigateTo({ url: "/pages/share-week/share-week" });
  },

  openArticle() {
    if (!this.data.featuredArticle) {
      wx.showToast({ title: "暂无可查看文章", icon: "none" });
      return;
    }
    getApp().globalData.selectedArticle = this.data.featuredArticle;
    wx.navigateTo({
      url: `/pages/article/article?slug=${this.data.featuredArticle.slug}`
    });
  }
});
