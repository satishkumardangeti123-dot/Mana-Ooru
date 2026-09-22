import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import Icon from "@react-native-vector-icons/material-design-icons";
import { Image } from "expo-image";

import { colors, spacing, radius } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { useAuth } from "@/src/auth";
import { api, type Post } from "@/src/api";

export default function AdminReports() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLang();
  const { authFetch } = useAuth();
  const [rows, setRows] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const r = await authFetch("/api/admin/reported-posts");
      if (!r.ok) throw new Error(String(r.status));
      setRows(await r.json());
    } catch (e: any) {
      Alert.alert("Error", String(e?.message ?? e));
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };
  useEffect(() => { load(); }, []);

  const act = async (path: string, method: string) => {
    const r = await authFetch(path, { method });
    if (r.ok) load();
    else Alert.alert("Error", String(r.status));
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.back} testID="reports-back"><Icon name="arrow-left" size={22} color={colors.onSurface} /></Pressable>
        <Text style={styles.title}>{t("reports")}</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.muted}>{t("emptyFeed")}</Text></View>}
          renderItem={({ item }) => {
            const img = api.fileUrl(item.image_path);
            return (
              <View style={[styles.card, item.hidden && { opacity: 0.6 }]} testID={`admin-report-${item.id}`}>
                <View style={styles.headerRow}>
                  <Text style={styles.author}>{item.author_name || item.user_id}</Text>
                  <View style={styles.pillRow}>
                    <View style={styles.reportsPill}>
                      <Icon name="flag" size={12} color={colors.onErrorTint} />
                      <Text style={styles.reportsText}>{item.reports}</Text>
                    </View>
                    {item.hidden && <View style={styles.hiddenPill}><Text style={styles.hiddenText}>{t("hidden")}</Text></View>}
                  </View>
                </View>
                {item.title ? <Text style={styles.postTitle}>{item.title}</Text> : null}
                {item.body ? <Text style={styles.postBody}>{item.body}</Text> : null}
                {img && <Image source={{ uri: img }} style={styles.postImage} contentFit="cover" />}
                <View style={styles.actions}>
                  {item.hidden ? (
                    <Pressable onPress={() => act(`/api/admin/posts/${item.id}/restore`, "POST")} style={[styles.actionBtn, styles.restoreBtn]} testID={`report-restore-${item.id}`}>
                      <Icon name="undo" size={16} color={colors.onBrandPrimary} />
                      <Text style={styles.actionText}>{t("restore")}</Text>
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => act(`/api/admin/posts/${item.id}/hide`, "POST")} style={[styles.actionBtn, styles.hideBtn]} testID={`report-hide-${item.id}`}>
                      <Icon name="eye-off-outline" size={16} color={colors.onAccentPrimary} />
                      <Text style={styles.actionText}>{t("hide")}</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => act(`/api/admin/posts/${item.id}`, "DELETE")} style={[styles.actionBtn, styles.deleteBtn]} testID={`report-delete-${item.id}`}>
                    <Icon name="trash-can-outline" size={16} color={colors.onError} />
                    <Text style={styles.actionText}>{t("deletePost")}</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  center: { padding: spacing.xxl, alignItems: "center" },
  muted: { color: colors.muted, fontSize: 14 },
  card: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  author: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  pillRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  reportsPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: colors.errorTint },
  reportsText: { fontSize: 11, fontWeight: "700", color: colors.onErrorTint },
  hiddenPill: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary },
  hiddenText: { fontSize: 11, fontWeight: "700", color: colors.muted, textTransform: "uppercase" },
  postTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  postBody: { fontSize: 14, color: colors.onSurfaceSecondary, lineHeight: 20 },
  postImage: { width: "100%", aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary },
  actions: { flexDirection: "row", gap: spacing.sm },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: radius.pill },
  hideBtn: { backgroundColor: colors.accentPrimary },
  restoreBtn: { backgroundColor: colors.brandPrimary },
  deleteBtn: { backgroundColor: colors.error },
  actionText: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
