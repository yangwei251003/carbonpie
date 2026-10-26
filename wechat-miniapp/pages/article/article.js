const { fetchArticles } = require("../../utils/api");

Page({
  data: {
    article: null,
    loading: true,
    missing: false
  },

  onLoad(options) {
    const slug = options.slug || "";
    const globalArticle = getApp().globalData.selectedArticle;
    if (globalArticle && (!slug || globalArticle.slug === slug)) {
      this.setData({ article: globalArticle, loading: false, missing: false });
      return;
    }
    this.loadArticle(slug);
  },

  async loadArticle(slug) {
    this.setData({ loading: true, missing: false });
    try {
      const articles = await fetchArticles();
      let article = null;
      if (slug) {
        article = articles.find(a => a.slug === slug) || null;
      }
      if (!article && articles.length > 0 && !slug) {
        article = articles[0];
      }
      this.setData({ article, loading: false, missing: !article });
    } catch (err) {
      console.error("[article] loadArticle failed", err);
      this.setData({ article: null, loading: false, missing: true });
    }
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: "/pages/home/home" }) });
  },

  onComicImageError(e) {
    const idx = e.currentTarget.dataset.index;
    const article = { ...this.data.article };
    const panels = [...(article.comic_panels || [])];
    if (panels[idx]) {
      panels[idx] = { ...panels[idx], imageUrl: null };
      article.comic_panels = panels;
      this.setData({ article });
      console.warn(`[article] comic panel ${idx} image load failed, removed`);
    }
  },

  share() {
    if (!this.data.article) {
      wx.showToast({ title: "当前文章不可分享", icon: "none" });
      return;
    }
    wx.showShareMenu({ withShareTicket: true, menus: ["shareAppMessage", "shareTimeline"] });
  },

  onShareAppMessage() {
    const { article } = this.data;
    if (!article) return {};
    return {
      title: article.title || "碳果派科普",
      path: `/pages/article/article?slug=${article.slug || ""}`
    };
  },

  onShareTimeline() {
    const { article } = this.data;
    if (!article) return {};
    return {
      title: article.title || "碳果派科普"
    };
  }
});
