/**
 * Admin Safety Dashboard
 * Displays real-time safety metrics, abuse patterns, and enforcement actions
 * Allows admins to monitor and manage platform safety
 */

import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Modal } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SafetyMetrics {
  contentSafety: {
    totalAnalyses: number;
    blockedContent: number;
    warningContent: number;
    suspendedUsers: number;
  };
  usageMonitoring: {
    totalActivities: number;
    activeAbusePatterns: number;
    activeEnforcementActions: number;
  };
  ethics: {
    totalGuidelines: number;
    totalViolations: number;
    complianceScore: number;
  };
  entrepreneurialFocus: {
    totalGoals: number;
    highLegitimacyGoals: number;
    blockedGoals: number;
  };
}

interface MetricCard {
  label: string;
  value: number | string;
  unit?: string;
  status: "good" | "warning" | "critical";
  icon: string;
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Metric Card Component
 */
function MetricCard({ label, value, unit, status, icon }: MetricCard) {
  const colors = useColors();

  const statusColors = {
    good: colors.success,
    warning: colors.warning,
    critical: colors.error,
  };

  return (
    <View
      className={cn(
        "rounded-lg p-4 mb-3",
        status === "good" && "bg-green-50 dark:bg-green-900/20",
        status === "warning" && "bg-yellow-50 dark:bg-yellow-900/20",
        status === "critical" && "bg-red-50 dark:bg-red-900/20"
      )}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm text-muted">{label}</Text>
        <Text className="text-xl">{icon}</Text>
      </View>
      <View className="flex-row items-baseline gap-1">
        <Text className="text-3xl font-bold text-foreground">{value}</Text>
        {unit && <Text className="text-sm text-muted">{unit}</Text>}
      </View>
      <View
        className="h-1 rounded-full mt-2"
        style={{ backgroundColor: statusColors[status] }}
      />
    </View>
  );
}

/**
 * Section Header Component
 */
function SectionHeader({ title, icon }: { title: string; icon: string }) {
  const colors = useColors();

  return (
    <View className="flex-row items-center gap-2 mb-4 mt-6">
      <Text className="text-2xl">{icon}</Text>
      <Text className="text-xl font-bold text-foreground">{title}</Text>
    </View>
  );
}

/**
 * Alert Banner Component
 */
function AlertBanner({
  type,
  title,
  message,
}: {
  type: "info" | "warning" | "error";
  title: string;
  message: string;
}) {
  const colors = useColors();

  const bgColors = {
    info: "#e3f2fd",
    warning: "#fff3e0",
    error: "#ffebee",
  };

  const borderColors = {
    info: "#2196f3",
    warning: "#ff9800",
    error: "#f44336",
  };

  return (
    <View
      className="rounded-lg p-4 mb-4 border-l-4"
      style={{
        backgroundColor: bgColors[type],
        borderLeftColor: borderColors[type],
      }}
    >
      <Text className="font-bold text-foreground mb-1">{title}</Text>
      <Text className="text-sm text-muted">{message}</Text>
    </View>
  );
}

/**
 * Admin Safety Dashboard
 */
export function AdminSafetyDashboard() {
  const colors = useColors();
  const [metrics, setMetrics] = useState<SafetyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  useEffect(() => {
    // Fetch safety metrics
    const fetchMetrics = async () => {
      try {
        // In production, this would call the safety tRPC endpoint
        // const response = await trpc.safety.getSafetyStatistics.query();
        // setMetrics(response);

        // Mock data for demonstration
        setMetrics({
          contentSafety: {
            totalAnalyses: 1250,
            blockedContent: 45,
            warningContent: 120,
            suspendedUsers: 8,
          },
          usageMonitoring: {
            totalActivities: 15420,
            activeAbusePatterns: 12,
            activeEnforcementActions: 5,
          },
          ethics: {
            totalGuidelines: 8,
            totalViolations: 3,
            complianceScore: 94,
          },
          entrepreneurialFocus: {
            totalGoals: 450,
            highLegitimacyGoals: 420,
            blockedGoals: 2,
          },
        });
      } catch (error) {
        console.error("Failed to fetch safety metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <ScreenContainer className="justify-center items-center">
        <Text className="text-lg text-muted">Loading safety dashboard...</Text>
      </ScreenContainer>
    );
  }

  if (!metrics) {
    return (
      <ScreenContainer className="justify-center items-center">
        <Text className="text-lg text-error">Failed to load metrics</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-foreground mb-2">Safety Dashboard</Text>
          <Text className="text-sm text-muted">Real-time platform safety monitoring</Text>
        </View>

        {/* Critical Alerts */}
        {metrics.usageMonitoring.activeAbusePatterns > 10 && (
          <AlertBanner
            type="warning"
            title="High Abuse Activity"
            message={`${metrics.usageMonitoring.activeAbusePatterns} active abuse patterns detected`}
          />
        )}

        {metrics.contentSafety.suspendedUsers > 5 && (
          <AlertBanner
            type="error"
            title="Multiple Suspensions"
            message={`${metrics.contentSafety.suspendedUsers} users currently suspended`}
          />
        )}

        {metrics.ethics.complianceScore < 90 && (
          <AlertBanner
            type="warning"
            title="Compliance Alert"
            message={`Compliance score: ${metrics.ethics.complianceScore}%`}
          />
        )}

        {/* Content Safety Section */}
        <SectionHeader title="Content Safety" icon="🛡️" />
        <MetricCard
          label="Total Content Analyzed"
          value={metrics.contentSafety.totalAnalyses}
          status="good"
          icon="📊"
        />
        <MetricCard
          label="Blocked Content"
          value={metrics.contentSafety.blockedContent}
          status={metrics.contentSafety.blockedContent > 50 ? "critical" : "good"}
          icon="🚫"
        />
        <MetricCard
          label="Warning Content"
          value={metrics.contentSafety.warningContent}
          status={metrics.contentSafety.warningContent > 100 ? "warning" : "good"}
          icon="⚠️"
        />
        <MetricCard
          label="Suspended Users"
          value={metrics.contentSafety.suspendedUsers}
          status={metrics.contentSafety.suspendedUsers > 5 ? "critical" : "good"}
          icon="🚷"
        />

        {/* Usage Monitoring Section */}
        <SectionHeader title="Usage Monitoring" icon="👁️" />
        <MetricCard
          label="Total Activities"
          value={metrics.usageMonitoring.totalActivities}
          status="good"
          icon="📈"
        />
        <MetricCard
          label="Active Abuse Patterns"
          value={metrics.usageMonitoring.activeAbusePatterns}
          status={metrics.usageMonitoring.activeAbusePatterns > 10 ? "critical" : "warning"}
          icon="🔴"
        />
        <MetricCard
          label="Enforcement Actions"
          value={metrics.usageMonitoring.activeEnforcementActions}
          status={metrics.usageMonitoring.activeEnforcementActions > 3 ? "warning" : "good"}
          icon="⚡"
        />

        {/* Ethics & Compliance Section */}
        <SectionHeader title="Ethics & Compliance" icon="✅" />
        <MetricCard
          label="Ethical Guidelines"
          value={metrics.ethics.totalGuidelines}
          status="good"
          icon="📋"
        />
        <MetricCard
          label="Violations Detected"
          value={metrics.ethics.totalViolations}
          status={metrics.ethics.totalViolations > 5 ? "critical" : "good"}
          icon="⛔"
        />
        <MetricCard
          label="Compliance Score"
          value={`${metrics.ethics.complianceScore}%`}
          status={metrics.ethics.complianceScore >= 90 ? "good" : "warning"}
          icon="🎯"
        />

        {/* Entrepreneurial Focus Section */}
        <SectionHeader title="Entrepreneurial Focus" icon="💼" />
        <MetricCard
          label="User Goals Created"
          value={metrics.entrepreneurialFocus.totalGoals}
          status="good"
          icon="🎯"
        />
        <MetricCard
          label="High Legitimacy Goals"
          value={metrics.entrepreneurialFocus.highLegitimacyGoals}
          status="good"
          icon="✨"
        />
        <MetricCard
          label="Blocked Goals"
          value={metrics.entrepreneurialFocus.blockedGoals}
          status={metrics.entrepreneurialFocus.blockedGoals > 0 ? "warning" : "good"}
          icon="🚫"
        />

        {/* Quick Actions */}
        <SectionHeader title="Quick Actions" icon="⚙️" />
        <View className="gap-3 pb-6">
          <Pressable
            className="bg-primary rounded-lg p-4 active:opacity-80"
            onPress={() => setSelectedSection("users")}
          >
            <Text className="text-white font-semibold text-center">View Suspended Users</Text>
          </Pressable>
          <Pressable
            className="bg-warning rounded-lg p-4 active:opacity-80"
            onPress={() => setSelectedSection("patterns")}
          >
            <Text className="text-white font-semibold text-center">Review Abuse Patterns</Text>
          </Pressable>
          <Pressable
            className="bg-error rounded-lg p-4 active:opacity-80"
            onPress={() => setSelectedSection("violations")}
          >
            <Text className="text-white font-semibold text-center">View Violations</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

export default AdminSafetyDashboard;
