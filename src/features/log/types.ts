export type BehaviorType =
  | 'transport_bus'
  | 'transport_metro'
  | 'bike'
  | 'walk'
  | 'food_save'
  | 'standby_off'
  | 'ac_habit'
  | 'virtue'
  | 'mug';

export type FoodLevel = 'simple' | 'normal' | 'heavy';

export type StandbyPreset = 'stb' | 'router' | 'tv' | 'charger' | 'custom';

export type AcPayloadVariant = 'setpoint' | 'off_once';

export type LogPayload =
  | {
      mode: 'transport';
      km: number;
      roundTrip: boolean;
    }
  | {
      mode: 'food';
      level: FoodLevel;
    }
  | {
      mode: 'standby';
      preset: StandbyPreset;
      watts?: number;
      hours: number;
    }
  | {
      mode: 'ac';
      variant: AcPayloadVariant;
    }
  | {
      mode: 'virtue';
      note: string;
    }
  | {
      mode: 'mug';
      note?: string;
    };

export type StoredLog = {
  id: string;
  user_id: string;
  type: BehaviorType;
  payload: LogPayload;
  avoided_kg_co2e: number;
  included_in_summary: number;
  ef_version: string | null;
  client_id: string;
  created_at: string;
  synced: number;
};

export type PhotoCheckinCategory = BehaviorType | 'unknown';

export type PhotoInsight = {
  category: PhotoCheckinCategory;
  title: string;
  summary: string;
  encouragement: string;
  confidence: 'high' | 'medium' | 'low';
  tags: string[];
};

export type LogPhotoRecord = {
  id: string;
  log_client_id: string;
  user_id: string;
  uri: string;
  source: 'camera' | 'library';
  storage_path?: string | null;
  ai_category: PhotoCheckinCategory;
  ai_title: string;
  ai_summary: string;
  ai_encouragement: string;
  ai_confidence: 'high' | 'medium' | 'low';
  ai_tags: string[];
  created_at: string;
  synced: number;
};

export type PendingPhotoDraft = {
  uri: string;
  source: 'camera' | 'library';
  ai: PhotoInsight;
  created_at: string;
};
