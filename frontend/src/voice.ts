// Voice recorder helper backed by expo-audio. Records a short clip and uploads
// to /api/voice/transcribe. Web falls back to MediaRecorder via expo-audio.
import { Platform, Alert, Linking } from "react-native";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

export async function transcribeUri(uri: string, contentType: string): Promise<{ text: string; language: string }> {
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await fetch(uri).then((r) => r.blob());
    form.append("file", blob, "recording.webm");
  } else {
    // @ts-expect-error RN FormData accepts object
    form.append("file", { uri, name: `recording${contentType.includes("wav") ? ".wav" : ".m4a"}`, type: contentType });
  }
  const r = await fetch(`${BASE}/api/voice/transcribe`, { method: "POST", body: form as any });
  if (!r.ok) throw new Error(`transcribe ${r.status}`);
  return r.json();
}

export async function openMicSettings() {
  try { await Linking.openSettings(); } catch {}
}

export function showMicDenied(t: (k: string) => string) {
  Alert.alert(
    t("microphoneNeeded"),
    t("microphoneNeededBody"),
    [
      { text: t("cancel"), style: "cancel" },
      { text: t("openSettings"), onPress: () => openMicSettings() },
    ],
  );
}
