const { getProfile, saveProfile } = require("../../utils/storage");

const CITIES = [
  "北京", "上海", "广州", "深圳", "杭州", "南京", "苏州", "成都",
  "武汉", "西安", "重庆", "天津", "长沙", "郑州", "青岛", "大连",
  "沈阳", "哈尔滨", "福州", "厦门", "昆明", "贵阳", "南宁", "海口",
  "合肥", "南昌", "济南", "太原", "石家庄", "兰州", "银川", "西宁",
  "呼和浩特", "乌鲁木齐", "拉萨", "其他"
];

Page({
  data: {
    nickname: "",
    bio: "",
    city: "",
    cityIndex: 0,
    cities: CITIES
  },

  onLoad() {
    this.loadProfile();
  },

  loadProfile() {
    const profile = getProfile();
    const cityIndex = CITIES.indexOf(profile.city);
    this.setData({
      nickname: profile.nickname || "",
      bio: profile.bio || "",
      city: profile.city || "大连",
      cityIndex: cityIndex >= 0 ? cityIndex : 0
    });
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  onBioInput(e) {
    this.setData({ bio: e.detail.value });
  },

  onCityChange(e) {
    const index = Number(e.detail.value);
    this.setData({
      cityIndex: index,
      city: CITIES[index]
    });
  },

  onSave() {
    const { nickname, bio, city } = this.data;
    if (!nickname.trim()) {
      wx.showToast({ title: "昵称不能为空", icon: "none" });
      return;
    }
    const profile = getProfile();
    saveProfile({ ...profile, nickname: nickname.trim(), bio: bio.trim(), city });
    wx.showToast({ title: "保存成功", icon: "success" });
    setTimeout(() => wx.navigateBack(), 1000);
  }
});
