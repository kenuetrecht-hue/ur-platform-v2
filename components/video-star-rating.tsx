import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { VIDEO_STAR_RATING_HINT } from "@/lib/creator-free-content-policy";

const STARS = [1, 2, 3, 4, 5] as const;

export function VideoStarRating({
  average,
  count,
  myStars,
  disabled,
  onRate,
  compact = false,
}: {
  average: number;
  count: number;
  myStars: number | null;
  disabled?: boolean;
  onRate: (stars: number) => void;
  compact?: boolean;
}) {
  const colors = useColors();
  const shown = myStars ?? Math.round(average);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {STARS.map((star) => {
          const on = star <= shown && (myStars != null || count > 0);
          return (
            <Pressable
              key={star}
              disabled={disabled}
              onPress={() => onRate(star)}
              accessibilityRole="button"
              accessibilityLabel={`${star} star${star === 1 ? "" : "s"}`}
              style={styles.starBtn}
            >
              <Text style={{ fontSize: compact ? 18 : 22, color: on ? colors.primary : colors.muted }}>
                {on ? "★" : "☆"}
              </Text>
            </Pressable>
          );
        })}
        <Text style={[styles.meta, { color: colors.muted }]}>
          {count > 0 ? `${average.toFixed(1)} · ${count} rating${count === 1 ? "" : "s"}` : "Rate 1–5"}
        </Text>
      </View>
      {compact ? null : (
        <Text style={[styles.hint, { color: colors.muted }]}>{VIDEO_STAR_RATING_HINT}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 2 },
  starBtn: { paddingHorizontal: 2, paddingVertical: 2 },
  meta: { fontSize: 11, fontWeight: "700", marginLeft: 6 },
  hint: { fontSize: 10, lineHeight: 14 },
});
