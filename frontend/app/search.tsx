import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Pressable, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import Icon from "@react-native-vector-icons/material-design-icons";

import { colors, spacing, radius } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { useAppState } from "@/src/app-state";
import { api, type Business } from "@/src/api";
import { BusinessCard } from "@/src/components/business";

export default function Search() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const { t, lang } = useLang();
  const { locationId } = useAppState();

  const [q, setQ] = useState(params.q ?? "");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Business[]>([]);
  const [intent, setIntent] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (params.q) run(String(params.q)); }, []);

  const run = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true); setErr(null);
    try {
      const res = await api.search({ query, location_id: locationId, lang });
      setResults(res.businesses);
      setIntent(res.intent?.section ?? null);
    } catch (e: any) {
      setErr(e?.message ?? "error");
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.back} testID="search-back">
          <Icon name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={styles.searchWrap}>
          <Icon name="magnify" size={20} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t("whatDoYouNeed")}
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => run(q)}
            testID="search-input"
          />
        </View>
      </View>

      {intent && (
        <View style={styles.intentPill}>
          <Icon name="auto-fix" size={14} color={colors.accentPrimary} />
          <Text style={styles.intentText}>{t(intent as any) || intent}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : err ? (
        <View style={styles.center}><Text style={styles.err}>{err}</Text></View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
          renderItem={({ item }) => <BusinessCard item={item} testID={`biz-${item.id}`} />}
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
  searchWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, minHeight: 44 },
  input: { flex: 1, fontSize: 15, color: colors.onSurface, paddingVertical: 10 },
  intentPill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.accentTint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  intentText: { fontSize: 12, fontWeight: "700", color: colors.onAccentTint, textTransform: "capitalize" },
  center: { padding: spacing.xxl, alignItems: "center" },
  muted: { color: colors.muted, fontSize: 14 },
  err: { color: colors.error },
});
