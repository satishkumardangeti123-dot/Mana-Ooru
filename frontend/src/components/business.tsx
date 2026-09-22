// Reusable business card + chip row for directory screens
import { View, Text, Pressable, StyleSheet, Linking, ScrollView } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { colors, spacing, radius } from "@/src/theme";
import { useLang } from "@/src/i18n";
import type { Business } from "@/src/api";

export function BusinessCard({ item, testID }: { item: Business; testID?: string }) {
  const { t, lang } = useLang();
  const name = lang === "te" ? item.name_te : item.name_en;
  const subtitle = lang === "te" ? item.subtitle_te : item.subtitle_en;
  const address = lang === "te" ? item.address_te : item.address_en;
  const hours = lang === "te" ? item.hours_te : item.hours_en;

  const call = () => item.phone && Linking.openURL(`tel:${item.phone}`).catch(() => {});
  const openMap = () => {
    const q = address || name;
    const url = item.lat && item.lng
      ? `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q + " Patavala Kakinada")}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={2}>{name}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <View style={[styles.statusPill, { backgroundColor: item.open_now ? colors.brandTertiary : colors.surfaceTertiary }]}>
          <View style={[styles.statusDot, { backgroundColor: item.open_now ? colors.success : colors.muted }]} />
          <Text style={[styles.statusText, { color: item.open_now ? colors.onBrandTertiary : colors.muted }]}>
            {item.open_now ? t("open") : t("closed")}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        {item.distance_km != null && (
          <View style={styles.metaItem}>
            <Icon name="map-marker-outline" size={14} color={colors.muted} />
            <Text style={styles.metaText}>{item.distance_km.toFixed(1)} {t("km")}</Text>
          </View>
        )}
        {hours && (
          <View style={styles.metaItem}>
            <Icon name="clock-outline" size={14} color={colors.muted} />
            <Text style={styles.metaText} numberOfLines={1}>{hours}</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable onPress={call} disabled={!item.phone} style={[styles.actionBtn, styles.callBtn, !item.phone && { opacity: 0.4 }]} testID={`business-call-${item.id}`}>
          <Icon name="phone" size={18} color={colors.onBrandPrimary} />
          <Text style={styles.callText}>{t("call")}</Text>
        </Pressable>
        <Pressable onPress={openMap} style={[styles.actionBtn, styles.dirBtn]} testID={`business-directions-${item.id}`}>
          <Icon name="directions" size={18} color={colors.brandPrimary} />
          <Text style={styles.dirText}>{t("directions")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function ChipRow({ items, selected, onSelect }: { items: { id: string; label: string }[]; selected: string; onSelect: (id: string) => void }) {
  return (
    <View style={styles.chipRowWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRowContent}
      >
        {items.map((c) => {
          const active = c.id === selected;
          return (
            <Pressable
              key={c.id}
              onPress={() => onSelect(c.id)}
              style={[styles.chip, active && styles.chipActive]}
              testID={`chip-${c.id}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    gap: spacing.md,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6,
    elevation: 1,
  },
  headRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  name: { fontSize: 17, fontWeight: "700", color: colors.onSurface },
  subtitle: { fontSize: 13, color: colors.onSurfaceSecondary, marginTop: 2 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: colors.muted, maxWidth: 220 },
  actions: { flexDirection: "row", gap: spacing.sm },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: radius.pill },
  callBtn: { backgroundColor: colors.brandPrimary },
  callText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: 14 },
  dirBtn: { backgroundColor: colors.brandTertiary, borderWidth: 1, borderColor: colors.brandTertiary },
  dirText: { color: colors.brandPrimary, fontWeight: "700", fontSize: 14 },

  chipRowWrap: { height: 56, justifyContent: "center", backgroundColor: colors.surface },
  chipRowContent: { paddingHorizontal: spacing.xl, gap: spacing.sm, alignItems: "center" },
  chip: {
    height: 36, paddingHorizontal: 14, borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.onSurface },
  chipTextActive: { color: colors.onBrandPrimary },
});
