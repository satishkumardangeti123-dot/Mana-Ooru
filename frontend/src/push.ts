// Push notification registration + opt-in helper
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";
const OPT_IN_KEY = "@manaooru:pushOptIn";

export async function readOptIn(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(OPT_IN_KEY)) === "1"; } catch { return false; }
}
export async function writeOptIn(v: boolean) {
  try { await AsyncStorage.setItem(OPT_IN_KEY, v ? "1" : "0"); } catch {}
}

export async function registerForPush(userId: string, locationId: string): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const Notifications = await import("expo-notifications");
    const perm = await Notifications.getPermissionsAsync();
    let status = perm.status;
    if (status !== "granted" && perm.canAskAgain) {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return false;
    const tokenResp = await Notifications.getDevicePushTokenAsync();
    const deviceToken = tokenResp.data;
    if (!deviceToken) return false;
    await fetch(`${BASE}/api/register-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, platform: Platform.OS, device_token: String(deviceToken) }),
    });
    await fetch(`${BASE}/api/push-tokens/${encodeURIComponent(String(deviceToken))}/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_id: locationId }),
    });
    return true;
  } catch (e) {
    console.warn("registerForPush failed", e);
    return false;
  }
}
