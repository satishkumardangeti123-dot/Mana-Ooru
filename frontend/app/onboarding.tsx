import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { useLang, type Lang } from "@/src/i18n";
import { useAppState } from "@/src/app-state";
import { api, type Location } from "@/src/api";
import { useQuery } from "@tanstack/react-query";

const HERO = "https://images.unsplash.com/photo-1785996361834-c41edd04c51d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwyfHxJbmRpYW4lMjB2aWxsYWdlJTIwcnVyYWwlMjBsYW5kc2NhcGUlMjBjbGVhbiUyMGJyaWdodHxlbnwwfHx8fDE3OTAxMTUwOTF8MA&ixlib=rb-4.1.0&q=85";

const INTEREST_ITEMS = [
  { id: "health", icon: "heart-pulse", key: "health" as const },
  { id: "transport", icon: "bus", key: "transport" as const },
  { id: "shops", icon: "storefront-outline", key: "shops" as const },
  { id: "services", icon: "tools", key: "services" as const },
  { id: "government", icon: "bank-outline", key: "government" as const },
  { id: "agriculture", icon: "sprout-outline", key: "agriculture" as const },
  { id: "emergency", icon: "alert-decagram-outline", key: "emergency" as const },
  { id: "updates", icon: "bullhorn-outline", key: "updates" as const },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const { t, lang, setLang } = useLang();
  const app = useAppState();
  const router = useRouter();

  const { data: locations = [] } = useQuery({ queryKey: ["locations"], queryFn: api.locations });

  const [selectedLocation, setSelectedLocation] = useState(app.locationId);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(app.interests);

  const finish = () => {
    app.setLocationId(selectedLocation);
    app.setInterests(selectedInterests);
    app.setOnboarded(true);
    router.replace("/(tabs)");
  };

  const next = () => {
    if (step === 0) setStep(1);
    else if (step === 1) setStep(2);
    else finish();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {step === 0 && <Welcome lang={lang} setLang={setLang} t={t} />}
      {step === 1 && (
        <ChooseLocation
          locations={locations}
          selected={selectedLocation}
          onSelect={setSelectedLocation}
          t={t}
          lang={lang}
        />
      )}
      {step === 2 && (
        <ChooseInterests selected={selectedInterests} onToggle={(id) => {
          setSelectedInterests((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
        }} t={t} />
      )}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, step === i && styles.dotActive]} testID={`onboarding-dot-${i}`} />
          ))}
        </View>
        <Pressable
          onPress={next}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
          testID="onboarding-next-button"
        >
          <Text style={styles.ctaText}>{step < 2 ? t("continue") : t("done")}</Text>
          <Icon name="arrow-right" size={20} color={colors.onBrandPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

function Welcome({ lang, setLang, t }: { lang: Lang; setLang: (l: Lang) => void; t: (k: any) => string }) {
  const { width } = useWindowDimensions();
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
      <Image source={HERO} style={[styles.hero, { width, height: width * 0.85 }]} contentFit="cover" />
      <View style={styles.stepBody}>
        <View style={styles.logoRow}>
          <View style={styles.logoMark}>
            <Icon name="home-heart" size={24} color={colors.onBrandPrimary} />
          </View>
          <Text style={styles.brandName}>Mana Ooru</Text>
        </View>
        <Text style={styles.title}>{t("welcomeTitle")}</Text>
        <Text style={styles.subtitle}>{t("welcomeSubtitle")}</Text>

        <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>{t("chooseLanguage")}</Text>
        <View style={styles.langRow}>
          <LangPill active={lang === "en"} label={t("english")} onPress={() => setLang("en")} testID="lang-en" />
          <LangPill active={lang === "te"} label={t("telugu")} onPress={() => setLang("te")} testID="lang-te" />
        </View>
      </View>
    </ScrollView>
  );
}

