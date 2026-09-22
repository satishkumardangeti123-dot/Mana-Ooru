import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useEffect, useState } from "react";

import { colors, spacing, radius } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { useAuth } from "@/src/auth";

export default function AdminHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLang();
  const { user, loading, authFetch, signIn } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (loading) return;
    (async () => {
      if (!user) { setIsAdmin(false); setChecking(false); return; }
      try {
        const r = await authFetch("/api/admin/me");
        setIsAdmin(r.ok);
      } finally { setChecking(false); }
    })();
  }, [loading, user]);

  if (loading || checking) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()} style={styles.back} testID="admin-back"><Icon name="arrow-left" size={22} color={colors.onSurface} /></Pressable>
          <Text style={styles.title}>{t("adminConsole")}</Text>
        </View>
        <View style={styles.blockCenter}>
          <Icon name="lock-outline" size={40} color={colors.muted} />
          <Text style={styles.blockText}>{t("signIn")}</Text>
          <Pressable onPress={signIn} style={styles.primaryBtn} testID="admin-signin">
            <Icon name="google" size={18} color={colors.onBrandPrimary} />
            <Text style={styles.primaryBtnText}>{t("signIn")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()} style={styles.back} testID="admin-back"><Icon name="arrow-left" size={22} color={colors.onSurface} /></Pressable>
          <Text style={styles.title}>{t("adminConsole")}</Text>
        </View>
        <View style={styles.blockCenter}>
          <Icon name="shield-off-outline" size={40} color={colors.muted} />
          <Text style={styles.blockText}>Not authorised</Text>
        </View>
      </View>
    );
  }

  const tiles = [
    { icon: "flag-variant-outline", key: "reports", hint: "reportsHint", route: "/admin/reports" },
    { icon: "bullhorn-outline", key: "broadcast", hint: "broadcastHint", route: "/admin/broadcast" },
    { icon: "key-outline", key: "shopCodes", hint: "shopCodesHint", route: "/admin/codes" },
  ] as const;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.back} testID="admin-back"><Icon name="arrow-left" size={22} color={colors.onSurface} /></Pressable>
        <Text style={styles.title}>{t("adminConsole")}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}>
        {tiles.map((tile) => (
          <Pressable key={tile.key} onPress={() => router.push(tile.route as any)} style={styles.tile} testID={`admin-tile-${tile.key}`}>
            <View style={styles.tileIcon}>
              <Icon name={tile.icon as any} size={22} color={colors.brandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tileTitle}>{t(tile.key as any)}</Text>
              <Text style={styles.tileHint}>{t(tile.hint as any)}</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.muted} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  blockCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xxl },
  blockText: { color: colors.muted, fontSize: 15, fontWeight: "600" },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: 14, paddingHorizontal: 24, borderRadius: radius.pill, backgroundColor: colors.brandPrimary },
  primaryBtnText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "800" },
  tile: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  tileIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  tileTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  tileHint: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
