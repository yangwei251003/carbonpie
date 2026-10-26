import * as Location from 'expo-location';
import { PUBLIC_OFFLINE_DEMO } from '@/lib/publicDemo';

export type GeoPoint = {
  name: string;
  latitude: number;
  longitude: number;
};

export type LocationSource = 'device' | 'city_fallback' | 'default_fallback';

export type EnvironmentSnapshot = {
  location: GeoPoint;
  locationSource: LocationSource;
  locationLabel: string;
  permissionGranted: boolean;
  weather: {
    temperature: number | null;
    humidity: number | null;
    windSpeed: number | null;
    weatherCode: number | null;
  };
  air: {
    aqi: number | null;
    pm25: number | null;
    pm10: number | null;
    ozone: number | null;
    nitrogenDioxide: number | null;
  };
  openAq: {
    stationName: string;
    provider?: string;
    parameters: string[];
  } | null;
  tips: string[];
  updatedAt: string;
};

const DEFAULT_LOCATION: GeoPoint = {
  name: '大连',
  latitude: 38.914,
  longitude: 121.6147,
};

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function buildTips(snapshot: Pick<EnvironmentSnapshot, 'weather' | 'air'>): string[] {
  const tips: string[] = [];
  const aqi = snapshot.air.aqi ?? 0;
  const wind = snapshot.weather.windSpeed ?? 0;
  const temp = snapshot.weather.temperature ?? 0;

  if (aqi > 120) {
    tips.push('空气质量偏弱，今天更适合公交/地铁出行，减少户外高强度骑行。');
  } else {
    tips.push('空气质量尚可，短距离步行或骑行会是很棒的低碳选择。');
  }
  if (temp >= 28) {
    tips.push('气温较高，空调建议设置在 26°C 左右，并配合风扇和遮阳。');
  } else if (temp <= 8) {
    tips.push('气温偏低，注意保暖；离开房间时及时关闭取暖和照明设备。');
  } else {
    tips.push('温度舒适，优先自然通风，减少空调和新风设备长时间运行。');
  }
  if (wind >= 20) {
    tips.push('风速较大，骑行注意安全；可选择公共交通完成今日低碳打卡。');
  }
  return tips.slice(0, 3);
}

export async function geocodeCity(query: string): Promise<GeoPoint> {
  if (PUBLIC_OFFLINE_DEMO) return DEFAULT_LOCATION;
  const q = query.trim();
  if (!q) return DEFAULT_LOCATION;

  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      q,
      limit: '1',
      'accept-language': 'zh-CN',
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { 'User-Agent': 'CarbonPie/1.0 low-carbon-demo' },
    });
    if (!response.ok) return DEFAULT_LOCATION;
    const data = await response.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first?.lat || !first?.lon) return DEFAULT_LOCATION;
    return {
      name: first.name ?? q,
      latitude: Number(first.lat),
      longitude: Number(first.lon),
    };
  } catch {
    return DEFAULT_LOCATION;
  }
}

async function reverseGeocodeLocation(latitude: number, longitude: number): Promise<string> {
  try {
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    const first = places[0];
    return first?.city || first?.district || first?.region || '当前位置';
  } catch {
    return '当前位置';
  }
}

export async function getDeviceGeoPoint(): Promise<{ point: GeoPoint; permissionGranted: boolean } | null> {
  if (PUBLIC_OFFLINE_DEMO) return null;
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return null;
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const name = await reverseGeocodeLocation(current.coords.latitude, current.coords.longitude);
    return {
      permissionGranted: true,
      point: {
        name,
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      },
    };
  } catch {
    return null;
  }
}

async function fetchOpenAqStation(location: GeoPoint): Promise<EnvironmentSnapshot['openAq']> {
  const key = process.env.EXPO_PUBLIC_OPENAQ_API_KEY;
  if (!key) return null;
  try {
    const params = new URLSearchParams({
      coordinates: `${location.latitude},${location.longitude}`,
      radius: '25000',
      limit: '1',
    });
    const response = await fetch(`https://api.openaq.org/v3/locations?${params.toString()}`, {
      headers: { 'X-API-Key': key },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const station = data.results?.[0];
    if (!station) return null;
    return {
      stationName: station.name,
      provider: station.provider?.name,
      parameters: (station.sensors ?? []).slice(0, 4).map((sensor: any) => sensor.parameter?.displayName ?? sensor.name).filter(Boolean),
    };
  } catch {
    return null;
  }
}

export async function fetchEnvironmentSnapshot(city = DEFAULT_LOCATION.name): Promise<EnvironmentSnapshot> {
  if (PUBLIC_OFFLINE_DEMO) return {
    location: DEFAULT_LOCATION, locationSource: 'default_fallback',
    locationLabel: '公开离线演示 · 不读取定位或实时天气', permissionGranted: false,
    weather: { temperature: null, humidity: null, windSpeed: null, weatherCode: null },
    air: { aqi: null, pm25: null, pm10: null, ozone: null, nitrogenDioxide: null },
    openAq: null, tips: ['本页没有实时环境观测数据；碳估算仅供生活方式学习，不是认证碳资产。'],
    updatedAt: new Date().toISOString(),
  };
  const deviceLocation = await getDeviceGeoPoint();
  const fallbackLocation = city ? await geocodeCity(city) : DEFAULT_LOCATION;
  const location = deviceLocation?.point ?? fallbackLocation ?? DEFAULT_LOCATION;
  const locationSource: LocationSource = deviceLocation?.point
    ? 'device'
    : city
      ? 'city_fallback'
      : 'default_fallback';
  const permissionGranted = Boolean(deviceLocation?.permissionGranted);
  const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
  weatherUrl.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
    timezone: 'Asia/Shanghai',
  }).toString();

  const airUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  airUrl.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,us_aqi',
    timezone: 'Asia/Shanghai',
  }).toString();

  const [weatherRes, airRes, openAq] = await Promise.all([
    fetch(weatherUrl.toString()),
    fetch(airUrl.toString()),
    fetchOpenAqStation(location),
  ]);
  const weatherData = weatherRes.ok ? await weatherRes.json() : {};
  const airData = airRes.ok ? await airRes.json() : {};

  const snapshot: EnvironmentSnapshot = {
    location,
    locationSource,
    locationLabel:
      locationSource === 'device'
        ? `已使用定位 · ${location.name}`
        : locationSource === 'city_fallback'
          ? `未授权定位，已按城市匹配 · ${location.name}`
          : `未授权定位，使用默认城市 · ${location.name}`,
    permissionGranted,
    weather: {
      temperature: toNumber(weatherData.current?.temperature_2m),
      humidity: toNumber(weatherData.current?.relative_humidity_2m),
      windSpeed: toNumber(weatherData.current?.wind_speed_10m),
      weatherCode: toNumber(weatherData.current?.weather_code),
    },
    air: {
      aqi: toNumber(airData.current?.us_aqi),
      pm25: toNumber(airData.current?.pm2_5),
      pm10: toNumber(airData.current?.pm10),
      ozone: toNumber(airData.current?.ozone),
      nitrogenDioxide: toNumber(airData.current?.nitrogen_dioxide),
    },
    openAq,
    tips: [],
    updatedAt: new Date().toISOString(),
  };
  snapshot.tips = buildTips(snapshot);
  return snapshot;
}
