const { fetchArticles } = require("../../utils/api");

const FILTERS = [
  { key: "骑行", icon: "bicycle" },
  { key: "节电", icon: "lightning-bolt" },
  { key: "素食", icon: "food-apple" },
  { key: "回收", icon: "recycle" },
  { key: "新闻资讯", icon: "newspaper" }
];

const FEATURED_SLUG = "ai-low-carbon-news-brief";

const CHALLENGES = [
  { id: "1", title: "7天零废弃挑战赛", progress: 4, total: 7, progressPercent: Math.round(4 / 7 * 100), badge: "精选" }
];

const GROUPS = [
  { id: "1", icon: "bicycle", name: "单车通勤周", count: "1,284" },
  { id: "2", icon: "food-apple", name: "周一素食小组", count: "3,510" },
  { id: "3", icon: "solar-power", name: "太阳能改造计划", count: "842" }
];

const MOCK_FRIEND_FEED = [
  {
    id: "1",
    name: "林小绿",
    avatar: "林",
    action: "骑行通勤",
    summary: "今天骑车去公司，5公里只用了15分钟，既锻炼身体又零排放！",
    kg: "~0.85kg",
    time: "今天 08:32"
  },
  {
    id: "2",
    name: "张碳碳",
    avatar: "张",
    action: "素食午餐",
    summary: "中午在公司食堂选择了全素套餐，少了一份肉食的碳足迹。",
    kg: "~0.42kg",
    time: "今天 12:15"
  },
  {
    id: "3",
    name: "王节能",
    avatar: "王",
    action: "节电行动",
    summary: "下班前关掉了办公室所有不必要的灯光和空调，节约用电从细节做起。",
    kg: "~0.28kg",
    time: "昨天 18:05"
  }
];

Page({
  data: {
    activeTab: "articles",
    search: "",
    activeFilter: null,
    filters: FILTERS,
    loading: true,
    articles: [],
    filteredArticles: [],
    featured: null,
    others: [],
    articleError: "",
    challenges: CHALLENGES,
    groups: GROUPS,
    friendFeed: MOCK_FRIEND_FEED
  },

  onLoad() {
    this.loadArticles();
  },

  onShow() {
    if (!this.data.loading) {
      this.loadArticles();
    }
  },

  async loadArticles() {
    this.setData({ loading: true, articleError: "" });
    try {
      const articles = await fetchArticles();
      this.setData({ articles });
      this.applyFilter();
      if (!articles.length) {
        this.setData({ articleError: "当前暂无可展示文章" });
      }
    } catch (err) {
      console.error("[discover] loadArticles failed", err);
      this.setData({
        articles: [],
        filteredArticles: [],
        featured: null,
        others: [],
        articleError: "文章内容暂时加载失败，请稍后重试"
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  applyFilter() {
    const { articles, search, activeFilter } = this.data;
    let list = articles;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          (a.title || "").toLowerCase().includes(q) ||
          (a.tag || "").toLowerCase().includes(q) ||
          (a.summary || "").toLowerCase().includes(q)
      );
    }
    if (activeFilter) {
      list = list.filter((a) => (a.tag || "") === activeFilter);
    }
    const featured = list.find((a) => a.slug === FEATURED_SLUG) || list[0] || null;
    const others = list.filter((a) => !featured || a.slug !== featured.slug);
    this.setData({
      filteredArticles: list,
      featured,
      others,
      articleError: list.length ? "" : "没有找到符合条件的文章"
    });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  onSearchInput(e) {
    this.setData({ search: e.detail.value });
    this.applyFilter();
  },

  clearSearch() {
    this.setData({ search: "" });
    this.applyFilter();
  },

  toggleFilter(e) {
    const key = e.currentTarget.dataset.key;
    const current = this.data.activeFilter;
    this.setData({ activeFilter: current === key ? null : key });
    this.applyFilter();
  },

  openArticle(e) {
    const slug = e.currentTarget.dataset.slug;
    if (!slug) {
      wx.showToast({ title: "文章暂不可用", icon: "none" });
      return;
    }
    const article = this.data.articles.find((item) => item.slug === slug) || null;
    getApp().globalData.selectedArticle = article;
    wx.navigateTo({ url: "/pages/article/article?slug=" + slug });
  },

  openFeatured() {
    if (!this.data.featured) {
      wx.showToast({ title: "暂无推荐文章", icon: "none" });
      return;
    }
    getApp().globalData.selectedArticle = this.data.featured;
    wx.navigateTo({ url: "/pages/article/article?slug=" + this.data.featured.slug });
  }
});
