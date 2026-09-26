import { Pressable, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { goBackOrHome } from "@/lib/page-back";

type Props = {
  label?: string;
  testID?: string;
  /** Light pages (the e-manual) use bluish-purple. The blue wash keeps gold. */
  tone?: "wash" | "light";
};

/** Previous page if we have one, otherwise Home. Same on website and app. */
export function PageBackButton({ label = "← Back", testID = "page-back", tone = "wash" }: Props) {
  const colors = useColors();
  const router = useRouter();
  const ink = tone === "light" ? colors.onWhite : colors.gold;

  return (
    <Pressable
      onPress={() => goBackOrHome(router)}
      accessibilityRole="button"
      accessibilityLabel="Back"
      testID={testID}
      style={styles.row}
    >
      <Text style={[styles.text, { color: ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  text: {
    fontSize: 15,
    fontWeight: "700",
  },
});
