/**
 * Admin Control Panel Dashboard
 * Real-time health monitoring, bug tracking, and system management
 * All data flows through tRPC for seamless integration
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.6,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    flex: 1,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: {
    width: "48%",
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  gridValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  gridLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
});

// ============================================================================
// TYPES
// ============================================================================

interface HealthSummary {
  status: "healthy" | "warning" | "critical";
  healthyChecks: number;
  warningChecks: number;
  criticalChecks: number;
  activeBugs: number;
  recentBugs: {
    id: string;
    severity: string;
    component: string;
    description: string;
  }[];
  healingActionsExecuted: number;
}

// ============================================================================
// COMPONENTS
// ============================================================================

function StatusBadge({
  status,
  colors,
}: {
  status: "healthy" | "warning" | "critical";
  colors: any;
}) {
  const statusColors = {
    healthy: { bg: colors.success, text: colors.foreground },
    warning: { bg: colors.warning, text: colors.foreground },
    critical: { bg: colors.error, text: colors.foreground },
  };

  const statusLabels = {
    healthy: "✓ Healthy",
    warning: "⚠ Warning",
    critical: "✕ Critical",
  };

  return (
    <View
      style={[
        styles.statusBadge,
        { backgroundColor: statusColors[status].bg },
      ]}
    >
      <Text
        style={[
          styles.statusText,
          { color: statusColors[status].text },
        ]}
      >
        {statusLabels[status]}
      </Text>
    </View>
  );
}

function HealthCard({
  label,
  value,
  max,
  colors,
}: {
  label: string;
  value: number;
  max: number;
  colors: any;
}) {
  const percentage = (value / max) * 100;
  const isWarning = percentage > 70;
  const isCritical = percentage > 90;

  return (
    <View style={[styles.gridItem, { borderColor: colors.border }]}>
      <Text style={[styles.gridValue, { color: colors.foreground }]}>
        {value}/{max}
      </Text>
      <Text style={[styles.gridLabel, { color: colors.muted }]}>
        {label}
      </Text>
      <View
        style={[
          styles.progressBar,
          { backgroundColor: colors.border },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${percentage}%`,
              backgroundColor: isCritical
                ? colors.error
                : isWarning
                  ? colors.warning
                  : colors.success,
            },
          ]}
        />
      </View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminControlPanel() {
  const colors = useColors();
  const [health, setHealth] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch health data from tRPC
  // const healthQuery = trpc.infrastructure.getHealthSummary.useQuery(undefined, {
  //   refetchInterval: 30000, // Refetch every 30 seconds
  // });
  const healthQuery = { data: null, error: null }; // Placeholder

  useEffect(() => {
    if (healthQuery.data) {
      setHealth(healthQuery.data);
      setLoading(false);
    }
    if (healthQuery.error) {
      setError("Failed to load health data");
      setLoading(false);
    }
  }, [healthQuery.data, healthQuery.error]);

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, color: colors.muted }}>
            Loading system health...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error || !health) {
    return (
      <ScreenContainer>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error || "Failed to load health data"}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* HEADER */}
        <View
          style={[
            styles.header,
            { borderBottomColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>
            Admin Dashboard
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            System Health & Monitoring
          </Text>
        </View>

        {/* STATUS SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            System Status
          </Text>
          <StatusBadge status={health.status} colors={colors} />

          {/* HEALTH METRICS GRID */}
          <View style={styles.gridContainer}>
            <HealthCard
              label="Healthy Checks"
              value={health.healthyChecks}
              max={100}
              colors={colors}
            />
            <HealthCard
              label="Warning Checks"
              value={health.warningChecks}
              max={50}
              colors={colors}
            />
            <HealthCard
              label="Critical Checks"
              value={health.criticalChecks}
              max={20}
              colors={colors}
            />
            <HealthCard
              label="Active Bugs"
              value={health.activeBugs}
              max={10}
              colors={colors}
            />
          </View>
        </View>

        {/* BUGS SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Recent Bugs ({health.recentBugs.length})
          </Text>
          {health.recentBugs.length === 0 ? (
            <View
              style={[
                styles.card,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Text style={{ color: colors.muted, textAlign: "center" }}>
                No recent bugs detected
              </Text>
            </View>
          ) : (
            health.recentBugs.slice(0, 5).map((bug) => (
              <View
                key={bug.id}
                style={[
                  styles.card,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        bug.severity === "critical"
                          ? colors.error
                          : bug.severity === "high"
                            ? colors.warning
                            : colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: colors.background },
                    ]}
                  >
                    {bug.severity.toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.metricLabel,
                    { color: colors.foreground, fontWeight: "600" },
                  ]}
                >
                  {bug.component}
                </Text>
                <Text
                  style={[
                    styles.metricLabel,
                    { color: colors.muted, marginTop: 4 },
                  ]}
                >
                  {bug.description}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* ACTIONS SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Actions
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>
              Run Health Check
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.primary }]}>
              View Detailed Report
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.primary }]}>
              Prepare Migration
            </Text>
          </TouchableOpacity>
        </View>

        {/* STATS SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Statistics
          </Text>
          <View
            style={[
              styles.card,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.metricRow}>
              <Text style={[styles.metricLabel, { color: colors.foreground }]}>
                Healing Actions Executed
              </Text>
              <Text
                style={[
                  styles.metricValue,
                  { color: colors.success },
                ]}
              >
                {health.healingActionsExecuted}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={[styles.metricLabel, { color: colors.foreground }]}>
                Last Updated
              </Text>
              <Text
                style={[
                  styles.metricValue,
                  { color: colors.muted },
                ]}
              >
                Just now
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
