const config = {
  offlineDemo: true,
  appName: "CarbonPie 碳果派",
  version: "1.0.0",
  defaultCity: "大连",
  defaultLocation: {
    latitude: 38.9140,
    longitude: 121.6147,
  },
  networkTimeout: 10000,
  supabase: {
    url: "",
    anonKey: "",
  },
  requestDomains: {
    weather: "https://api.open-meteo.com",
    air: "https://air-quality-api.open-meteo.com",
    supabase: ""
  }
};

config.cloudEnabled = !!(config.supabase.url && config.supabase.anonKey);

module.exports = config;
