const config = require("./config");
const fallbackArticles = require("./fallbackArticles");
const { summarizeHome } = require("./storage");

function request(url, options = {}) {
  if (config.offlineDemo) return Promise.reject(new Error('公开离线演示未配置远程服务'));
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: options.method || "GET",
      data: options.data,
      header: options.header || {},
      timeout: options.timeout || config.networkTimeout,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        reject(new Error(`Request failed: ${res.statusCode}`));
      },
      fail: reject,
    });
  });
}

function buildTips(environment) {
  const tips = [];
  const aqi = environment.air.aqi || 0;
  const temp = environment.weather.temperature || 0;
  const wind = environment.weather.windSpeed || 0;

  if (aqi > 120) {
    tips.push("空气一般，今天更适合地铁或公交，减少长距离户外骑行。");
  } else {
    tips.push("空气状态不错，短距离步行或骑行会是很好的低碳选择。");
  }
  if (temp >= 28) {
    tips.push("气温较高，空调建议设到26°C左右，并优先遮阳和通风。");
  } else {
    tips.push("温度适中，优先自然通风，减少不必要的空调运行。");
  }
  if (wind >= 20) {
    tips.push("风速偏大，骑行注意安全，必要时可改乘公共交通。");
  }
  return tips;
}

function getCurrentLocation() {
  return new Promise((resolve) => {
    wx.getLocation({
      type: "gcj02",
      success: (res) => {
        resolve({
          granted: true,
          latitude: res.latitude,
          longitude: res.longitude,
        });
      },
      fail: () => {
        resolve({
          granted: false,
          latitude: config.defaultLocation.latitude,
          longitude: config.defaultLocation.longitude,
        });
      }
    });
  });
}

async function fetchEnvironment() {
  if (config.offlineDemo) return {
    locationLabel: '公开离线演示，不读取定位或实时天气',
    weather: { temperature: null, humidity: null, windSpeed: null },
    air: { aqi: null, pm25: null, pm10: null },
    tips: ['当前没有实时环境观测数据；碳估算不是认证碳资产。']
  };
  try {
    const location = await getCurrentLocation();
    const weatherQuery = `latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FShanghai`;
    const airQuery = `latitude=${location.latitude}&longitude=${location.longitude}&current=pm10,pm2_5,us_aqi,ozone,nitrogen_dioxide&timezone=Asia%2FShanghai`;
    const [weather, air] = await Promise.all([
      request(`${config.requestDomains.weather}/v1/forecast?${weatherQuery}`),
      request(`${config.requestDomains.air}/v1/air-quality?${airQuery}`)
    ]);

    const environment = {
      locationLabel: location.granted ? "已授权定位，使用当前城市环境数据" : `未授权定位，使用默认城市 ${config.defaultCity}`,
      weather: {
        temperature: weather.current && weather.current.temperature_2m,
        humidity: weather.current && weather.current.relative_humidity_2m,
        windSpeed: weather.current && weather.current.wind_speed_10m
      },
      air: {
        aqi: air.current && air.current.us_aqi,
        pm25: air.current && air.current.pm2_5,
        pm10: air.current && air.current.pm10
      }
    };
    environment.tips = buildTips(environment);
    return environment;
  } catch (error) {
    return {
      locationLabel: `环境服务暂不可用，已切换为默认城市 ${config.defaultCity}`,
      weather: {
        temperature: null,
        humidity: null,
        windSpeed: null
      },
      air: {
        aqi: null,
        pm25: null,
        pm10: null
      },
      tips: [
        "当前无法获取实时环境数据，今天依然可以从步行、骑行或公交出行开始。",
        "如果在室内，优先自然通风并减少不必要的照明和空调使用。"
      ]
    };
  }
}

async function fetchArticles() {
  if (!config.cloudEnabled || config.offlineDemo) return fallbackArticles;
  try {
    const fields = 'slug,title,tag,summary,hero_image_url,facts,comic_panels,paragraphs,source_note,reading_level,published_at';
    const url = `${config.supabase.url}/rest/v1/ai_articles?select=${fields}&status=eq.published&order=published_at.desc&limit=20`;
    const data = await request(url, {
      header: {
        apikey: config.supabase.anonKey,
        Authorization: `Bearer ${config.supabase.anonKey}`
      }
    });
    if (Array.isArray(data) && data.length > 0) return data;
    return fallbackArticles;
  } catch (error) {
    console.error('[api] fetchArticles failed', error);
    return fallbackArticles;
  }
}

module.exports = {
  request,
  fetchEnvironment,
  fetchArticles,
  summarizeHome
};
