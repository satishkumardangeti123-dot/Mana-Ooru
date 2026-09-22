import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { usesNativeTabs } from "@/src/navigation";

const ITEMS = [
  { slug: "transport", icon: "bus", key: "transport" as const },
  { slug: "shops", icon: "storefront-outline", key: "shops" as const },
  { slug: "services", icon: "tools", key: "services" as const },
  { slug: "government", icon: "bank-outline", key: "government" as const },
  { slug: "agriculture", icon: "sprout-outline", key: "agriculture" as const },
  { slug: "updates", icon: "bullhorn-outline", key: "updates" as const },
];

export default function More() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLang();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const go = (slug: string) => router.push(slug === "updates" ? ("/feed" as any) : (`/section/${slug}` as any));

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: bottomChrome + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t("more")}</Text>
        <View style={styles.grid}>
          {ITEMS.map((it) => (
            <Pressable
              key={it.slug}
              onPress={() => go(it.slug)}
              style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]}
              testID={`more-card-${it.slug}`}
            >
              <View style={styles.icon}>
                <Icon name={it.icon as any} size={26} color={colors.brandPrimary} />
              </View>
              <Text style={styles.label}>{t(it.key)}</Text>
              <Icon name="chevron-right" size={20} color={colors.muted} style={{ marginLeft: "auto" }} />
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <Pressable onPress={() => router.push("/settings")} style={styles.rowLink} testID="more-settings">
            <Icon name="cog-outline" size={22} color={colors.onSurface} />
            <Text style={styles.rowLinkText}>{t("settings")}</Text>
            <Icon name="chevron-right" size={20} color={colors.muted} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  title: { fontSize: 26, fontWeight: "800", color: colors.onSurface, paddingHorizontal: spacing.xl, marginBottom: spacing.lg, letterSpacing: -0.4 },
  grid: { paddingHorizontal: spacing.xl, gap: spacing.md },
  card: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
  },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  section: { marginTop: spacing.xl, paddingHorizontal: spacing.xl, gap: spacing.md },
  rowLink: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  rowLinkText: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.onSurface },
});
