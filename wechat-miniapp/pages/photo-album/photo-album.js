const { listPhotoCheckins, ACTIONS } = require("../../utils/storage");

Page({
  data: {
    allPhotos: [],
    filteredPhotos: [],
    categories: [{ id: "全部", title: "全部" }],
    currentCategory: "全部"
  },

  onLoad() {
    const categories = [{ id: "全部", title: "全部" }, ...ACTIONS.map(a => ({ id: a.id, title: a.title }))];
    this.setData({ categories });
    this.loadPhotos();
  },

  onShow() {
    this.loadPhotos();
  },

  loadPhotos() {
    const allPhotos = listPhotoCheckins();
    this.setData({ allPhotos });
    this.filterByCategory(this.data.currentCategory);
  },

  filterByCategory(category) {
    this.setData({ currentCategory: category });
    const { allPhotos } = this.data;
    if (category === "全部") {
      this.setData({ filteredPhotos: allPhotos });
      return;
    }
    this.setData({
      filteredPhotos: allPhotos.filter(p => p.category === category)
    });
  },

  onCategoryTap(e) {
    const { category } = e.currentTarget.dataset;
    this.filterByCategory(category);
  },

  previewImage(e) {
    const { src } = e.currentTarget.dataset;
    if (!src) {
      wx.showToast({ title: "该图片仅在原设备可预览", icon: "none" });
      return;
    }
    const urls = this.data.filteredPhotos.map(p => p.localPath).filter(Boolean);
    wx.previewImage({ current: src, urls });
  }
});
