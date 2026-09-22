import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Switch, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";

import { colors, spacing, radius } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { useAppState } from "@/src/app-state";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { readOptIn, writeOptIn, registerForPush } from "@/src/push";

export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang, setLang } = useLang();
  const { locationId, setLocationId } = useAppState();
  const { user, loading, signIn, signOut } = useAuth();
  const { data: locations = [] } = useQuery({ queryKey: ["locations"], queryFn: api.locations });

  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    readOptIn().then(setPushOn);
  }, []);

  const togglePush = async (v: boolean) => {
    setPushBusy(true);
    try {
      if (v) {
        const ok = await registerForPush(user?.user_id ?? "anon", locationId);
        if (ok) {
          setPushOn(true);
          await writeOptIn(true);
        } else {
          Alert.alert(t("villageAlerts"), t("microphoneNeededBody").replace("microphone", "notification"));
          setPushOn(false);
          await writeOptIn(false);
        }
      } else {
        setPushOn(false);
        await writeOptIn(false);
      }
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.back} testID="settings-back">
          <Icon name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>{t("settings")}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.xl }}>
        {/* Auth */}
        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator color={colors.brandPrimary} />
          ) : user ? (
            <View style={{ gap: spacing.md }}>
              <View style={styles.userRow}>
                {user.picture ? (
                  <Image source={{ uri: user.picture }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>{(user.name || user.email).charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{user.name || user.email}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
              </View>
              <Pressable onPress={signOut} style={styles.linkBtn} testID="settings-signout">
                <Icon name="logout" size={18} color={colors.error} />
                <Text style={[styles.linkText, { color: colors.error }]}>{t("signOut")}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              <Text style={styles.cardLabel}>{t("saveFavourites")}</Text>
              <Pressable onPress={signIn} style={styles.primaryBtn} testID="settings-signin">
                <Icon name="google" size={18} color={colors.onBrandPrimary} />
                <Text style={styles.primaryBtnText}>{t("signIn")}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Push toggle */}
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>{t("villageAlerts")}</Text>
              <Text style={styles.helper}>{t("villageAlertsHint")}</Text>
            </View>
            {pushBusy ? <ActivityIndicator color={colors.brandPrimary} /> : (
              <Switch value={pushOn} onValueChange={togglePush} thumbColor={pushOn ? colors.brandPrimary : "#f4f3f4"} trackColor={{ true: colors.brandTertiary, false: colors.border }} testID="settings-push-toggle" />
            )}
          </View>
        </View>

        {/* Language */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t("language")}</Text>
          <View style={styles.pillRow}>
            {(["en", "te"] as const).map((code) => (
              <Pressable
                key={code}
                onPress={() => setLang(code)}
                style={[styles.pill, lang === code && styles.pillActive]}
                testID={`settings-lang-${code}`}
              >
                <Text style={[styles.pillText, lang === code && styles.pillTextActive]}>
                  {code === "en" ? t("english") : t("telugu")}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t("location")}</Text>
            <View style={{ gap: spacing.sm }}>
              {locations.map((loc) => {
                const active = locationId === loc.id;
                return (
                  <Pressable
                    key={loc.id}
                    onPress={() => setLocationId(loc.id)}
                    style={[styles.locRow, active && styles.locRowActive]}
                    testID={`settings-loc-${loc.id}`}
                  >
                    <Icon name={active ? "radiobox-marked" : "radiobox-blank"} size={22} color={active ? colors.brandPrimary : colors.muted} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locName}>{lang === "te" ? loc.name_te : loc.name_en}</Text>
                      <Text style={styles.locMeta}>{lang === "te" ? loc.district_te : loc.district_en}</Text>
                    </View>
                  </Pressable>
                );
              })}
              <View style={styles.comingSoon} testID="settings-loc-coming-soon">
                <Icon name="clock-outline" size={18} color={colors.muted} />
                <Text style={styles.comingSoonText}>More locations coming soon</Text>
              </View>
            </View>
          </View>

        {/* Employee entry */}
        <View style={styles.card}>
          <Pressable onPress={() => router.push("/employee/login")} style={styles.employeeBtn} testID="settings-employee-login">
            <Icon name="store-cog-outline" size={22} color={colors.accentPrimary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.employeeTitle}>{t("employeeLogin")}</Text>
              <Text style={styles.helper}>{t("employeeLoginHint")}</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.muted} />
          </Pressable>
        </View>

        {user && user.role === "admin" && (
          <View style={styles.card}>
            <Pressable onPress={() => router.push("/admin")} style={styles.employeeBtn} testID="settings-admin-console">
              <Icon name="shield-crown-outline" size={22} color={colors.brandPrimary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.employeeTitle}>{t("adminConsole")}</Text>
                <Text style={styles.helper}>{t("adminConsoleHint")}</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.muted} />
            </Pressable>
          </View>
        )}

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t("aboutApp")}</Text>
          <Text style={styles.about}>{t("aboutBody")}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  card: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  cardLabel: { fontSize: 13, color: colors.muted, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  helper: { fontSize: 12, color: colors.muted, marginTop: 2 },
  userRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brandTertiary },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: colors.onBrandTertiary, fontWeight: "800", fontSize: 18 },
  userName: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  userEmail: { fontSize: 12, color: colors.muted, marginTop: 2 },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 8 },
  linkText: { fontSize: 15, fontWeight: "700" },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: 16, borderRadius: radius.pill, backgroundColor: colors.brandPrimary },
  primaryBtnText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "800" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  pillRow: { flexDirection: "row", gap: spacing.sm },
  pill: { flex: 1, paddingVertical: 12, borderRadius: radius.pill, alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pillActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  pillText: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  pillTextActive: { color: colors.onBrandPrimary },
  locRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  locRowActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  locName: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  locMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  comingSoon: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border },
  comingSoonText: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  employeeBtn: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  employeeTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  about: { fontSize: 14, color: colors.onSurfaceSecondary, lineHeight: 20 },
});
