import { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";

import { colors, spacing } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { useAppState } from "@/src/app-state";
import { api } from "@/src/api";
import { BusinessCard, ChipRow } from "@/src/components/business";
import { usesNativeTabs } from "@/src/navigation";

const CAT_KEYS: { id: string; key: any }[] = [
  { id: "all", key: "all" },
  { id: "hospital", key: "hospital" },
  { id: "doctor", key: "doctor" },
  { id: "pharmacy", key: "pharmacyCat" },
  { id: "ambulance", key: "ambulanceCat" },
  { id: "lab", key: "lab" },
  { id: "dental", key: "dental" },
  { id: "eye", key: "eye" },
];

export default function Health() {
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const { locationId } = useAppState();
  const params = useLocalSearchParams<{ cat?: string }>();
  const [cat, setCat] = useState<string>(params.cat ?? "all");
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  useEffect(() => { if (params.cat) setCat(params.cat); }, [params.cat]);

  const chipItems = useMemo(() => CAT_KEYS.map((c) => ({ id: c.id, label: t(c.key) })), [t]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["businesses", locationId, "health", cat],
    queryFn: () => api.businesses({ location_id: locationId, section: "health", category: cat }),
  });

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>{t("healthNearYou")}</Text>
      </View>
      <ChipRow items={chipItems} selected={cat} onSelect={setCat} />

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : isError ? (
        <View style={styles.center}><Text style={styles.err}>{t("retry")}</Text></View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.md, paddingBottom: bottomChrome + spacing.xxl, gap: spacing.md }}
          renderItem={({ item }) => <BusinessCard item={item} testID={`biz-${item.id}`} />}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.muted}>{t("noResults")}</Text></View>}
          testID="health-list"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  title: { fontSize: 26, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.4 },
  center: { padding: spacing.xxl, alignItems: "center" },
  err: { color: colors.error, fontSize: 14, fontWeight: "600" },
  muted: { color: colors.muted, fontSize: 14 },
});
