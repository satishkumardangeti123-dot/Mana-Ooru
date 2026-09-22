import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, Alert, TextInput, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import Icon from "@react-native-vector-icons/material-design-icons";
import * as Clipboard from "expo-clipboard";

import { colors, spacing, radius } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { useAuth } from "@/src/auth";

type Row = { id: string; name_en: string; name_te: string; section: string; category: string; verified: boolean; edit_code: string };

export default function AdminCodes() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang } = useLang();
  const { authFetch } = useAuth();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await authFetch("/api/admin/business-codes");
        if (!r.ok) throw new Error(String(r.status));
        setRows(await r.json());
      } catch (e: any) {
        Alert.alert("Error", String(e?.message ?? e));
      } finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => `${r.name_en} ${r.name_te} ${r.section} ${r.category} ${r.id} ${r.edit_code}`.toLowerCase().includes(s));
  }, [rows, q]);

  const copy = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert(t("copied"));
    } catch {}
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.back} testID="codes-back"><Icon name="arrow-left" size={22} color={colors.onSurface} /></Pressable>
        <Text style={styles.title}>{t("shopCodes")}</Text>
      </View>
      <View style={styles.searchWrap}>
        <Icon name="magnify" size={18} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search shop, section, code…" placeholderTextColor={colors.muted} style={styles.searchInput} testID="codes-search" />
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.sm }}
          renderItem={({ item }) => (
            <View style={styles.row} testID={`code-${item.id}`}>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>{lang === "te" ? item.name_te : item.name_en}</Text>
                  {item.verified && (
                    <View style={styles.verifiedPill}><Icon name="check-decagram" size={10} color={colors.onAccentPrimary} /><Text style={styles.verifiedText}>{t("verified")}</Text></View>
                  )}
                </View>
                <Text style={styles.meta}>{item.section} · {item.category}</Text>
                <Pressable onPress={() => copy(item.id)} style={styles.copyLine} testID={`code-copy-id-${item.id}`}>
                  <Text style={styles.metaId} numberOfLines={1}>{item.id}</Text>
                  <Icon name="content-copy" size={12} color={colors.muted} />
                </Pressable>
              </View>
              <Pressable onPress={() => copy(item.edit_code)} style={styles.codeBtn} testID={`code-copy-code-${item.id}`}>
                <Text style={styles.codeText}>{item.edit_code}</Text>
                <Icon name="content-copy" size={14} color={colors.brandPrimary} />
              </Pressable>
            </View>
          )}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.muted}>{t("noResults")}</Text></View>}
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
  searchWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginHorizontal: spacing.xl, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, minHeight: 44 },
  searchInput: { flex: 1, fontSize: 14, color: colors.onSurface, paddingVertical: Platform.OS === "web" ? 10 : 8 },
  center: { padding: spacing.xxl, alignItems: "center" },
  muted: { color: colors.muted, fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { fontSize: 15, fontWeight: "700", color: colors.onSurface, flexShrink: 1 },
  verifiedPill: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 2, paddingHorizontal: 6, borderRadius: radius.pill, backgroundColor: colors.accentPrimary },
  verifiedText: { color: colors.onAccentPrimary, fontSize: 9, fontWeight: "800" },
  meta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  copyLine: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  metaId: { fontSize: 10, color: colors.muted, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", maxWidth: 200 },
  codeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.brandTertiary },
  codeText: { fontSize: 15, fontWeight: "800", color: colors.brandPrimary, letterSpacing: 1, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
});
