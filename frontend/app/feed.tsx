import { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import Icon from "@react-native-vector-icons/material-design-icons";
import { Image } from "expo-image";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { colors, spacing, radius } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { useAppState } from "@/src/app-state";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { ReactionsRow } from "@/src/components/reactions";

export default function Feed() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang } = useLang();
  const { locationId } = useAppState();
  const { user, signIn } = useAuth();
  const qc = useQueryClient();

  const postsQ = useQuery({ queryKey: ["posts", locationId], queryFn: () => api.posts(locationId) });
  const updatesQ = useQuery({ queryKey: ["updates", locationId], queryFn: () => api.updates(locationId) });

  const items = useMemo(() => {
    const posts = (postsQ.data ?? []).map((p) => ({ kind: "post" as const, at: p.posted_at, data: p }));
    const updates = (updatesQ.data ?? []).map((u) => ({ kind: "update" as const, at: u.posted_at, data: u }));
    return [...posts, ...updates].sort((a, b) => (a.at > b.at ? -1 : 1));
  }, [postsQ.data, updatesQ.data]);

  const isLoading = postsQ.isLoading || updatesQ.isLoading;

  const onNew = () => {
    if (!user) {
      Alert.alert(t("signInToPost"), "", [
        { text: t("cancel"), style: "cancel" },
        { text: t("signIn"), onPress: () => signIn() },
      ]);
      return;
    }
    router.push("/post/new");
  };

  const onReport = async (id: string) => {
    try { await api.reportPost(id); Alert.alert(t("reportedThanks")); } catch {}
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.back} testID="feed-back">
          <Icon name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>{t("feed")}</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => `${x.kind}-${x.data.id}`}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + 120, gap: spacing.md }}
          refreshControl={
            <RefreshControl refreshing={postsQ.isFetching} onRefresh={() => { qc.invalidateQueries({ queryKey: ["posts", locationId] }); }} />
          }
          renderItem={({ item }) => {
            if (item.kind === "update") {
              const u = item.data as any;
              return (
                <View style={styles.card} testID={`feed-update-${u.id}`}>
                  <View style={styles.rowHeader}>
                    <View style={styles.officialAvatar}>
                      <Icon name="shield-check" size={18} color={colors.onBrandPrimary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.author}>{t("officialUpdate")}</Text>
                      <Text style={styles.timeMuted}>{(lang === "te" ? u.tag_te : u.tag_en) ?? ""}</Text>
                    </View>
                  </View>
                  <Text style={styles.postTitle}>{lang === "te" ? u.title_te : u.title_en}</Text>
                  <Text style={styles.postBody}>{lang === "te" ? u.body_te : u.body_en}</Text>
                </View>
              );
            }
            const p = item.data as any;
            const img = api.fileUrl(p.image_path);
            return (
              <View style={styles.card} testID={`feed-post-${p.id}`}>
                <View style={styles.rowHeader}>
                  {p.author_picture ? (
                    <Image source={{ uri: p.author_picture }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarInitial}>{(p.author_name || "?").charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.author}>{p.author_name || "Community member"}</Text>
                    <Text style={styles.timeMuted}>{new Date(p.posted_at).toLocaleString()}</Text>
                  </View>
                  <Pressable onPress={() => onReport(p.id)} style={styles.reportBtn} testID={`feed-report-${p.id}`}>
                    <Icon name="flag-outline" size={16} color={colors.muted} />
                    <Text style={styles.reportText}>{t("reportPost")}</Text>
                  </Pressable>
                </View>
                {p.title ? <Text style={styles.postTitle}>{p.title}</Text> : null}
                {p.body ? <Text style={styles.postBody}>{p.body}</Text> : null}
                {img && <Image source={{ uri: img }} style={styles.postImage} contentFit="cover" />}
                <ReactionsRow postId={p.id} initial={p.reactions} />
              </View>
            );
          }}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.muted}>{t("emptyFeed")}</Text></View>}
        />
      )}

      <Pressable
        onPress={onNew}
        style={[styles.fab, { bottom: Math.max(insets.bottom, 16) + 16 }]}
        testID="feed-new-post"
      >
        <Icon name="plus" size={24} color={colors.onBrandPrimary} />
        <Text style={styles.fabText}>{t("newPost")}</Text>
      </Pressable>
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
  card: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceTertiary },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTertiary },
  avatarInitial: { color: colors.onBrandTertiary, fontWeight: "800" },
  officialAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  author: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  timeMuted: { fontSize: 11, color: colors.muted, marginTop: 2 },
  postTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  postBody: { fontSize: 14, color: colors.onSurfaceSecondary, lineHeight: 20 },
  postImage: { width: "100%", aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary },
  reportBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  reportText: { fontSize: 11, color: colors.muted, fontWeight: "600" },
  fab: {
    position: "absolute", right: spacing.xl,
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderRadius: radius.pill, backgroundColor: colors.brandPrimary,
    shadowColor: "#000", shadowOpacity: 0.15, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 6,
  },
  fabText: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: 15 },
});
