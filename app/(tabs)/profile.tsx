import { useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { WarningBanner } from "@/components/warning-banner";
import { CreatorOnboardingFlow } from "@/components/creator-onboarding-flow";
import { consolidatedNavigation } from "@/lib/consolidated-navigation";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";
import { CustomLinkCard } from "@/components/transaction-history-list";
import { usePlatformOwner } from "@/lib/use-platform-owner";

const ROLE_LABELS: Record<string, string> = {
  creator: "Content creator",
  affiliate: "Affiliate",
  worker: "Worker",
  admin: "Admin",
  "3d-user": "3D User",
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const profileTab = consolidatedNavigation.getTab("profile");
  const subMenu = (profileTab?.subMenu ?? []).filter(
    (item) => item.id !== "admin" && item.id !== "dashboard",
  );
  const {
    canAccessAdminDashboard,
    ownerDisplayName,
    isPlatformOwner,
    adminRoleLabel,
  } = usePlatformOwner();
  const isOwner = isPlatformOwner;
  const ownerName = ownerDisplayName;
  const myLink = trpc.partnerDashboard.myCustomLink.useQuery(undefined, {
    enabled: Boolean(user),
  });

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
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>
              {isOwner ? ownerName : (user?.name ?? "User")}
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted }}>{user?.email}</Text>
            {isOwner ? (
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
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>
                  Platform Owner
                </Text>
              </View>
            ) : adminRoleLabel ? (
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
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>
                  Admin staff · {adminRoleLabel}
                </Text>
              </View>
            ) : user?.role ? (
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
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>
                  {ROLE_LABELS[user.role] ?? user.role}
                </Text>
              </View>
            ) : null}
          </View>

          {myLink.data ? (
            <CustomLinkCard
              customUrl={myLink.data.customUrl}
              slug={myLink.data.slug}
              label="Your personal UR link"
            />
          ) : null}

          <Pressable
            onPress={() => router.push("/(tabs)/messages")}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
              💬 Friends & Messages
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 }}>
              Add friends, chat back and forth, subscribe to creators, and track loyalty + transactions.
            </Text>
          </Pressable>

          {canAccessAdminDashboard ? (
            <Pressable
              onPress={() => router.push("/owner-ops")}
              style={{
                backgroundColor: `${colors.primary}12`,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1.5,
                borderColor: colors.primary,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primary }}>
                🏛️ Administration Dashboard
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 }}>
                {isPlatformOwner
                  ? "Platform owner only — ops AIs, staff, compliance, and full AI programming."
                  : `Staff access · ${adminRoleLabel ?? "Authorized role"}`}
              </Text>
            </Pressable>
          ) : null}

          {!canAccessAdminDashboard && (user?.role === "creator" || user?.role === "affiliate" || user?.role === "worker") ? (
            <Pressable
              onPress={() => router.push("/creator-dashboard")}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
                🎬 Content Creator Dashboard
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 }}>
                Schedule paid live classes, track transactions and earnings.
              </Text>
            </Pressable>
          ) : null}

          {!canAccessAdminDashboard ? (
            <Pressable
              onPress={() => router.push("/affiliate-dashboard")}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
                🔗 Affiliate Dashboard
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 }}>
                Share referral links · earn $5 when a creator completes their 5th transaction.
              </Text>
            </Pressable>
          ) : null}

          {subMenu.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                if (item.id === "dashboard") {
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
              <Text style={{ fontSize: 15, fontWeight: "500", color: colors.foreground }}>
                {item.label}
              </Text>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </Pressable>
          ))}

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
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>

      <CreatorOnboardingFlow
        visible={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
        onClose={() => setShowOnboarding(false)}
      />
    </ScreenContainer>
  );
}
