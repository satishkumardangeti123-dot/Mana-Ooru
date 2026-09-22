// Home screen with rotating search, mic voice search, quick actions, buses & updates
import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";

import { colors, spacing, radius } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { useAppState } from "@/src/app-state";
import { api } from "@/src/api";
import { usesNativeTabs } from "@/src/navigation";
import { transcribeUri, showMicDenied } from "@/src/voice";

const QUICK_ACTIONS = [
  { id: "emergency", icon: "alert-decagram-outline", tone: "error", route: "/(tabs)/emergency" },
  { id: "health", icon: "heart-pulse", tone: "brand", route: "/(tabs)/health" },
  { id: "transport", icon: "bus", tone: "brand", route: "/section/transport" },
  { id: "services", icon: "tools", tone: "brand", route: "/section/services" },
  { id: "shops", icon: "storefront-outline", tone: "brand", route: "/section/shops" },
  { id: "government", icon: "bank-outline", tone: "brand", route: "/section/government" },
  { id: "agriculture", icon: "sprout-outline", tone: "brand", route: "/section/agriculture" },
  { id: "updates", icon: "bullhorn-outline", tone: "accent", route: "/feed" },
] as const;

const HINT_KEYS = ["searchHint1", "searchHint2", "searchHint3", "searchHint4", "searchHint5"] as const;

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang } = useLang();
  const { locationId } = useAppState();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const { data: location } = useQuery({
    queryKey: ["location", locationId],
    queryFn: async () => (await api.locations()).find((l) => l.id === locationId),
  });
  const { data: updates = [] } = useQuery({ queryKey: ["updates", locationId], queryFn: () => api.updates(locationId) });
  const { data: busesResp } = useQuery({
    queryKey: ["buses", locationId],
    queryFn: () => api.buses(locationId),
    refetchInterval: 60_000,
    enabled: locationId === "patavala",
  });

  const [hintIndex, setHintIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setHintIndex((i) => (i + 1) % HINT_KEYS.length), 2200);
    return () => clearInterval(id);
  }, []);

  const [query, setQuery] = useState("");
  const canSubmit = query.trim().length > 0;

  const submitSearch = () => {
    if (!canSubmit) return;
    router.push({ pathname: "/search", params: { q: query.trim() } });
  };

  // Voice
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const startedRef = useRef(false);

  const onMicPress = async () => {
    try {
      if (recState.isRecording) {
        // Stop and transcribe
        await recorder.stop();
        const uri = recorder.uri;
        if (!uri) return;
        setVoiceBusy(true);
        try {
          const ct = Platform.OS === "web" ? "audio/webm" : "audio/m4a";
          const res = await transcribeUri(uri, ct);
          if (res.text) {
            setQuery(res.text);
            router.push({ pathname: "/search", params: { q: res.text } });
          } else {
            Alert.alert(t("voiceSearch"), t("tapToSpeak"));
          }
        } finally {
          setVoiceBusy(false);
        }
        return;
      }
      // Start recording
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        showMicDenied(t as any);
        return;
      }
      if (!startedRef.current) {
        try { await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true }); } catch {}
        startedRef.current = true;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      console.warn("mic error", e);
      Alert.alert(t("voiceSearch"), String(e));
      setVoiceBusy(false);
    }
  };

  const locName = location ? (lang === "te" ? location.name_te : location.name_en) : "";
  const locSub = location ? (lang === "te" ? `${location.district_te}, ${location.state_te}` : `${location.district_en}, ${location.state_en}`) : "";

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: bottomChrome + spacing.xxl }}
        showsVerticalScrollIndicator={false}
        testID="home-scroll"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.push("/settings")} style={styles.locBtn} testID="home-location-button">
            <Icon name="map-marker" size={18} color={colors.brandPrimary} />
            <View>
              <Text style={styles.locName} numberOfLines={1}>{locName || t("chooseLocation")}</Text>
              <Text style={styles.locSub} numberOfLines={1}>{locSub}</Text>
            </View>
            <Icon name="chevron-down" size={18} color={colors.muted} />
          </Pressable>
          <Pressable onPress={() => router.push("/settings")} style={styles.iconBtn} testID="home-settings-button">
            <Icon name="cog-outline" size={22} color={colors.onSurface} />
          </Pressable>
        </View>

        <View style={styles.brandRow}>
          <Text style={styles.brandTitle}>{t("appName")}</Text>
          <Text style={styles.brandSubtitle}>{t("tagline")}</Text>
        </View>

        <View style={styles.searchWrap}>
          <Icon name="magnify" size={22} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("whatDoYouNeed") + " · " + t(HINT_KEYS[hintIndex])}
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={submitSearch}
            testID="home-search-input"
          />
          <Pressable
            onPress={onMicPress}
            disabled={voiceBusy}
            style={[styles.micBtn, recState.isRecording && styles.micBtnRec, voiceBusy && { opacity: 0.5 }]}
            testID="home-voice-button"
          >
            <Icon name={recState.isRecording ? "stop" : "microphone"} size={18} color={recState.isRecording ? colors.onError : colors.brandPrimary} />
          </Pressable>
          <Pressable
            onPress={submitSearch}
            disabled={!canSubmit}
            style={[styles.searchGo, !canSubmit && { opacity: 0.35 }]}
            testID="home-search-submit"
          >
            <Icon name="arrow-right" size={18} color={colors.onBrandPrimary} />
          </Pressable>
        </View>
        {recState.isRecording && (
          <Text style={styles.listening}>{t("listening")}</Text>
        )}

        <Text style={styles.sectionTitle}>{t("quickActions")}</Text>
        <View style={styles.grid}>
          {QUICK_ACTIONS.map((a) => (
            <QuickCard key={a.id} icon={a.icon} label={t(a.id as any)} tone={a.tone} onPress={() => router.push(a.route as any)} testID={`home-action-${a.id}`} />
          ))}
        </View>

        {busesResp && busesResp.buses.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{t("nextBuses")}</Text>
              <Pressable onPress={() => router.push("/section/transport")} testID="home-buses-see-all">
                <Text style={styles.seeAll}>{t("seeAll")}</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.busRow}>
              {busesResp.buses.map((b, i) => (
                <View key={`${b.time}-${i}`} style={styles.busCard} testID={`bus-card-${i}`}>
                  <Text style={styles.busTime}>{b.time}</Text>
                  <Text style={styles.busEta}>{b.eta_min <= 60 ? `${b.eta_min} ${t("min")}` : `${Math.floor(b.eta_min / 60)}h ${b.eta_min % 60}m`}</Text>
                  <View style={styles.busSep} />
                  <Text style={styles.busTo} numberOfLines={1}>{lang === "te" ? b.to_te : b.to_en}</Text>
                  <View style={styles.routePill}><Text style={styles.routePillText}>{b.route}</Text></View>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {updates.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{t("latestUpdates")}</Text>
              <Pressable onPress={() => router.push("/feed")} testID="home-updates-see-all">
                <Text style={styles.seeAll}>{t("seeAll")}</Text>
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
              {updates.slice(0, 3).map((u) => (
                <View key={u.id} style={styles.updateCard} testID={`update-card-${u.id}`}>
                  {(lang === "te" ? u.tag_te : u.tag_en) && (
                    <View style={styles.tag}><Text style={styles.tagText}>{lang === "te" ? u.tag_te : u.tag_en}</Text></View>
                  )}
                  <Text style={styles.updateTitle}>{lang === "te" ? u.title_te : u.title_en}</Text>
                  <Text style={styles.updateBody} numberOfLines={2}>{lang === "te" ? u.body_te : u.body_en}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function QuickCard({ icon, label, tone, onPress, testID }: { icon: string; label: string; tone: "brand" | "error" | "accent"; onPress: () => void; testID: string }) {
  const bg = tone === "error" ? colors.errorTint : tone === "accent" ? colors.accentTint : colors.brandTertiary;
  const fg = tone === "error" ? colors.error : tone === "accent" ? colors.accentPrimary : colors.brandPrimary;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.qCard, pressed && { transform: [{ scale: 0.98 }] }]} testID={testID}>
      <View style={[styles.qIcon, { backgroundColor: bg }]}>
        <Icon name={icon as any} size={26} color={fg} />
      </View>
      <Text style={styles.qLabel} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.xl, gap: spacing.md },
  locBtn: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  locName: { fontSize: 15, fontWeight: "700", color: colors.onSurface, maxWidth: 200 },
  locSub: { fontSize: 11, color: colors.muted, maxWidth: 220 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  brandRow: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.md },
  brandTitle: { fontSize: 32, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.6 },
  brandSubtitle: { fontSize: 15, color: colors.onSurfaceSecondary, marginTop: 4 },
  searchWrap: { marginHorizontal: spacing.xl, marginTop: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, minHeight: 56 },
  searchInput: { flex: 1, fontSize: 16, color: colors.onSurface, paddingVertical: spacing.md },
  micBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  micBtnRec: { backgroundColor: colors.error },
  searchGo: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  listening: { color: colors.error, fontSize: 12, fontWeight: "700", marginLeft: spacing.xl, marginTop: 6 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.onSurface, paddingHorizontal: spacing.xl, marginTop: spacing.xl, marginBottom: spacing.md },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: spacing.xl },
  seeAll: { fontSize: 14, fontWeight: "600", color: colors.brandPrimary },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.xl, justifyContent: "space-between", rowGap: spacing.md },
  qCard: { width: "48%", padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md, minHeight: 118 },
  qIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  qLabel: { fontSize: 15, fontWeight: "700", color: colors.onSurface },

  busRow: { paddingHorizontal: spacing.xl, gap: spacing.md, paddingVertical: spacing.xs },
  busCard: { width: 140, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 4 },
  busTime: { fontSize: 22, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.4 },
  busEta: { fontSize: 12, color: colors.brandPrimary, fontWeight: "700" },
  busSep: { height: 1, backgroundColor: colors.divider, marginVertical: 6 },
  busTo: { fontSize: 13, color: colors.onSurfaceSecondary, fontWeight: "600" },
  routePill: { alignSelf: "flex-start", marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.brandTertiary },
  routePillText: { fontSize: 11, fontWeight: "700", color: colors.onBrandTertiary },

  updateCard: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, gap: 6 },
  tag: { alignSelf: "flex-start", backgroundColor: colors.accentTint, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  tagText: { fontSize: 11, fontWeight: "700", color: colors.onAccentTint, letterSpacing: 0.4, textTransform: "uppercase" },
  updateTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  updateBody: { fontSize: 14, color: colors.onSurfaceSecondary, lineHeight: 20 },
});
