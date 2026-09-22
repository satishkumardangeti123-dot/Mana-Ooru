import { View, Text, StyleSheet, Pressable, ScrollView, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { api } from "@/src/api";
import { usesNativeTabs } from "@/src/navigation";

const CARDS = [
  { slug: "ambulance", icon: "ambulance", key: "ambulance" as const, phone: "108" },
  { slug: "police", icon: "police-badge", key: "police" as const, phone: "100" },
  { slug: "fire", icon: "fire-truck", key: "fire" as const, phone: "101" },
  { slug: "hospitals", icon: "hospital-building", key: "hospitals" as const, route: "/(tabs)/health?cat=hospital" },
  { slug: "pharmacy", icon: "pill", key: "pharmacy" as const, route: "/(tabs)/health?cat=pharmacy" },
  { slug: "blood", icon: "water", key: "blood" as const, route: "/(tabs)/health?cat=hospital" },
];

export default function Emergency() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang } = useLang();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const { data: contacts = [] } = useQuery({ queryKey: ["emergency"], queryFn: api.emergency });

  const call = (num: string) => Linking.openURL(`tel:${num}`).catch(() => {});

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>{t("emergencyHeader")}</Text>
        <View style={styles.disclaimer}>
          <Icon name="information-outline" size={16} color={colors.onAccentTint} />
          <Text style={styles.disclaimerText}>{t("emergencyDisclaimer")}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: bottomChrome + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {CARDS.map((c) => (
            <Pressable
              key={c.slug}
              onPress={() => (c.phone ? call(c.phone) : router.push(c.route as any))}
              style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]}
              testID={`emergency-card-${c.slug}`}
            >
              <View style={styles.cardIcon}>
                <Icon name={c.icon as any} size={30} color={colors.error} />
              </View>
              <Text style={styles.cardLabel}>{t(c.key)}</Text>
              {c.phone && <Text style={styles.cardMeta}>{c.phone}</Text>}
              {c.route && <Text style={styles.cardMeta}>{t("seeAll")}</Text>}
            </Pressable>
          ))}
        </View>

        {contacts.length > 0 && (
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <Text style={styles.sectionTitle}>{t("more")}</Text>
            {contacts.map((c) => (
              <Pressable key={c.id} onPress={() => call(c.number)} style={styles.row} testID={`emergency-row-${c.slug}`}>
                <View style={styles.rowIcon}>
                  <Icon name="phone" size={20} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{lang === "te" ? c.label_te : c.label_en}</Text>
                  <Text style={styles.rowMeta}>{c.number}</Text>
                </View>
                <Icon name="chevron-right" size={20} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.stickyCTA, { paddingBottom: Math.max(bottomChrome, spacing.md) + spacing.md, paddingTop: spacing.md }]}>
        <Pressable onPress={() => call("112")} style={styles.callAll} testID="emergency-call-112">
          <Icon name="phone-alert" size={22} color={colors.onError} />
          <Text style={styles.callAllText}>{t("callEmergency")} · 112</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, gap: spacing.sm },
  title: { fontSize: 26, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.4 },
  disclaimer: {
    flexDirection: "row", gap: spacing.sm, alignItems: "flex-start",
    backgroundColor: colors.accentTint, borderRadius: radius.md,
    padding: spacing.md,
  },
  disclaimerText: { flex: 1, fontSize: 12, color: colors.onAccentTint, lineHeight: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.md },
  card: {
    width: "48%", padding: spacing.lg, minHeight: 130,
    borderRadius: radius.lg, backgroundColor: colors.errorTint,
    borderWidth: 1, borderColor: "#FCA5A5",
    gap: spacing.sm,
  },
  cardIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: colors.surface, alignItems: "center", justifyContent: "center",
  },
  cardLabel: { fontSize: 16, fontWeight: "800", color: colors.onErrorTint },
  cardMeta: { fontSize: 13, color: colors.onErrorTint, opacity: 0.85, fontWeight: "600" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface, textTransform: "uppercase", letterSpacing: 0.5 },
  row: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center",
  },
  rowLabel: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  rowMeta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  stickyCTA: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingHorizontal: spacing.xl, backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  callAll: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.error, paddingVertical: 18, borderRadius: radius.pill,
  },
  callAllText: { color: colors.onError, fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
});
