import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Card, HeaderBar } from "@/components/ur-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function SettingsScreen() {
  const colors = useColors();

  const sections = [
    {
      title: "Account",
      items: [
        { icon: "person.fill", label: "Edit Profile", onPress: () => Alert.alert("Edit Profile", "Profile editing available soon.") },
        { icon: "envelope.fill", label: "Email & Password", onPress: () => Alert.alert("Email & Password", "Account settings coming soon.") },
        { icon: "checkmark.shield.fill", label: "Identity Verification", onPress: () => router.push("/verify-age" as any) },
      ],
    },
    {
      title: "Payments",
      items: [
        { icon: "creditcard.fill", label: "Payment Methods", onPress: () => Alert.alert("Payment Methods", "Add a debit/credit card or bank account.") },
        { icon: "doc.text.fill", label: "Transaction History", onPress: () => router.push("/(tabs)/wallet") },
        { icon: "doc.fill", label: "Tax Documents (1099)", onPress: () => Alert.alert("Tax Documents", "1099 forms become available in January for the prior year.") },
      ],
    },
    {
      title: "Notifications",
      items: [
        { icon: "bell.fill", label: "Push Notifications", onPress: () => Alert.alert("Notifications", "Notification preferences coming soon.") },
        { icon: "envelope.fill", label: "Email Preferences", onPress: () => Alert.alert("Email Preferences", "Email settings coming soon.") },
      ],
    },
    {
      title: "Privacy & Safety",
      items: [
        { icon: "lock.fill", label: "Blocked Users", onPress: () => Alert.alert("Blocked Users", "You haven&apos;t blocked anyone.") },
        { icon: "checkmark.shield.fill", label: "Privacy Settings", onPress: () => Alert.alert("Privacy", "Privacy controls coming soon.") },
        { icon: "exclamationmark.triangle.fill", label: "Report a Problem", onPress: () => router.push("/help" as any) },
      ],
    },
    {
      title: "About",
      items: [
        { icon: "questionmark.circle.fill", label: "Help & Support", onPress: () => router.push("/help" as any) },
        { icon: "doc.text.fill", label: "Terms of Service", onPress: () => Alert.alert("Terms of Service", "Available at ur-app.com/terms") },
        { icon: "lock.fill", label: "Privacy Policy", onPress: () => Alert.alert("Privacy Policy", "Available at ur-app.com/privacy") },
        { icon: "info.circle.fill", label: "App Version 1.0.0", onPress: () => {} },
      ],
    },
  ];

  return (
    <ScreenContainer>
      <HeaderBar title="Settings" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        {sections.map((section) => (
          <View key={section.title}>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, paddingHorizontal: 4 }}>
              {section.title}
            </Text>
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
              {section.items.map((item, idx) => (
                <Pressable
                  key={item.label}
                  onPress={item.onPress}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    borderBottomWidth: idx === section.items.length - 1 ? 0 : 0.5,
                    borderBottomColor: colors.border,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <IconSymbol name={item.icon as any} size={20} color={colors.foreground} />
                  <Text style={{ flex: 1, color: colors.foreground, fontSize: 15 }}>{item.label}</Text>
                  <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Pressable
          onPress={() => Alert.alert("Delete account?", "This permanently removes your account and data. This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => Alert.alert("Account deletion requested", "Your account will be deleted within 7 days.") },
          ])}
          style={({ pressed }) => ({ paddingVertical: 14, alignItems: "center", opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={{ color: colors.error, fontSize: 14, fontWeight: "600" }}>Delete Account</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
