import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Modal, FlatList } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

interface TierStats {
  tier: "tier1" | "tier2" | "tier3";
  name: string;
  joined: number;
  capacity: number;
  earnings: string;
  duration: string;
  totalEarnings: number;
}

interface AdminStats {
  totalCreators: number;
  totalEarnings: number;
  activeTiers: TierStats[];
  daysRemaining: number;
  conversionRate: number;
}

interface CreatorRecord {
  id: string;
  name: string;
  tier: "tier1" | "tier2" | "tier3";
  joinedDate: string;
  earnings: number;
  status: "active" | "inactive";
}

const MOCK_STATS: AdminStats = {
  totalCreators: 47,
  totalEarnings: 12450.75,
  daysRemaining: 29,
  conversionRate: 15.7,
  activeTiers: [
    {
      tier: "tier1",
      name: "Tier 1: Founding Creators",
      joined: 47,
      capacity: 100,
      earnings: "92.5%",
      duration: "180 days",
      totalEarnings: 8750.25,
    },
    {
      tier: "tier2",
      name: "Tier 2: Early Adopters",
      joined: 0,
      capacity: 100,
      earnings: "94%",
      duration: "90 days",
      totalEarnings: 0,
    },
    {
      tier: "tier3",
      name: "Tier 3: Standard Creators",
      joined: 0,
      capacity: 100,
      earnings: "92.5%",
      duration: "30 days",
      totalEarnings: 0,
    },
  ],
};

const MOCK_CREATORS: CreatorRecord[] = [
  {
    id: "1",
    name: "Alex Rivera",
    tier: "tier1",
    joinedDate: "2026-06-01",
    earnings: 245.50,
    status: "active",
  },
  {
    id: "2",
    name: "Maya Chen",
    tier: "tier1",
    joinedDate: "2026-06-02",
    earnings: 189.75,
    status: "active",
  },
  {
    id: "3",
    name: "Sasha Kim",
    tier: "tier1",
    joinedDate: "2026-06-03",
    earnings: 156.25,
    status: "active",
  },
];

