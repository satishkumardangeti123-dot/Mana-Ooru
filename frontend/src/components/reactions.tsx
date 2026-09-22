import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { api, type ReactionKind } from "@/src/api";
import { getDeviceId } from "@/src/device";
import { colors, radius, spacing } from "@/src/theme";
import * as Haptics from "expo-haptics";

const KINDS: { kind: ReactionKind; emoji: string }[] = [
  { kind: "pray", emoji: "🙏" },
  { kind: "heart", emoji: "❤️" },
  { kind: "alert", emoji: "⚠️" },
];

export function ReactionsRow({ postId, initial }: { postId: string; initial?: { pray?: number; heart?: number; alert?: number } }) {
  const [counts, setCounts] = useState({ pray: initial?.pray ?? 0, heart: initial?.heart ?? 0, alert: initial?.alert ?? 0 });
  const [mine, setMine] = useState<ReactionKind | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const dev = await getDeviceId();
        const r = await api.myReaction(postId, dev);
        setMine((r.kind as ReactionKind) ?? null);
      } catch {}
    })();
  }, [postId]);

  const tap = async (kind: ReactionKind) => {
    try {
      const dev = await getDeviceId();
      const prev = mine;
      // optimistic
      setCounts((c) => {
        const next = { ...c };
        if (prev === kind) { next[kind] = Math.max(0, next[kind] - 1); }
        else {
          if (prev) next[prev] = Math.max(0, next[prev] - 1);
          next[kind] = next[kind] + 1;
        }
        return next;
      });
      setMine(prev === kind ? null : kind);
      try { Haptics.selectionAsync(); } catch {}
      const r = await api.reactPost(postId, kind, dev);
      setCounts({ pray: r.reactions.pray ?? 0, heart: r.reactions.heart ?? 0, alert: r.reactions.alert ?? 0 });
    } catch {}
  };

  return (
    <View style={styles.row}>
      {KINDS.map(({ kind, emoji }) => {
        const active = mine === kind;
        const n = counts[kind] || 0;
        return (
          <Pressable
            key={kind}
            onPress={() => tap(kind)}
            style={[styles.chip, active && styles.chipActive]}
            testID={`reaction-${kind}-${postId}`}
          >
            <Text style={styles.emoji}>{emoji}</Text>
            {n > 0 && <Text style={[styles.count, active && styles.countActive]}>{n}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, flexWrap: "wrap" },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border,
    minWidth: 44, minHeight: 32, justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  emoji: { fontSize: 16 },
  count: { fontSize: 12, color: colors.onSurfaceSecondary, fontWeight: "700" },
  countActive: { color: colors.brandPrimary },
});
