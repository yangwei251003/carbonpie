const GUIDE_CARDS = [
  {
    id: "commute",
    icon: "🚲",
    title: "通勤减碳",
    tag: "出行",
    saving: "约 0.17kg/km",
    summary: "3公里以内优先步行或骑行，较远距离可选择公交、地铁或拼车。",
    steps: [
      "把常去地点分成步行、骑行、公交三类",
      "每周至少安排2次低碳通勤",
      "在记录页填写里程，沉淀为减碳量和碳币"
    ]
  },
  {
    id: "power",
    icon: "💡",
    title: "节电清单",
    tag: "居家",
    saving: "约 0.58kg/度",
    summary: "从空调、照明、待机耗电入手，让节能变成顺手的小动作。",
    steps: [
      "夏季空调尽量设置在26摄氏度左右",
      "离开房间及时关灯，拔掉不用的充电器",
      "优先使用自然通风和节能灯具"
    ]
  },
  {
    id: "plate",
    icon: "🥗",
    title: "光盘与低碳餐",
    tag: "饮食",
    saving: "约 0.4kg/次",
    summary: "减少食物浪费、适当增加蔬菜比例，是最容易坚持的低碳行动之一。",
    steps: [
      "点餐先少量，不够再加",
      "每周尝试1次低碳餐或素食餐",
      "把光盘行动拍照打卡，留下自己的绿色相册"
    ]
  },
  {
    id: "recycle",
    icon: "♻️",
    title: "循环回收",
    tag: "资源",
    saving: "约 0.3kg/次",
    summary: "把纸张、塑料瓶、旧衣物和电子产品送入合适的回收渠道。",
    steps: [
      "在家设置一个小型可回收物收纳区",
      "纸张双面使用后再回收",
      "旧衣物优先捐赠、改造或规范回收"
    ]
  }
];

const DAILY_TIPS = [
  "出门前检查灯、空调和充电器，30秒就能减少一部分待机耗电。",
  "短途出行少开一次车，今天的减碳量会比想象中更可观。",
  "自带水杯和购物袋，能同时减少塑料垃圾和一次性用品消耗。",
  "拍下真实低碳行动，比只看数据更容易坚持下去。"
];

Page({
  data: {
    guideCards: GUIDE_CARDS,
    activeCardId: "commute",
    dailyTip: DAILY_TIPS[0]
  },

  onLoad() {
    const dayIndex = new Date().getDate() % DAILY_TIPS.length;
    this.setData({ dailyTip: DAILY_TIPS[dayIndex] });
  },

  toggleCard(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      activeCardId: this.data.activeCardId === id ? "" : id
    });
  },

  goRecord() {
    wx.switchTab({ url: "/pages/record/record" });
  },

  goDiscover() {
    wx.switchTab({ url: "/pages/discover/discover" });
  },

  goAlbum() {
    wx.navigateTo({ url: "/pages/photo-album/photo-album" });
  }
});
