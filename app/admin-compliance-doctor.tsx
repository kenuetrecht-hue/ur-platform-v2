import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

interface ComplianceIssue {
  id: string;
  title: string;
  severity: "critical" | "warning" | "info";
  category: string;
  status: "open" | "resolved" | "pending";
  description: string;
}

export default function AdminComplianceDoctor() {
  const colors = useColors();
  const [issues, setIssues] = useState<ComplianceIssue[]>([
    {
      id: "1",
      title: "Tax Documentation Missing",
      severity: "critical",
      category: "Tax Compliance",
      status: "open",
      description: "Creator account missing 2024 tax forms",
    },
    {
      id: "2",
      title: "KYC Verification Pending",
      severity: "warning",
      category: "Identity Verification",
      status: "pending",
      description: "5 new creators awaiting ID verification review",
    },
    {
      id: "3",
      title: "Payment Reconciliation Complete",
      severity: "info",
      category: "Financial",
      status: "resolved",
      description: "Monthly payment settlement verified and processed",
    },
  ]);

  const [systemHealth, setSystemHealth] = useState({
    databaseStatus: "healthy",
    apiStatus: "healthy",
    paymentGateway: "healthy",
    emailService: "healthy",
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return colors.error;
      case "warning":
        return colors.warning;
      case "info":
        return colors.primary;
      default:
        return colors.muted;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return colors.error;
      case "pending":
        return colors.warning;
      case "resolved":
        return colors.success;
      default:
        return colors.muted;
    }
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="gap-6 p-4">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">
              🛡️ UR Media Administrative Compliance Shield
            </Text>
            <Text className="text-sm text-muted">Legal & Tax Safe Frame</Text>
          </View>

          {/* System Health */}
          <View className="bg-surface rounded-lg p-4 border border-border gap-3">
            <Text className="text-sm font-semibold text-foreground">System Health Status</Text>

            {Object.entries(systemHealth).map(([key, status]) => (
              <View key={key} className="flex-row justify-between items-center">
                <Text className="text-sm text-muted capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </Text>
                <View
                  style={{
                    backgroundColor: status === "healthy" ? colors.success : colors.warning,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 11,
                      fontWeight: "600",
                    }}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Compliance Issues */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">Compliance Issues</Text>

            <FlatList
              scrollEnabled={true}
              data={issues}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
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
                          fontWeight: "700",
                        }}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={{
                          color: colors.muted,
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {item.category}
                      </Text>
                    </View>

                    <View
                      style={{
                        backgroundColor: getSeverityColor(item.severity) + "20",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 4,
                        marginLeft: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: getSeverityColor(item.severity),
                          fontSize: 11,
                          fontWeight: "600",
                        }}
                      >
                        {item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: 12,
                      marginBottom: 8,
                      lineHeight: 18,
                    }}
                  >
                    {item.description}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: getStatusColor(item.status) + "20",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: getStatusColor(item.status),
                          fontSize: 11,
                          fontWeight: "600",
                        }}
                      >
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Text>
                    </View>

                    <Pressable
                      style={({ pressed }) => ({
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                        backgroundColor: colors.primary,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Text style={{ color: "white", fontSize: 12, fontWeight: "600" }}>
                        Review
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            />
          </View>

          {/* Self-Healing Terminal */}
          <View className="bg-surface rounded-lg p-4 border border-border gap-3">
            <Text className="text-sm font-semibold text-foreground">🔧 Self-Healing Terminal</Text>

            <View
              style={{
                backgroundColor: colors.background,
                borderRadius: 8,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border,
                minHeight: 100,
              }}
            >
              <Text style={{ color: colors.muted, fontSize: 12, fontFamily: "monospace" }}>
                $ Compliance Doctor v2.1.0{"\n"}
                $ Scanning system integrity...{"\n"}
                $ ✓ Database checksums verified{"\n"}
                $ ✓ Payment reconciliation complete{"\n"}
                $ ✓ Tax documentation audit passed{"\n"}
                $ Ready for deployment
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="gap-2">
            <Pressable
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                paddingVertical: 12,
                borderRadius: 10,
                opacity: pressed ? 0.8 : 1,
                alignItems: "center",
              })}
            >
              <Text style={{ color: "white", fontWeight: "700" }}>🔍 Run Full Audit</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => ({
                backgroundColor: colors.surface,
                paddingVertical: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
                alignItems: "center",
              })}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>📋 Export Report</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
