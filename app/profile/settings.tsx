import { Stack } from "expo-router";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ProfileStackScreen } from "@/components/profile-stack-screen";
import { WarningDisclosureModal } from "@/components/warning-banner";
import { useColors } from "@/hooks/use-colors";
import { useThemeContext } from "@/lib/theme-provider";
import type { ColorScheme } from "@/constants/theme";

export default function ProfileSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { colorScheme, setColorScheme } = useThemeContext();

  const themeOptions: { id: ColorScheme; label: string }[] = [
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileStackScreen
        title="Settings"
        subtitle="Appearance, disclosures, and preferences."
        icon="⚙️"
      >
        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: 16,
            gap: 10,
          }}
        >
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>Theme</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {themeOptions.map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => setColorScheme(opt.id)}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: "center",
                  borderWidth: 1.5,
                  borderColor: colorScheme === opt.id ? colors.primary : colors.border,
                  backgroundColor: colorScheme === opt.id ? `${colors.primary}15` : colors.background,
                }}
              >
                <Text
                  style={{
                    color: colorScheme === opt.id ? colors.primary : colors.foreground,
                    fontWeight: "700",
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <WarningDisclosureModal />

        <Pressable
          onPress={() => router.push("/profile/terms")}
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: 16,
            gap: 6,
          }}
        >
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>Terms of Use</Text>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
            No refunds on AI purchases · Zero harassment · Creator transactions are not UR LLC&apos;s responsibility
          </Text>
        </Pressable>

        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: 16,
            gap: 6,
          }}
        >
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
            Notifications
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
            Push notification preferences will appear here when the production app is live on
            urplatform.llc.
          </Text>
        </View>
      </ProfileStackScreen>
    </>
  );
}
