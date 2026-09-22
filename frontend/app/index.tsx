import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAppState } from "@/src/app-state";
import { useLang } from "@/src/i18n";
import { colors } from "@/src/theme";

export default function Index() {
  const app = useAppState();
  const { ready: langReady } = useLang();

  if (!app.ready || !langReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }

  return <Redirect href={app.onboarded ? "/(tabs)" : "/onboarding"} />;
}
