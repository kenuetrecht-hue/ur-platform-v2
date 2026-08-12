import { Stack } from "expo-router";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ProfileStackScreen } from "@/components/profile-stack-screen";
import { CustomLinkCard } from "@/components/transaction-history-list";
import { useAuth } from "@/lib/auth-context";
import { getPostLogoutHref } from "@/lib/post-auth-redirect";
import { useColors } from "@/hooks/use-colors";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { trpc } from "@/lib/trpc";

export default function ProfileAccountScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isPlatformOwner, ownerDisplayName, adminRoleLabel } = usePlatformOwner();
  const myLink = trpc.partnerDashboard.myCustomLink.useQuery();

  const handleLogout = async () => {
    await logout();
    router.replace(getPostLogoutHref());
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileStackScreen
        title="Account"
        subtitle="Profile details and sign-in identity."
        icon="👤"
      >
        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: 16,
            gap: 8,
          }}
        >
          <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "800" }}>
            {isPlatformOwner ? ownerDisplayName : (user?.name ?? "User")}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14 }}>{user?.email ?? "No email"}</Text>
          {isPlatformOwner ? (
            <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 12 }}>
              Platform Owner
            </Text>
          ) : adminRoleLabel ? (
            <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 12 }}>
              Admin staff · {adminRoleLabel}
            </Text>
          ) : user?.role ? (
            <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 12 }}>
              {user.role}
            </Text>
          ) : null}
        </View>

        {myLink.data ? (
          <CustomLinkCard
            customUrl={myLink.data.customUrl}
            slug={myLink.data.slug}
            label="Public profile link"
          />
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
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>Sign Out</Text>
        </Pressable>
      </ProfileStackScreen>
    </>
  );
}
