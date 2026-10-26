import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'carbonpie_active_circle_id';

export async function getActiveCircleId(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function setActiveCircleId(id: string | null) {
  if (!id) await AsyncStorage.removeItem(KEY);
  else await AsyncStorage.setItem(KEY, id);
}
