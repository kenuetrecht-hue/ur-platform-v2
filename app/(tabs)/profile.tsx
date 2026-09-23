import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { getPostLogoutHref } from "@/lib/post-auth-redirect";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { consolidatedNavigation } from "@/lib/consolidated-navigation";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";
import { CustomLinkCard } from "@/components/transaction-history-list";
import { LoyaltyTrackingPanel } from "@/components/loyalty-tracking-panel";
import { ThanksStampsPanel } from "@/components/thanks-stamps-panel";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { HubTabBar } from "@/components/hub-tab-bar";
import { HubDoorGrid, HubDoorTile } from "@/components/hub-door-tile";
import { DashboardScreen } from "@/components/dashboard-screen";
import { PROFILE_HUB_TABS } from "@/lib/home-hub";
import { withAlpha } from "@/lib/brand-theme";

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
  const [hubTab, setHubTab] = useState("you");
  const profileTab = consolidatedNavigation.getTab("profile");
  const subMenu = (profileTab?.subMenu ?? []).filter((item) => item.id !== "admin");
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
    router.replace(getPostLogoutHref());
  };

  const roleLabel = isOwner
    ? "Platform Owner"
    : adminRoleLabel
      ? `Admin staff · ${adminRoleLabel}`
      : user?.role
        ? (ROLE_LABELS[user.role] ?? user.role)
        : null;

  return (
    <ScreenContainer className="bg-background">
      <DashboardScreen
        header={<TabScreenHeader compact icon="👤" title="Profile" />}
        subnav={<HubTabBar tabs={PROFILE_HUB_TABS} activeId={hubTab} onSelect={setHubTab} />}
      >
        {hubTab === "you" ? (
          <>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: withAlpha(colors.primary, 0.4),
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
              {roleLabel ? (
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
                    {roleLabel}
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
          </>
        ) : null}

        {hubTab === "rewards" ? (
          <>
            <LoyaltyTrackingPanel />
            <ThanksStampsPanel />
          </>
        ) : null}

        {hubTab === "more" ? (
          <>
            <HubDoorGrid>
              <HubDoorTile
                emoji="💬"
                label="Social"
                onPress={() => router.push("/(tabs)/messages")}
              />
              {!canAccessAdminDashboard ? (
                <HubDoorTile
                  emoji="🎬"
                  label="Creator Dashboard"
                  onPress={() => router.push("/creator-dashboard")}
                />
              ) : null}
              {!canAccessAdminDashboard ? (
                <HubDoorTile
                  emoji="🔗"
                  label="Affiliate"
                  onPress={() => router.push("/affiliate-dashboard")}
                />
              ) : null}
            </HubDoorGrid>
            {subMenu.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  if (item.route) {
                    router.push(item.route as Href);
                  }
                }}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: withAlpha(colors.primary, 0.28),
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
          </>
        ) : null}
      </DashboardScreen>
    </ScreenContainer>
  );
}
