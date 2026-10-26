const config = require('./utils/config');
const { getProfile, saveProfile, loadFromCloud } = require('./utils/storage');

const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = config.supabase;
const CLOUD_ENABLED = config.cloudEnabled;

App({
  globalData: {
    selectedArticle: null,
    isLogin: false,
    openid: null,
    userId: null,
    cloudEnabled: CLOUD_ENABLED,
  },

  onLaunch() {
    if (CLOUD_ENABLED) {
      this.wxCloudLogin();
    } else {
      this.fallbackLocalLogin();
    }
  },

  syncGlobalLoginState({ isLogin, openid, userId }) {
    this.globalData.isLogin = !!isLogin;
    this.globalData.openid = openid || null;
    this.globalData.userId = userId || null;
    if (openid) wx.setStorageSync('wx_openid', openid);
    if (userId) {
      wx.setStorageSync('wx_user_id', userId);
    } else {
      wx.removeStorageSync('wx_user_id');
    }
  },

  applyRemoteProfile({ nickname, avatar }) {
    if (!nickname && !avatar) return;
    const profile = getProfile();
    saveProfile({
      ...profile,
      nickname: nickname || profile.nickname,
      avatar: avatar || profile.avatar,
    });
  },

  wxCloudLogin() {
    wx.login({
      success: (res) => {
        if (!res.code) {
          this.fallbackLocalLogin();
          return;
        }
        wx.request({
          url: `${SUPABASE_URL}/functions/v1/wx-login`,
          method: 'POST',
          timeout: config.networkTimeout,
          header: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
          },
          data: { code: res.code },
          success: (resp) => {
            const { openid, user_id, nickname, avatar } = resp.data || {};
            if (!openid) {
              this.fallbackLocalLogin();
              return;
            }
            this.syncGlobalLoginState({
              isLogin: true,
              openid,
              userId: user_id,
            });
            this.applyRemoteProfile({ nickname, avatar });
            loadFromCloud(user_id);
          },
          fail: () => {
            this.fallbackLocalLogin();
          }
        });
      },
      fail: () => {
        this.fallbackLocalLogin();
      }
    });
  },

  fallbackLocalLogin() {
    let openid = wx.getStorageSync('wx_openid');
    if (!openid) {
      openid = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    }
    this.syncGlobalLoginState({
      isLogin: false,
      openid,
      userId: null,
    });
  },
});
