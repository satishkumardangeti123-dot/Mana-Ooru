import { Platform } from "react-native";

// NativeTabs available only on iOS 26+. Every screen imports this so the
// bottom-chrome logic stays consistent across the app.
export const usesNativeTabs =
  Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;
