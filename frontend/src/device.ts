// Stable anonymous device_id for one-user-one-reaction on the feed
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@manaooru:device_id";
let cached: string | null = null;

function uuid(): string {
  // Simple UUID v4 without importing a crypto polyfill
  const s = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return s.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  try {
    const existing = await AsyncStorage.getItem(KEY);
    if (existing) { cached = existing; return existing; }
  } catch {}
  const id = uuid();
  cached = id;
  try { await AsyncStorage.setItem(KEY, id); } catch {}
  return id;
}
