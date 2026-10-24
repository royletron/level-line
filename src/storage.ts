import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'level-monitor/config/v1';

export type Config = { tags: string[]; active: string | null };

export async function loadConfig(): Promise<Config | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Config) : null;
  } catch {
    return null;
  }
}

export async function saveConfig(config: Config) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    // Saving is best-effort; the app still works without it.
  }
}