function LangPill({ active, label, onPress, testID }: { active: boolean; label: string; onPress: () => void; testID: string }) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={[styles.langPill, active && styles.langPillActive]}
    >
      <Text style={[styles.langPillText, active && styles.langPillTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ChooseLocation({ locations, selected, onSelect, t, lang }: { locations: Location[]; selected: string; onSelect: (id: string) => void; t: (k: any) => string; lang: Lang }) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
      <View style={styles.iconHeader}>
        <View style={styles.iconHeaderCircle}>
          <Icon name="map-marker-outline" size={32} color={colors.brandPrimary} />
        </View>
      </View>
      <View style={styles.stepBody}>
        <Text style={styles.title}>{t("chooseLocation")}</Text>
        <Text style={styles.subtitle}>{t("chooseLocationSubtitle")}</Text>
        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          {locations.map((loc) => {
            const active = selected === loc.id;
            return (
              <Pressable
                key={loc.id}
                onPress={() => onSelect(loc.id)}
                testID={`onboarding-location-${loc.id}`}
                style={[styles.locationRow, active && styles.locationRowActive]}
              >
                <View style={styles.locationIcon}>
                  <Icon name="map-marker" size={22} color={active ? colors.onBrandPrimary : colors.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationName}>{lang === "te" ? loc.name_te : loc.name_en}</Text>
                  <Text style={styles.locationMeta}>
                    {lang === "te" ? `${loc.district_te}, ${loc.state_te}` : `${loc.district_en}, ${loc.state_en}`}
                  </Text>
                </View>
                {active && <Icon name="check-circle" size={22} color={colors.brandPrimary} />}
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

function ChooseInterests({ selected, onToggle, t }: { selected: string[]; onToggle: (id: string) => void; t: (k: any) => string }) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
      <View style={styles.iconHeader}>
        <View style={styles.iconHeaderCircle}>
          <Icon name="star-four-points-outline" size={32} color={colors.accentPrimary} />
        </View>
      </View>
      <View style={styles.stepBody}>
        <Text style={styles.title}>{t("interestsTitle")}</Text>
        <Text style={styles.subtitle}>{t("interestsSubtitle")}</Text>
        <View style={styles.interestGrid}>
          {INTEREST_ITEMS.map((it) => {
            const active = selected.includes(it.id);
            return (
              <Pressable
                key={it.id}
                onPress={() => onToggle(it.id)}
                testID={`onboarding-interest-${it.id}`}
                style={[styles.interestCell, active && styles.interestCellActive]}
              >
                <Icon name={it.icon as any} size={26} color={active ? colors.onBrandPrimary : colors.brandPrimary} />
                <Text style={[styles.interestText, active && { color: colors.onBrandPrimary }]}>{t(it.key)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { backgroundColor: colors.surfaceTertiary },
  stepBody: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  iconHeader: { alignItems: "center", paddingTop: spacing.xxl },
  iconHeaderCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  logoMark: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: colors.brandPrimary,
    alignItems: "center", justifyContent: "center",
  },
  brandName: { fontSize: 22, fontWeight: "700", color: colors.onSurface, letterSpacing: -0.3 },
  title: { fontSize: 28, fontWeight: "700", color: colors.onSurface, letterSpacing: -0.4 },
  subtitle: { fontSize: 16, color: colors.onSurfaceSecondary, marginTop: spacing.sm, lineHeight: 22 },
  sectionLabel: { fontSize: 14, fontWeight: "600", color: colors.onSurfaceSecondary, textTransform: "uppercase", letterSpacing: 0.6 },
  langRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  langPill: {
    flex: 1, paddingVertical: 16, borderRadius: radius.pill, alignItems: "center",
    backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border,
  },
  langPillActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  langPillText: { fontSize: 16, fontWeight: "600", color: colors.onSurface },
  langPillTextActive: { color: colors.onBrandPrimary },
  locationRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  locationRowActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  locationIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surface, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  locationName: { fontSize: 17, fontWeight: "600", color: colors.onSurface },
  locationMeta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  interestGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.lg },
  interestCell: {
    width: "47%", padding: spacing.lg, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    gap: spacing.sm, minHeight: 100, justifyContent: "center",
  },
  interestCellActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  interestText: { fontSize: 15, fontWeight: "600", color: colors.onSurface },
  footer: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
    backgroundColor: colors.surface, gap: spacing.md,
  },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.brandPrimary, width: 24 },
  cta: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 18, borderRadius: radius.pill,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
  },
  ctaText: { color: colors.onBrandPrimary, fontSize: 17, fontWeight: "700" },
});
