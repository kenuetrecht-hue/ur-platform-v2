import { useState } from "react";
import { Link, Stack, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { BUSINESS_STEWARD_AI_ID, isOwnerOpsAiId } from "@/lib/owner-platform-ops-catalog";
import { ADMIN_QUICK_HREFS } from "@/lib/admin-dashboard-routes";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { OwnerCommandCenterPanel } from "@/components/owner-command-center-panel";
import { PlatformConductReviewPanel } from "@/components/platform-conduct-review-panel";
import { PlatformOpsConsole } from "@/components/platform-ops-console";
import { CommerceOpsPanel } from "@/components/commerce-ops-panel";
import { CommerceTrendOpsPanel } from "@/components/commerce-trend-ops-panel";
import { FairShowOwnerPanel } from "@/components/fair-show-owner-panel";
import { SecurityNoticeOpsPanel } from "@/components/security-notice-ops-panel";
import { FoundingAudienceReviewPanel } from "@/components/founding-audience-review-panel";
import { LandingDemoConversionStatsPanel } from "@/components/landing-demo-conversion-stats-panel";
import { AdminDashboard } from "@/components/admin-dashboard";
import { AppPressable } from "@/components/app-pressable";
import { useAuth } from "@/lib/auth-context";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { trpc } from "@/lib/trpc";
import { View, Text, ActivityIndicator, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";

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
  const [stewardFocusNonce, setStewardFocusNonce] = useState(0);
  const params = useLocalSearchParams<{ ai?: string }>();
  const requestedOpsAi =
    typeof params.ai === "string" && isOwnerOpsAiId(params.ai) ? params.ai : BUSINESS_STEWARD_AI_ID;
  const access = trpc.platformOps.checkAccess.useQuery(undefined, { retry: 1 });

  const focusBusinessSteward = () => {
    setShowAdmin(false);
    setStewardFocusNonce((n) => n + 1);
    router.setParams({ ai: BUSINESS_STEWARD_AI_ID });
  };

  type QuickAction =
    | { label: string; kind: "press"; onPress: () => void }
    | { label: string; kind: "href"; href: Href };

  const ownerQuickActions: QuickAction[] = [
    ...(isPlatformOwner
      ? ([
          { label: "Business Steward", kind: "press", onPress: focusBusinessSteward },
          { label: "All AIs", kind: "href", href: ADMIN_QUICK_HREFS.allAis },
          { label: "3D Lab", kind: "href", href: ADMIN_QUICK_HREFS.lab3d },
          { label: "UR World", kind: "href", href: ADMIN_QUICK_HREFS.world },
        ] satisfies QuickAction[])
      : []),
    { label: "Create", kind: "href", href: ADMIN_QUICK_HREFS.create },
    { label: "Discover", kind: "href", href: ADMIN_QUICK_HREFS.discover },
    ...(hasAdminPermission("campaign_admin")
      ? ([{ label: "Campaign Admin", kind: "press", onPress: () => setShowAdmin(true) }] satisfies QuickAction[])
      : []),
  ];

  const chipStyle = {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: "center" as const,
  };

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
          <ScrollView
            contentContainerStyle={{ paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
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
                      Talk to Business Steward here — sales, ads, and running the site. Doctor,
                      Administration, and Security are on the same page. Members never see Steward.
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {ownerQuickActions.map((action) => {
                      const label = (
                        <Text
                          pointerEvents="none"
                          style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}
                        >
                          {action.label}
                        </Text>
                      );
                      if (action.kind === "href") {
                        return (
                          <Link key={action.label} href={action.href} asChild>
                            <AppPressable style={chipStyle}>{label}</AppPressable>
                          </Link>
                        );
                      }
                      return (
                        <AppPressable key={action.label} onPress={action.onPress} style={chipStyle}>
                          {label}
                        </AppPressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>
            {isPlatformOwner ? (
              <AppPressable
                onPress={focusBusinessSteward}
                style={{
                  marginHorizontal: 16,
                  marginBottom: 12,
                  backgroundColor: `${colors.primary}14`,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: colors.primary,
                  padding: 16,
                  gap: 8,
                }}
              >
                <Text
                  pointerEvents="none"
                  style={{ color: colors.foreground, fontWeight: "800", fontSize: 17 }}
                >
                  📋 Business Steward
                </Text>
                <Text
                  pointerEvents="none"
                  style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}
                >
                  Tap to open his chat on this page — sales, advertising, and running the website
                  and app. Use Assign work to other AIs below — type or tap the microphone and
                  speak any language. Switch to Learn the business for the academy.
                </Text>
              </AppPressable>
            ) : null}
            <PlatformOpsConsole
              isPlatformOwner={isPlatformOwner}
              initialAiId={requestedOpsAi}
              focusStewardNonce={stewardFocusNonce}
            />
            {isPlatformOwner ? <OwnerCommandCenterPanel /> : null}
            {isPlatformOwner ? <PlatformConductReviewPanel /> : null}
            {isPlatformOwner ? <FoundingAudienceReviewPanel /> : null}
            {isPlatformOwner ? <FairShowOwnerPanel /> : null}
            {isPlatformOwner ? <SecurityNoticeOpsPanel /> : null}
            {isPlatformOwner ? <CommerceTrendOpsPanel /> : null}
            {isPlatformOwner ? <CommerceOpsPanel /> : null}
            {isPlatformOwner ? <LandingDemoConversionStatsPanel /> : null}
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
              <Link href="/login" asChild>
                <AppPressable
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 12,
                    padding: 14,
                    alignItems: "center",
                  }}
                >
                  <Text pointerEvents="none" style={{ color: "#fff", fontWeight: "700" }}>
                    Sign in
                  </Text>
                </AppPressable>
              </Link>
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
                <AppPressable
                  onPress={() => void access.refetch()}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 12,
                    padding: 14,
                    alignItems: "center",
                  }}
                >
                  <Text pointerEvents="none" style={{ color: "#fff", fontWeight: "700" }}>
                    Check again
                  </Text>
                </AppPressable>
              </>
            )}
          </View>
        ) : null}
      </ScreenContainer>

      <AdminDashboard visible={showAdmin} onClose={() => setShowAdmin(false)} />
    </>
  );
}
