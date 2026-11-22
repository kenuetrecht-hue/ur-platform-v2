import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { useColors } from "@/hooks/use-colors";

/** A check they can tap and move on, with the long text behind a Read link. */
export function AgreeAndReadRow({
  checked,
  onToggle,
  label,
  href,
  readText,
  testID,
  ink,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  href?: string;
  readText?: string;
  testID?: string;
  ink?: string;
}) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const textColor = ink ?? colors.foreground;

  return (
    <View style={{ gap: 8 }} testID={testID}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <Pressable
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          hitSlop={8}
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: checked ? colors.primary : colors.border,
            backgroundColor: checked ? colors.primary : "transparent",
            marginTop: 2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {checked ? <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>✓</Text> : null}
        </Pressable>
        <Text style={{ color: textColor, fontSize: 16, lineHeight: 22, fontWeight: "800", flex: 1 }}>
          {label}{" "}
          {href ? (
            <Link href={href} style={{ color: colors.primary, fontWeight: "800", textDecorationLine: "underline" }}>
              Read
            </Link>
          ) : (
            <Text
              onPress={() => setOpen((value) => !value)}
              style={{ color: colors.primary, fontWeight: "800", textDecorationLine: "underline" }}
            >
              {open ? "Hide" : "Read"}
            </Text>
          )}
        </Text>
      </View>
      {open && readText ? (
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>{readText}</Text>
      ) : null}
    </View>
  );
}
