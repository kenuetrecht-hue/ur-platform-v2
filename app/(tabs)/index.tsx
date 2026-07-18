import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, FlatList, Pressable, RefreshControl, Modal, Platform } from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { Avatar, TierBadge, VerifiedBadge, Card, SectionHeader, URMark } from "@/components/ur-ui";
import { PromotionalBanner } from "@/components/promotional-banner";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/lib/auth-context";
import { Creator, getCreators, User, TIERS } from "@/lib/store";

export default function HomeScreen() {
  const colors = useColors();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Load creators on mount
  useEffect(() => {
    const loadCreators = async () => {
      try {
        const data = await getCreators();
        setCreators(data);
      } catch (error) {
        console.error("Failed to load creators:", error);
      }
    };
    loadCreators();
  }, []);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      const refresh = async () => {
        setRefreshing(true);
        try {
          const data = await getCreators();
          setCreators(data);
        } catch (error) {
          console.error("Refresh failed:", error);
        } finally {
          setRefreshing(false);
        }
      };
      refresh();
    }, [])
  );

  // If still loading auth, show loading screen
  if (authLoading) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: colors.foreground, fontSize: 16 }}>Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 16 }}>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "600" }}>Welcome to UR Platform</Text>
          <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center" }}>Sign in to access your dashboard</Text>
          <Pressable
            onPress={() => router.push("/login")}
            style={({ pressed }) => [
              { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, opacity: pressed ? 0.8 : 1 }
            ]}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>Sign In</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  // Authenticated - show dashboard
  return (
    <ScreenContainer className="p-0">
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {}} tintColor={colors.primary} />}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* Header */}
        <View style={{ backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "700" }}>Welcome, {user?.name || "User"}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>Your UR Platform Dashboard</Text>
            </View>
            <URMark size={40} />
          </View>
        </View>

        {/* Stats Cards */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16, gap: 12 }}>
          {/* Points Card */}
          <Card>
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "500" }}>LOYALTY POINTS</Text>
              <Text style={{ color: colors.foreground, fontSize: 28, fontWeight: "700" }}>{user?.points || 0}</Text>
            </View>
          </Card>

          {/* Tier Card */}
          <Card>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "500" }}>YOUR TIER</Text>
                <TierBadge tier={user?.tier || "bronze"} />
              </View>
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "600" }}>{(user?.tier || "bronze").toUpperCase()}</Text>
            </View>
          </Card>
        </View>

        {/* Creators Section */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <SectionHeader title="Featured Creators" />
          <FlatList
            data={creators.slice(0, 5)}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => <CreatorCard creator={item} />}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        </View>

        {/* Promotional Banner */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <PromotionalBanner />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function CreatorCard({ creator }: { creator: Creator }) {
  const colors = useColors();
  return (
    <Pressable onPress={() => router.push(`/creator/${creator.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar uri={creator.photo} size={48} ring />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", flex: 1 }} numberOfLines={1}>{creator.name}</Text>
            {creator.verified && <VerifiedBadge size={12} />}
          </View>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{creator.bio}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700" }}>${creator.monthlyPrice.toFixed(2)}</Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>per month</Text>
        </View>
      </View>
    </Pressable>
  );
}
