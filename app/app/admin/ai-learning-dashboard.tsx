import { useState, useCallback, useEffect } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, FlatList, Modal } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { router } from "expo-router";

interface LearningEvent {
  id: string;
  aiType: "platform" | "creator" | "helper" | "admin" | "doctor";
  eventType: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: number;
  approvedAt?: number;
  rejectionReason?: string;
  data: Record<string, any>;
  confidence: number;
}

interface AILearningStats {
  aiType: string;
  totalEvents: number;
  approvedEvents: number;
  rejectedEvents: number;
  pendingEvents: number;
  approvalRate: number;
  lastUpdate: number;
}

export default function AILearningDashboard() {
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AILearningStats[]>([]);
  const [pendingEvents, setPendingEvents] = useState<LearningEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<LearningEvent | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  const load = useCallback(async () => {
    // In production, fetch from backend
    const mockStats: AILearningStats[] = [
      {
        aiType: "Platform AI",
        totalEvents: 245,
        approvedEvents: 198,
        rejectedEvents: 32,
        pendingEvents: 15,
        approvalRate: 0.861,
        lastUpdate: Date.now(),
      },
      {
        aiType: "Creator AI",
        totalEvents: 512,
        approvedEvents: 468,
        rejectedEvents: 28,
        pendingEvents: 16,
        approvalRate: 0.944,
        lastUpdate: Date.now(),
      },
      {
        aiType: "Helper AI",
        totalEvents: 387,
        approvedEvents: 356,
        rejectedEvents: 18,
        pendingEvents: 13,
        approvalRate: 0.952,
        lastUpdate: Date.now(),
      },
      {
        aiType: "Admin AI",
        totalEvents: 156,
        approvedEvents: 142,
        rejectedEvents: 8,
        pendingEvents: 6,
        approvalRate: 0.911,
        lastUpdate: Date.now(),
      },
      {
        aiType: "Doctor AI",
        totalEvents: 89,
        approvedEvents: 81,
        rejectedEvents: 5,
        pendingEvents: 3,
        approvalRate: 0.911,
        lastUpdate: Date.now(),
      },
    ];

    const mockPending: LearningEvent[] = [
      {
        id: "event_001",
        aiType: "platform",
        eventType: "user_behavior_pattern",
        status: "pending",
        submittedAt: Date.now() - 3600000,
        data: { pattern: "peak_usage_hours", confidence: 0.92 },
        confidence: 0.92,
      },
      {
        id: "event_002",
        aiType: "creator",
        eventType: "content_recommendation",
        status: "pending",
        submittedAt: Date.now() - 7200000,
        data: { category: "wellness", engagement_boost: "18%" },
        confidence: 0.87,
      },
      {
        id: "event_003",
        aiType: "doctor",
        eventType: "bug_pattern_detection",
        status: "pending",
        submittedAt: Date.now() - 1800000,
        data: { bug_type: "memory_leak", affected_versions: ["1.0.0", "1.0.1"] },
        confidence: 0.95,
      },
    ];

    setStats(mockStats);
    setPendingEvents(mockPending);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (event: LearningEvent) => {
    // In production, call backend to approve
    setPendingEvents((prev) =>
      prev.map((e) =>
        e.id === event.id
          ? { ...e, status: "approved", approvedAt: Date.now() }
          : e
      )
    );
    setSelectedEvent(null);
  };

  const handleReject = async (event: LearningEvent) => {
    if (!rejectionReason.trim()) return;

    // In production, call backend to reject
    setPendingEvents((prev) =>
      prev.map((e) =>
        e.id === event.id
          ? {
              ...e,
              status: "rejected",
              rejectionReason,
              approvedAt: Date.now(),
            }
          : e
      )
    );
    setSelectedEvent(null);
    setRejectionReason("");
    setShowRejectionModal(false);
  };

  const getAITypeColor = (aiType: string) => {
    const colors: Record<string, string> = {
      "Platform AI": "#667EEA",
      "Creator AI": "#764BA2",
      "Helper AI": "#F093FB",
      "Admin AI": "#4158D0",
      "Doctor AI": "#C41E3A",
    };
    return colors[aiType] || "#667EEA";
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatHoursAgo = (timestamp: number) => {
    const hours = Math.floor((Date.now() - timestamp) / 3600000);
    if (hours < 1) return "Just now";
    if (hours === 1) return "1 hour ago";
    return `${hours} hours ago`;
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 12,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </Pressable>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 18,
              fontWeight: "700",
            }}
          >
            AI Learning Dashboard
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Overview Cards */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20, gap: 12 }}>
          {stats.map((stat) => (
            <LinearGradient
              key={stat.aiType}
              colors={[getAITypeColor(stat.aiType), getAITypeColor(stat.aiType) + "80"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 12, padding: 16 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                <View>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 14,
                      fontWeight: "600",
                      opacity: 0.9,
                    }}
                  >
                    {stat.aiType}
                  </Text>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 24,
                      fontWeight: "700",
                      marginTop: 4,
                    }}
                  >
                    {stat.totalEvents}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: "rgba(255,255,255,0.2)",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    {(stat.approvalRate * 100).toFixed(0)}% ✓
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 11,
                      opacity: 0.8,
                      marginBottom: 4,
                    }}
                  >
                    Approved
                  </Text>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 16,
                      fontWeight: "700",
                    }}
                  >
                    {stat.approvedEvents}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 11,
                      opacity: 0.8,
                      marginBottom: 4,
                    }}
                  >
                    Rejected
                  </Text>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 16,
                      fontWeight: "700",
                    }}
                  >
                    {stat.rejectedEvents}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 11,
                      opacity: 0.8,
                      marginBottom: 4,
                    }}
                  >
                    Pending
                  </Text>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 16,
                      fontWeight: "700",
                    }}
                  >
                    {stat.pendingEvents}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          ))}
        </View>

        {/* Pending Events */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 16,
              fontWeight: "700",
              marginBottom: 12,
            }}
          >
            Pending Approvals ({pendingEvents.length})
          </Text>

          {pendingEvents.length === 0 ? (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 20,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  color: colors.muted,
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                No pending learning events
              </Text>
            </View>
          ) : (
            <FlatList
              scrollEnabled={true}
              data={pendingEvents}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setSelectedEvent(item)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.8 : 1,
                    marginBottom: 12,
                  })}
                >
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderLeftWidth: 4,
                      borderLeftColor: getAITypeColor(
                        stats.find((s) =>
                          s.aiType.toLowerCase().includes(item.aiType)
                        )?.aiType || "Platform AI"
                      ),
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 8,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: colors.foreground,
                            fontSize: 14,
                            fontWeight: "600",
                          }}
                        >
                          {item.eventType}
                        </Text>
                        <Text
                          style={{
                            color: colors.muted,
                            fontSize: 12,
                            marginTop: 2,
                          }}
                        >
                          {item.aiType.charAt(0).toUpperCase() +
                            item.aiType.slice(1)}{" "}
                          • {formatHoursAgo(item.submittedAt)}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: colors.primary + "20",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: colors.primary,
                            fontSize: 11,
                            fontWeight: "700",
                          }}
                        >
                          {(item.confidence * 100).toFixed(0)}%
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        backgroundColor: colors.background,
                        borderRadius: 8,
                        padding: 10,
                        marginBottom: 10,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.muted,
                          fontSize: 11,
                          fontFamily: "monospace",
                        }}
                      >
                        {JSON.stringify(item.data, null, 2)}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        gap: 8,
                      }}
                    >
                      <Pressable
                        onPress={() => handleApprove(item)}
                        style={({ pressed }) => ({
                          flex: 1,
                          backgroundColor: colors.success,
                          paddingVertical: 8,
                          borderRadius: 6,
                          alignItems: "center",
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                        >
                          Approve
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setSelectedEvent(item);
                          setShowRejectionModal(true);
                        }}
                        style={({ pressed }) => ({
                          flex: 1,
                          backgroundColor: colors.error,
                          paddingVertical: 8,
                          borderRadius: 6,
                          alignItems: "center",
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                        >
                          Reject
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      </ScrollView>

      {/* Rejection Modal */}
      <Modal visible={showRejectionModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              gap: 16,
            }}
          >
            <View>
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 18,
                  fontWeight: "700",
                }}
              >
                Rejection Reason
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                Explain why this learning event should be rejected
              </Text>
            </View>

            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 14,
                paddingVertical: 12,
                minHeight: 100,
              }}
            >
              <Text
                style={{
                  color: rejectionReason ? colors.foreground : colors.muted,
                  fontSize: 14,
                }}
              >
                {rejectionReason || "Enter rejection reason..."}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => {
                  setShowRejectionModal(false);
                  setRejectionReason("");
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: colors.surface,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  opacity: pressed ? 0.8 : 1,
                  borderWidth: 1,
                  borderColor: colors.border,
                })}
              >
                <Text
                  style={{
                    color: colors.foreground,
                    fontWeight: "700",
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  selectedEvent && handleReject(selectedEvent)
                }
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: colors.error,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontWeight: "700",
                  }}
                >
                  Reject Event
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
