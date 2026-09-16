import { Pressable, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { goBackOrHome } from "@/lib/page-back";

type Props = {
  label?: string;
  testID?: string;
};

/** Previous page if we have one, otherwise Home. Same on website and app. */
export function PageBackButton({ label = "← Back", testID = "page-back" }: Props) {
  const colors = useColors();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => goBackOrHome(router)}
      accessibilityRole="button"
      accessibilityLabel="Back"
      testID={testID}
      style={styles.row}
    >
      <Text style={[styles.text, { color: colors.primary }]}>{label}</Text>
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