export function AdminDashboard({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const [stats, setStats] = useState<AdminStats>(MOCK_STATS);
  const [creators, setCreators] = useState<CreatorRecord[]>(MOCK_CREATORS);
  const [activeTab, setActiveTab] = useState<"overview" | "tiers" | "creators">("overview");

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <LinearGradient
          colors={["#4F46E5", "#7C3AED"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingVertical: 20, paddingHorizontal: 20, gap: 12 }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 24, fontWeight: "800", color: "white" }}>📊 Admin Dashboard</Text>
            <Pressable onPress={onClose} style={{ padding: 8 }}>
              <Text style={{ fontSize: 20, color: "white" }}>✕</Text>
            </Pressable>
          </View>
          <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 14 }}>
            30-Day Promotional Campaign Management
          </Text>
        </LinearGradient>

        {/* Tabs */}
        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border }}>
          {(["overview", "tiers", "creators"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => {
                setActiveTab(tab);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              }}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderBottomWidth: activeTab === tab ? 3 : 0,
                borderBottomColor: "#4F46E5",
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: activeTab === tab ? "700" : "500",
                  color: activeTab === tab ? "#4F46E5" : colors.muted,
                }}
              >
                {tab === "overview" && "Overview"}
                {tab === "tiers" && "Tiers"}
                {tab === "creators" && "Creators"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Content */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 20 }} showsVerticalScrollIndicator={false}>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <View style={{ gap: 20 }}>
              {/* Key Metrics */}
              <View style={{ gap: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>📈 Key Metrics</Text>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Total Creators</Text>
                    <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground }}>
                      {stats.totalCreators}
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Days Left</Text>
                    <Text style={{ fontSize: 24, fontWeight: "800", color: "#EF4444" }}>
                      {stats.daysRemaining}d
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Total Earnings</Text>
                    <Text style={{ fontSize: 20, fontWeight: "800", color: "#22C55E" }}>
                      ${stats.totalEarnings.toFixed(2)}
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Conversion Rate</Text>
                    <Text style={{ fontSize: 20, fontWeight: "800", color: "#4F46E5" }}>
                      {stats.conversionRate}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Promotion Timeline */}
              <View style={{ gap: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>⏰ Promotion Timeline</Text>

                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                    gap: 12,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: colors.foreground, fontWeight: "600" }}>Campaign Progress</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {Math.round((30 - stats.daysRemaining) / 30 * 100)}%
                    </Text>
                  </View>
                  <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: "hidden" }}>
                    <View
                      style={{
                        height: "100%",
                        width: `${Math.round((30 - stats.daysRemaining) / 30 * 100)}%`,
                        backgroundColor: "#4F46E5",
                      }}
                    />
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {stats.daysRemaining} days remaining | Started 1 day ago
                  </Text>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={{ gap: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>⚡ Quick Actions</Text>

                <Pressable
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.foreground, fontWeight: "600" }}>📧 Send Promotion Email</Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                    Notify creators about tier benefits
                  </Text>
                </Pressable>

                <Pressable
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.foreground, fontWeight: "600" }}>📊 Export Report</Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                    Download campaign analytics CSV
                  </Text>
                </Pressable>

                <Pressable
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.foreground, fontWeight: "600" }}>⚙️ Campaign Settings</Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                    Adjust tier benefits and duration
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Tiers Tab */}
          {activeTab === "tiers" && (
            <View style={{ gap: 16 }}>
              {stats.activeTiers.map((tier) => (
                <View
                  key={tier.tier}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: tier.tier === "tier1" ? "#4F46E5" : colors.border,
                    gap: 12,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>
                        {tier.tier === "tier1" && "🥇"}
                        {tier.tier === "tier2" && "🥈"}
                        {tier.tier === "tier3" && "🥉"} {tier.name}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                        {tier.earnings} for {tier.duration}
                      </Text>
                    </View>
                    {tier.tier === "tier1" && (
                      <View
                        style={{
                          backgroundColor: "#4F46E5",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: "white", fontSize: 10, fontWeight: "700" }}>FEATURED</Text>
                      </View>
                    )}
                  </View>

                  <View style={{ gap: 8 }}>
                    <View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                        <Text style={{ color: colors.muted, fontSize: 12 }}>Capacity</Text>
                        <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 12 }}>
                          {tier.joined}/{tier.capacity}
                        </Text>
                      </View>
                      <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden" }}>
                        <View
                          style={{
                            height: "100%",
                            width: `${(tier.joined / tier.capacity) * 100}%`,
                            backgroundColor: tier.tier === "tier1" ? "#4F46E5" : tier.tier === "tier2" ? "#8B5CF6" : "#A855F7",
                          }}
                        />
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>Total Earnings</Text>
                      <Text style={{ color: "#22C55E", fontWeight: "600", fontSize: 12 }}>
                        ${tier.totalEarnings.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {tier.tier === "tier1" && tier.joined < tier.capacity && (
                    <View
                      style={{
                        backgroundColor: "#EF4444" + "20",
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "600" }}>
                        ⚡ {tier.capacity - tier.joined} spots remaining!
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Creators Tab */}
          {activeTab === "creators" && (
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.muted }}>
                Showing {creators.length} creators
              </Text>

              <FlatList
                scrollEnabled={false}
                data={creators}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                        {item.name}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                        {item.tier === "tier1" && "🥇 Tier 1"}
                        {item.tier === "tier2" && "🥈 Tier 2"}
                        {item.tier === "tier3" && "🥉 Tier 3"} • Joined {item.joinedDate}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: "#22C55E" }}>
                        ${item.earnings.toFixed(2)}
                      </Text>
                      <View
                        style={{
                          backgroundColor: item.status === "active" ? "#22C55E" + "20" : colors.border,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 4,
                          marginTop: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "600",
                            color: item.status === "active" ? "#22C55E" : colors.muted,
                          }}
                        >
                          {item.status === "active" ? "✓ Active" : "Inactive"}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              />
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
