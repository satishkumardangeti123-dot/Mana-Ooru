import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import Icon from "@react-native-vector-icons/material-design-icons";
import { View } from "react-native";
import { colors } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { usesNativeTabs } from "@/src/navigation";

export default function TabsLayout() {
  const { t } = useLang();

  if (usesNativeTabs) {
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="house.fill" />
          <NativeTabs.Trigger.Label>{t("home")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="emergency">
          <NativeTabs.Trigger.Icon sf="exclamationmark.triangle.fill" />
          <NativeTabs.Trigger.Label>{t("emergency")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="health">
          <NativeTabs.Trigger.Icon sf="heart.fill" />
          <NativeTabs.Trigger.Label>{t("health")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="more">
          <NativeTabs.Trigger.Icon sf="square.grid.2x2.fill" />
          <NativeTabs.Trigger.Label>{t("more")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("home"), tabBarIcon: ({ color, size }) => <Icon name="home" color={color} size={size} /> }} />
      <Tabs.Screen name="emergency" options={{ title: t("emergency"), tabBarIcon: ({ color, size }) => <Icon name="alert-decagram" color={color} size={size} /> }} />
      <Tabs.Screen name="health" options={{ title: t("health"), tabBarIcon: ({ color, size }) => <Icon name="heart-pulse" color={color} size={size} /> }} />
      <Tabs.Screen name="more" options={{ title: t("more"), tabBarIcon: ({ color, size }) => <Icon name="view-grid" color={color} size={size} /> }} />
    </Tabs>
  );
}
