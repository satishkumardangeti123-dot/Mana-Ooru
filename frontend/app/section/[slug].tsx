import { View, Text, StyleSheet, ActivityIndicator, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Icon from "@react-native-vector-icons/material-design-icons";

import { colors, spacing, radius } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { useAppState } from "@/src/app-state";
import { api } from "@/src/api";
import { BusinessCard } from "@/src/components/business";

const TITLE_KEYS: Record<string, any> = {
  transport: "transport",
  shops: "shops",
  services: "services",
  government: "government",
  agriculture: "agriculture",
  updates: "updates",
};

export default function SectionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, lang } = useLang();
  const { locationId } = useAppState();

  const isUpdates = slug === "updates";

  const businessesQ = useQuery({
    queryKey: ["businesses", locationId, slug],
    queryFn: () => api.businesses({ location_id: locationId, section: String(slug) }),
    enabled: !isUpdates,
  });

  const updatesQ = useQuery({
    queryKey: ["updates", locationId],
    queryFn: () => api.updates(locationId),
    enabled: isUpdates,
  });

  const title = TITLE_KEYS[String(slug)] ? t(TITLE_KEYS[String(slug)]) : String(slug);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.back} testID="section-back">
          <Icon name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
      </View>

      {isUpdates ? (
        updatesQ.isLoading ? (
          <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
        ) : (
          <FlatList
            data={updatesQ.data ?? []}
            keyExtractor={(x) => x.id}
            contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
            renderItem={({ item }) => (
              <View style={styles.updateCard} testID={`update-${item.id}`}>
                {(lang === "te" ? item.tag_te : item.tag_en) && (
                  <View style={styles.tag}><Text style={styles.tagText}>{lang === "te" ? item.tag_te : item.tag_en}</Text></View>
                )}
                <Text style={styles.updateTitle}>{lang === "te" ? item.title_te : item.title_en}</Text>
                <Text style={styles.updateBody}>{lang === "te" ? item.body_te : item.body_en}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.muted}>{t("comingSoon")}</Text>}
          />
        )
      ) : businessesQ.isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : (
        <FlatList
          data={businessesQ.data ?? []}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
          renderItem={({ item }) => <BusinessCard item={item} testID={`biz-${item.id}`} />}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.muted}>{t("comingSoon")}</Text></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.3 },
  center: { padding: spacing.xxl, alignItems: "center" },
  muted: { color: colors.muted, fontSize: 14 },
  updateCard: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, gap: 6 },
  tag: { alignSelf: "flex-start", backgroundColor: colors.accentTint, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  tagText: { fontSize: 11, fontWeight: "700", color: colors.onAccentTint, letterSpacing: 0.4, textTransform: "uppercase" },
  updateTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  updateBody: { fontSize: 14, color: colors.onSurfaceSecondary, lineHeight: 20 },
});
