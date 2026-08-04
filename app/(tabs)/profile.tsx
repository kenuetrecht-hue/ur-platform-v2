import { useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { WarningBanner } from "@/components/warning-banner";
import { AdminDashboard } from "@/components/admin-dashboard";
import { CreatorOnboardingFlow } from "@/components/creator-onboarding-flow";
import { consolidatedNavigation } from "@/lib/consolidated-navigation";
import { IconSymbol } from "@/components/ui/icon-symbol";

const ROLE_LABELS: Record<string, string> = {
  creator: "Creator",
  worker: "Worker",
  admin: "Admin",
  "3d-user": "3D User",
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const [showAdmin, setShowAdmin] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const profileTab = consolidatedNavigation.getTab("profile");
  const subMenu = profileTab?.subMenu ?? [];

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <WarningBanner variant="compact" />

        <TabScreenHeader
          icon="👤"
          title="Profile"
          subtitle="Manage your account, earnings, and settings."
        />

        <View style={{ paddingHorizontal: 16, gap: 16 }}>
          {/* User card */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.border,
              gap: 8,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: `${colors.primary}20`,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
              }}
            >
              <Text style={{ fontSize: 28 }}>
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </Text>
            </View>
            <Text
              style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}
            >
              {user?.name ?? "User"}
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted }}>{user?.email}</Text>
            {user?.role ? (
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: `${colors.primary}18`,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  marginTop: 4,
                }}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {ROLE_LABELS[user.role] ?? user.role}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Profile menu items */}
          {subMenu.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                if (item.id === "admin" && user?.role === "admin") {
                  setShowAdmin(true);
                } else if (item.id === "dashboard") {
                  setShowOnboarding(true);
                }
              }}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{ fontSize: 15, fontWeight: "500", color: colors.foreground }}
              >
                {item.label}
              </Text>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </Pressable>
          ))}

          {user?.role === "admin" ? (
            <Pressable
              onPress={() => setShowAdmin(true)}
              style={{
                backgroundColor: `${colors.primary}15`,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.primary,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.primary }}>
                Open Admin Dashboard
              </Text>
              <IconSymbol name="chevron.right" size={18} color={colors.primary} />
            </Pressable>
          ) : null}

          <Pressable
            onPress={handleLogout}
            style={{
              backgroundColor: "#ef4444",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
              Sign Out
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <AdminDashboard visible={showAdmin} onClose={() => setShowAdmin(false)} />

      <CreatorOnboardingFlow
        visible={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
        onClose={() => setShowOnboarding(false)}
      />
    </ScreenContainer>
  );
}
