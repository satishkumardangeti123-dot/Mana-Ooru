import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import Icon from "@react-native-vector-icons/material-design-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { colors, spacing, radius } from "@/src/theme";
import { useLang } from "@/src/i18n";
import type { Business } from "@/src/api";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

export default function EmployeeEdit() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang } = useLang();
  const params = useLocalSearchParams<{ business_id?: string }>();

  const [token, setToken] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(params.business_id ?? null);
  const [biz, setBiz] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [nameEn, setNameEn] = useState("");
  const [nameTe, setNameTe] = useState("");
  const [subtitleEn, setSubtitleEn] = useState("");
  const [subtitleTe, setSubtitleTe] = useState("");
  const [phone, setPhone] = useState("");
  const [addressEn, setAddressEn] = useState("");
  const [addressTe, setAddressTe] = useState("");
  const [hoursEn, setHoursEn] = useState("");
  const [hoursTe, setHoursTe] = useState("");
  const [openNow, setOpenNow] = useState(true);

  useEffect(() => {
    (async () => {
      const [tok, bid] = await Promise.all([
        AsyncStorage.getItem("@manaooru:edit_token"),
        AsyncStorage.getItem("@manaooru:edit_business_id"),
      ]);
      const useBid = params.business_id || bid;
      if (!tok || !useBid) {
        router.replace("/employee/login");
        return;
      }
      setToken(tok);
      setBusinessId(useBid);
      try {
        const r = await fetch(`${BASE}/api/business/${encodeURIComponent(useBid)}/me`, {
          headers: { "X-Edit-Token": tok },
        });
        if (!r.ok) {
          await AsyncStorage.multiRemove(["@manaooru:edit_token", "@manaooru:edit_business_id"]);
          router.replace("/employee/login");
          return;
        }
        const b: Business = await r.json();
        setBiz(b);
        setNameEn(b.name_en); setNameTe(b.name_te);
        setSubtitleEn(b.subtitle_en ?? ""); setSubtitleTe(b.subtitle_te ?? "");
        setPhone(b.phone ?? "");
        setAddressEn(b.address_en ?? ""); setAddressTe(b.address_te ?? "");
        setHoursEn(b.hours_en ?? ""); setHoursTe(b.hours_te ?? "");
        setOpenNow(b.open_now);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    if (!token || !businessId) return;
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/api/business/${encodeURIComponent(businessId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Edit-Token": token },
        body: JSON.stringify({
          name_en: nameEn, name_te: nameTe,
          subtitle_en: subtitleEn, subtitle_te: subtitleTe,
          phone, address_en: addressEn, address_te: addressTe,
          hours_en: hoursEn, hours_te: hoursTe,
          open_now: openNow,
        }),
      });
      if (!r.ok) throw new Error(String(r.status));
      Alert.alert(t("savedChanges"));
    } catch (e: any) {
      Alert.alert("Error", String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(["@manaooru:edit_token", "@manaooru:edit_business_id"]);
    router.replace("/(tabs)");
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.replace("/(tabs)")} style={styles.back} testID="employee-edit-back">
          <Icon name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{t("editingShop")}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{lang === "te" ? nameTe : nameEn}</Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutBtn} testID="employee-logout">
          <Icon name="logout" size={16} color={colors.error} />
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + 120, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>{t("isOpenNow")}</Text>
              <Text style={styles.helper}>{openNow ? t("open") : t("closed")}</Text>
            </View>
            <Switch value={openNow} onValueChange={setOpenNow} thumbColor={openNow ? colors.brandPrimary : "#f4f3f4"} trackColor={{ true: colors.brandTertiary, false: colors.border }} testID="employee-edit-open-now" />
          </View>
        </View>

        <Field label="Name (English)" value={nameEn} onChange={setNameEn} testID="employee-edit-name-en" />
        <Field label="Name (Telugu)" value={nameTe} onChange={setNameTe} testID="employee-edit-name-te" />
        <Field label="Subtitle (English)" value={subtitleEn} onChange={setSubtitleEn} testID="employee-edit-subtitle-en" />
        <Field label="Subtitle (Telugu)" value={subtitleTe} onChange={setSubtitleTe} testID="employee-edit-subtitle-te" />
        <Field label={t("hoursLabel") + " (English)"} value={hoursEn} onChange={setHoursEn} testID="employee-edit-hours-en" />
        <Field label={t("hoursLabel") + " (Telugu)"} value={hoursTe} onChange={setHoursTe} testID="employee-edit-hours-te" />
        <Field label={t("phoneLabel")} value={phone} onChange={setPhone} keyboardType="phone-pad" testID="employee-edit-phone" />
        <Field label={t("addressLabel") + " (English)"} value={addressEn} onChange={setAddressEn} testID="employee-edit-address-en" />
        <Field label={t("addressLabel") + " (Telugu)"} value={addressTe} onChange={setAddressTe} testID="employee-edit-address-te" />
      </KeyboardAwareScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md }]}>
        <Pressable
          onPress={save}
          disabled={saving}
          style={[styles.primaryBtn, saving && { opacity: 0.4 }]}
          testID="employee-edit-save"
        >
          {saving ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Icon name="content-save" size={18} color={colors.onBrandPrimary} />}
          <Text style={styles.primaryBtnText}>{t("saveChanges")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Field({ label, value, onChange, keyboardType, testID }: { label: string; value: string; onChange: (v: string) => void; keyboardType?: any; testID?: string }) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={styles.input}
        keyboardType={keyboardType}
        placeholderTextColor={colors.muted}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 15, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  subtitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface, marginTop: 2 },
  logoutBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.errorTint },
  card: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  cardLabel: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  helper: { fontSize: 12, color: colors.muted, marginTop: 2 },
  inputWrap: { gap: 6 },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { fontSize: 15, color: colors.onSurface, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.surface },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: 16, borderRadius: radius.pill, backgroundColor: colors.brandPrimary },
  primaryBtnText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "800" },
});
