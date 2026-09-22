import { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import Icon from "@react-native-vector-icons/material-design-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { colors, spacing, radius } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { useAppState } from "@/src/app-state";
import { useAuth } from "@/src/auth";

export default function AdminBroadcast() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLang();
  const { locationId } = useAppState();
  const { authFetch } = useAuth();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!title.trim() || !message.trim()) return;
    setBusy(true);
    try {
      const r = await authFetch("/api/admin/announcements/broadcast", {
        method: "POST",
        body: JSON.stringify({ location_id: locationId, title: title.trim(), message: message.trim(), tag_en: tag.trim() || null, tag_te: tag.trim() || null }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const data = await r.json();
      Alert.alert(t("sent"), `${data.recipients ?? 0} devices`);
      setTitle(""); setMessage(""); setTag("");
    } catch (e: any) {
      Alert.alert("Error", String(e?.message ?? e));
    } finally { setBusy(false); }
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.back} testID="broadcast-back"><Icon name="arrow-left" size={22} color={colors.onSurface} /></Pressable>
        <Text style={styles.title}>{t("broadcast")}</Text>
      </View>
      <KeyboardAwareScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, paddingBottom: insets.bottom + 120 }} keyboardShouldPersistTaps="handled">
        <Field label={t("broadcastTitle")} value={title} onChange={setTitle} placeholder="Water supply update" testID="broadcast-title" />
        <Field label={t("broadcastMessage")} value={message} onChange={setMessage} placeholder="No water tomorrow 9-11am" multiline testID="broadcast-message" />
        <Field label={t("broadcastTag")} value={tag} onChange={setTag} placeholder="Utility" testID="broadcast-tag" />
      </KeyboardAwareScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md }]}>
        <Pressable onPress={send} disabled={busy || !title.trim() || !message.trim()} style={[styles.primaryBtn, (busy || !title.trim() || !message.trim()) && { opacity: 0.4 }]} testID="broadcast-send">
          {busy ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Icon name="send" size={18} color={colors.onBrandPrimary} />}
          <Text style={styles.primaryBtnText}>{t("send")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, multiline, testID }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; testID?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[styles.input, multiline && { minHeight: 120, textAlignVertical: "top" }]}
        multiline={multiline}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { fontSize: 15, color: colors.onSurface, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.surface },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: 16, borderRadius: radius.pill, backgroundColor: colors.brandPrimary },
  primaryBtnText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "800" },
});
