import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "expo-router";

export default function DashboardScreen() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-4 py-6 gap-6">
          
          {/* Welcome Section */}
          <View className="gap-3">
            <Text className="text-3xl font-bold text-foreground">
              Welcome back!
            </Text>
            <Text className="text-lg text-muted leading-relaxed">
              Welcome back to your secure workspace. What are we going to accomplish successfully today?
            </Text>
          </View>

          {/* User Info Card */}
          <View 
            className="bg-surface rounded-xl p-6 border border-border"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-sm text-muted font-semibold mb-2 uppercase tracking-wide">
              Logged In As
            </Text>
            <Text className="text-xl font-bold text-foreground mb-1">
              {user?.name || "User"}
            </Text>
            <Text className="text-sm text-muted">
              {user?.email}
            </Text>
            <View className="mt-4 pt-4 border-t" style={{ borderTopColor: colors.border }}>
              <Text className="text-xs text-muted font-semibold uppercase tracking-wide">
                Role
              </Text>
              <Text className="text-sm text-foreground font-semibold capitalize mt-1">
                {user?.role || "creator"}
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="gap-3">
            <Text className="text-sm text-muted font-semibold uppercase tracking-wide">
              Quick Actions
            </Text>
            
            <Pressable
              style={({ pressed }) => [
                {
                  backgroundColor: colors.primary,
                  padding: 16,
                  borderRadius: 10,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text className="text-white font-semibold text-center">
                Start Creating
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                {
                  backgroundColor: colors.surface,
                  padding: 16,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text className="text-foreground font-semibold text-center">
                View Analytics
              </Text>
            </Pressable>
          </View>

          {/* Security Info */}
          <View 
            className="bg-blue-50 rounded-xl p-4 border border-blue-200"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-xs text-muted font-bold uppercase tracking-wide mb-2">
              🔐 Security
            </Text>
            <Text className="text-sm text-foreground leading-relaxed">
              Your account is protected with military-grade encryption. Your session is secure.
            </Text>
          </View>

          {/* Logout Button */}
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              {
                backgroundColor: colors.error,
                padding: 14,
                borderRadius: 10,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text className="text-white font-semibold text-center">
              Logout
            </Text>
          </Pressable>

        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
