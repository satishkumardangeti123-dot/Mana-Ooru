import { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import Icon from "@react-native-vector-icons/material-design-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";

import { colors, spacing, radius } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { useAppState } from "@/src/app-state";
import { useAuth } from "@/src/auth";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

export default function NewPost() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLang();
  const { locationId } = useAppState();
  const { user, token, signIn } = useAuth();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [pickedType, setPickedType] = useState<string>("image/jpeg");
  const [posting, setPosting] = useState(false);

  if (!user) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + spacing.xl }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
          <Text style={styles.title}>{t("signInToPost")}</Text>
          <Pressable onPress={signIn} style={styles.primaryBtn} testID="post-signin-btn">
            <Icon name="google" size={18} color={colors.onBrandPrimary} />
            <Text style={styles.primaryBtnText}>{t("signIn")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const pickImage = async () => {
    const choose = () => new Promise<"camera" | "library" | null>((resolve) => {
      Alert.alert(t("chooseSource"), "", [
        { text: t("cancel"), style: "cancel", onPress: () => resolve(null) },
        { text: t("takePhoto"), onPress: () => resolve("camera") },
        { text: t("fromGallery"), onPress: () => resolve("library") },
      ]);
    });
    const source = await choose();
    if (!source) return;

    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t("takePhoto"), "Please allow camera access.");
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"] as any,
        quality: 0.7,
        allowsEditing: false,
      });
      if (res.canceled) return;
      const asset = res.assets[0];
      setPickedUri(asset.uri);
      setPickedType(asset.mimeType || "image/jpeg");
      return;
    }

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("addPhoto"), "Please allow photo library access.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      quality: 0.7,
      allowsEditing: false,
    });
    if (res.canceled) return;
    const asset = res.assets[0];
    setPickedUri(asset.uri);
    setPickedType(asset.mimeType || "image/jpeg");
  };

  const publish = async () => {
    if (!title.trim() && !body.trim() && !pickedUri) return;
    setPosting(true);
    try {
      let image_path: string | null = null;
      if (pickedUri) {
        const form = new FormData();
        if (Platform.OS === "web") {
          const blob = await (await fetch(pickedUri)).blob();
          form.append("file", blob, "photo.jpg");
        } else {
          // @ts-expect-error native FormData shape
          form.append("file", { uri: pickedUri, name: "photo.jpg", type: pickedType });
        }
        const up = await fetch(`${BASE}/api/uploads`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form as any,
        });
        if (!up.ok) throw new Error(`upload ${up.status}`);
        const data = await up.json();
        image_path = data.path;
      }
      const post = await fetch(`${BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), image_path, location_id: locationId }),
      });
      if (!post.ok) throw new Error(`post ${post.status}`);
      router.replace("/feed");
    } catch (e: any) {
      Alert.alert("Error", String(e?.message ?? e));
    } finally {
      setPosting(false);
    }
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.back} testID="new-post-back">
          <Icon name="close" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>{t("newPost")}</Text>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + 120, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t("postTitle")}
          placeholderTextColor={colors.muted}
          style={styles.titleInput}
          maxLength={120}
          testID="new-post-title"
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={t("postBody")}
          placeholderTextColor={colors.muted}
          style={styles.bodyInput}
          multiline
          maxLength={2000}
          testID="new-post-body"
        />

        {pickedUri ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: pickedUri }} style={styles.photo} contentFit="cover" />
            <View style={styles.photoBar}>
              <Pressable onPress={pickImage} style={styles.photoBtn} testID="new-post-change-photo">
                <Icon name="image-edit-outline" size={16} color={colors.onSurface} />
                <Text style={styles.photoBtnText}>{t("changePhoto")}</Text>
              </Pressable>
              <Pressable onPress={() => setPickedUri(null)} style={[styles.photoBtn, { backgroundColor: colors.errorTint }]} testID="new-post-remove-photo">
                <Icon name="trash-can-outline" size={16} color={colors.error} />
                <Text style={[styles.photoBtnText, { color: colors.error }]}>{t("removePhoto")}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={pickImage} style={styles.addPhoto} testID="new-post-add-photo">
            <Icon name="image-plus" size={22} color={colors.brandPrimary} />
            <Text style={styles.addPhotoText}>{t("addPhoto")}</Text>
          </Pressable>
        )}
      </KeyboardAwareScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md }]}>
        <Pressable
          onPress={publish}
          disabled={posting || (!title.trim() && !body.trim() && !pickedUri)}
          style={[styles.primaryBtn, (posting || (!title.trim() && !body.trim() && !pickedUri)) && { opacity: 0.4 }]}
          testID="new-post-publish"
        >
          {posting ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Icon name="send" size={18} color={colors.onBrandPrimary} />}
          <Text style={styles.primaryBtnText}>{posting ? t("publishing") : t("publish")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  titleInput: { fontSize: 18, fontWeight: "700", color: colors.onSurface, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary },
  bodyInput: { minHeight: 140, textAlignVertical: "top", fontSize: 15, color: colors.onSurface, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary },
  addPhoto: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderStyle: "dashed", borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  addPhotoText: { fontSize: 15, fontWeight: "700", color: colors.brandPrimary },
  photoWrap: { gap: spacing.sm },
  photo: { width: "100%", aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: colors.surfaceTertiary },
  photoBar: { flexDirection: "row", gap: spacing.sm },
  photoBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary },
  photoBtnText: { fontSize: 13, fontWeight: "700", color: colors.onSurface },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.surface },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: 16, borderRadius: radius.pill, backgroundColor: colors.brandPrimary },
  primaryBtnText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "800" },
});
