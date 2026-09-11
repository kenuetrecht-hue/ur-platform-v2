import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";

/** Stripe / Apple-style disclosure: one tap opens the long text, so the main path stays short. */
export function TapToRead({
  title,
  children,
  testID,
}: {
  title: string;
  children: ReactNode;
  testID?: string;
}) {
  const colors = useColors();
  const [open, setOpen] = useState(false);

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        backgroundColor: colors.surface,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={() => setOpen((value) => !value)}
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ paddingHorizontal: 14, paddingVertical: 12 }}
      >
        <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 15 }}>
          {open ? "Hide" : "Read"} · {title}
        </Text>
      </Pressable>
      {open ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
          {typeof children === "string" ? (
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>{children}</Text>
          ) : (
            children
          )}
        </View>
      ) : null}
    </View>
  );
}
