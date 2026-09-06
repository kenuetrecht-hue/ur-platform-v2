import { Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";

export function SignupStepExplain({
  doThis,
  why,
}: {
  doThis: string;
  why: string;
}) {
  const colors = useColors();
  return (
    <View style={{ gap: 4, marginBottom: 8 }}>
      <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 17, fontWeight: "600" }}>
        What to do: {doThis}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>Why: {why}</Text>
    </View>
  );
}
