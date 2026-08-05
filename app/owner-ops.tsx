import { useState } from "react";
import { Stack, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { PlatformOpsConsole } from "@/components/platform-ops-console";
import { AdminDashboard } from "@/components/admin-dashboard";
import { useAuth } from "@/lib/auth-context";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { trpc } from "@/lib/trpc";
import { View, Text, ActivityIndicator, Pressable, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { EXPECTED_PUBLIC_COUNT } from "@/lib/ai-creator-catalog-sync";

export default function OwnerOpsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const {
    isPlatformOwner,
    canAccessAdminDashboard,
    ownerDisplayName,
    adminRoleLabel,
    hasAdminPermission,
  } = usePlatformOwner();
  const [showAdmin, setShowAdmin] = useState(false);
  const access = trpc.platformOps.checkAccess.useQuery(undefined, { retry: 1 });

  const ownerQuickActions = [
    ...(isPlatformOwner
      ? [
          { label: "All AIs", onPress: () => router.push("/ais") },
          { label: "3D Lab", onPress: () => router.push("/3d-workspace") },
        ]
      : []),
    { label: "Create", onPress: () => router.push("/(tabs)/create") },
    { label: "Discover", onPress: () => router.push("/(tabs)/discover") },
    ...(hasAdminPermission("campaign_admin")
      ? [{ label: "Campaign Admin", onPress: () => setShowAdmin(true) }]
      : []),
  ];

  const denied = !access.isLoading && !canAccessAdminDashboard;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer className="bg-background">
        <TabScreenHeader
          icon="🏛️"
          title="Administration Dashboard"
          subtitle={
            isPlatformOwner
              ? "Platform owner — full control, staff management, ops AIs, and campaign admin."
              : "Authorized staff — limited access based on your assigned role."
          }
        />
        {access.isLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : canAccessAdminDashboard ? (
          <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
            <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 10 }}>
              <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
                {isPlatformOwner
                  ? `${ownerDisplayName} — you are the only person with full platform owner powers.`
                  : `Signed in as staff · ${adminRoleLabel ?? "Limited role"}. Some sections are hidden.`}
              </Text>
              {ownerQuickActions.length > 0 ? (
                <View
                  style={{
                    backgroundColor: `${colors.primary}10`,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.primary,
                    padding: 14,
                    gap: 10,
                  }}
                >
                  <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 14 }}>
                    {isPlatformOwner ? "🔐 Owner control" : "📋 Your admin tools"}
                  </Text>
                  {isPlatformOwner ? (
                    <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                      {EXPECTED_PUBLIC_COUNT} public AI specialists · Doctor, Administration & Security
                      ops AIs live here only · grant staff access below
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {ownerQuickActions.map((action) => (
                      <Pressable
                        key={action.label}
                        onPress={action.onPress}
                        style={{
                          backgroundColor: colors.primary,
                          borderRadius: 20,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
                          {action.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
            <PlatformOpsConsole isPlatformOwner={isPlatformOwner} />
          </ScrollView>
        ) : denied ? (
          <View style={{ padding: 24, gap: 14 }}>
            <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "700" }}>
              Access denied
            </Text>
            <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>
              The Administration Dashboard is private. Only {ownerDisplayName} and staff they
              explicitly authorize can enter. If you were hired to help run the platform, ask the
              owner to grant your email a staff role.
            </Text>
            {isPlatformOwner === false && isAuthenticated ? (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 14,
                  gap: 6,
                }}
              >
                <Text style={{ color: colors.muted, fontSize: 13 }}>Logged in as: {user?.email}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  Owner email in .env must match your login for owner access.
                </Text>
              </View>
            ) : null}
            {!isAuthenticated ? (
              <Pressable
                onPress={() => router.push("/login")}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 12,
                  padding: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Sign in</Text>
              </Pressable>
            ) : isPlatformOwner ? null : (
              <>
                <View style={{ gap: 6 }}>
                  <Text style={{ color: colors.foreground, fontWeight: "600" }}>Owner setup</Text>
                  <Text
                    style={{
                      color: colors.primary,
                      fontFamily: "monospace",
                      fontSize: 12,
                      backgroundColor: colors.surface,
                      padding: 10,
                      borderRadius: 8,
                    }}
                  >
                    PLATFORM_OWNER_EMAIL={user?.email ?? "your-email@example.com"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => access.refetch()}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 12,
                    padding: 14,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Check again</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : null}
      </ScreenContainer>

      <AdminDashboard visible={showAdmin} onClose={() => setShowAdmin(false)} />
    </>
  );
}
