import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function AccountScreen() {
  const colors = useColors();

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 py-6">
          <Text className="text-3xl font-bold text-foreground mb-2">Account</Text>
          <Text className="text-base text-muted mb-6">
            Manage your account settings
          </Text>

          <View className="gap-3">
            <TouchableOpacity className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-base font-semibold text-foreground">Email</Text>
              <Text className="text-sm text-muted mt-1">kenneth@urplatform.com</Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-base font-semibold text-foreground">Phone</Text>
              <Text className="text-sm text-muted mt-1">+1 (555) 123-4567</Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-base font-semibold text-foreground">Password</Text>
              <Text className="text-sm text-muted mt-1">Change password</Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-base font-semibold text-foreground">Two-Factor Authentication</Text>
              <Text className="text-sm text-success mt-1">Enabled</Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-error/10 rounded-lg p-4 border border-error mt-4">
              <Text className="text-base font-semibold text-error">Delete Account</Text>
              <Text className="text-sm text-error/70 mt-1">Permanently delete your account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
