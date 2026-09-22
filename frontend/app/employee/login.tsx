import { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import Icon from "@react-native-vector-icons/material-design-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { colors, spacing, radius } from "@/src/theme";
import { useLang } from "@/src/i18n";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

export default function EmployeeLogin() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLang();
  const [businessId, setBusinessId] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!businessId.trim() || !code.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`${BASE}/api/business/${encodeURIComponent(businessId.trim())}/edit-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!r.ok) {
        Alert.alert(t("invalidCode"));
        return;
      }
      const data = await r.json();
      await AsyncStorage.setItem("@manaooru:edit_token", data.token);
      await AsyncStorage.setItem("@manaooru:edit_business_id", data.business_id);
      router.replace({ pathname: "/employee/edit", params: { business_id: data.business_id } });
    } catch (e) {
      Alert.alert(t("invalidCode"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.back} testID="employee-login-back">
          <Icon name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconHeader}>
          <View style={styles.iconCircle}>
            <Icon name="store-cog-outline" size={30} color={colors.brandPrimary} />
          </View>
        </View>
        <Text style={styles.title}>{t("employeeLoginTitle")}</Text>
        <Text style={styles.hint}>{t("employeeLoginHint")}</Text>

        <View style={{ gap: spacing.md }}>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>{t("businessId")}</Text>
            <TextInput
              value={businessId}
              onChangeText={setBusinessId}
              placeholder="business-id-uuid"
              placeholderTextColor={colors.muted}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              testID="employee-login-business-id"
            />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>{t("editCode")}</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="6-digit code"
              placeholderTextColor={colors.muted}
              style={styles.input}
              keyboardType="number-pad"
              maxLength={6}
              testID="employee-login-code"
            />
          </View>
        </View>

        <Pressable
          onPress={submit}
          disabled={busy || !businessId.trim() || !code.trim()}
          style={[styles.primaryBtn, (busy || !businessId.trim() || !code.trim()) && { opacity: 0.4 }]}
          testID="employee-login-submit"
        >
          {busy ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Icon name="login" size={18} color={colors.onBrandPrimary} />}
          <Text style={styles.primaryBtnText}>{t("signInAsShop")}</Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  iconHeader: { alignItems: "center", paddingTop: spacing.md },
  iconCircle: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.4, textAlign: "center" },
  hint: { fontSize: 14, color: colors.onSurfaceSecondary, textAlign: "center", lineHeight: 20 },
  inputWrap: { gap: 6 },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { fontSize: 15, color: colors.onSurface, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: 16, borderRadius: radius.pill, backgroundColor: colors.brandPrimary, marginTop: spacing.md },
  primaryBtnText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "800" },
});
