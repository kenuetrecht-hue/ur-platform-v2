import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { AppPressable } from "@/components/app-pressable";
import { usePasswordHygiene } from "@/hooks/use-password-hygiene";

/** Soft reminder after 30 / 60 / 90 days. Members can still wait and change it later. */
export function PasswordRemindBanner() {
  const colors = useColors();
  const router = useRouter();
  const { due, remindDays } = usePasswordHygiene();
  if (!due || !remindDays) return null;

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
      <AppPressable
        onPress={() => router.push("/profile/settings")}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 16,
          borderWidth: 1.5,
          borderColor: colors.primary,
          gap: 4,
        }}
        testID="password-remind-banner"
      >
        <Text pointerEvents="none" style={{ fontSize: 16, fontWeight: "800", color: colors.foreground }}>
          Time to change your password
        </Text>
        <Text pointerEvents="none" style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>
          It has been {remindDays} days. Tap here, type a new password, and stay safe. You can also
          wait and change it any day.
        </Text>
      </AppPressable>
    </View>
  );
}
