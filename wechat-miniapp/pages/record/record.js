const { ACTIONS, savePhotoCheckin, saveRecord, listPhotoCheckins, listRecords } = require("../../utils/storage");

Page({
    data: {
        actions: ACTIONS,
        selectedActionId: ACTIONS[0].id,
        amount: "2",
        note: "",
        recentRecords: [],
        recentPhotos: []
    },

    onLoad() {
        this.refreshLocalData();
    },

    onShow() {
        this.refreshLocalData();
    },

    refreshLocalData() {
        this.setData({
            recentRecords: listRecords().slice(0, 5),
            recentPhotos: listPhotoCheckins().slice(0, 6)
        });
    },

    chooseAction(event) {
        this.setData({ selectedActionId: event.currentTarget.dataset.id });
    },

    handleAmountInput(event) {
        this.setData({ amount: event.detail.value });
    },

    handleNoteInput(event) {
        this.setData({ note: event.detail.value });
    },

    submitRecord() {
        const amount = Number(this.data.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            wx.showToast({ title: "请输入有效数值", icon: "none" });
            return;
        }
        const record = saveRecord({
            actionId: this.data.selectedActionId,
            amount,
            note: this.data.note
        });
        this.setData({ note: "" });
        this.refreshLocalData();
        wx.showToast({
            title: `已获得 ${record.reward} 碳币`,
            icon: "success"
        });
    },

    async handlePhotoCheckin() {
        try {
            const result = await new Promise((resolve, reject) => {
                wx.chooseMedia({
                    count: 1,
                    mediaType: ["image"],
                    sourceType: ["camera", "album"],
                    success: resolve,
                    fail: reject
                });
            });
            const file = result.tempFiles && result.tempFiles[0];
            if (!file) return;
            const saved = await new Promise((resolve, reject) => {
                wx.saveFile({
                    tempFilePath: file.tempFilePath,
                    success: resolve,
                    fail: reject
                });
            });
            const action = ACTIONS.find((item) => item.id === this.data.selectedActionId) || ACTIONS[0];
            savePhotoCheckin({
                localPath: saved.savedFilePath,
                category: action.id,
                title: `${action.title}影像打卡`,
                note: this.data.note,
                encouragement: "你把一次真实的低碳行动拍下来了，这会让坚持更有感觉。",
                reward: 28
            });
            this.refreshLocalData();
            wx.showToast({ title: "拍照打卡成功", icon: "success" });
        } catch (error) {
            wx.showToast({ title: "未完成拍照打卡", icon: "none" });
        }
    },

    goAlbum() {
        wx.navigateTo({ url: "/pages/photo-album/photo-album" });
    }
});
