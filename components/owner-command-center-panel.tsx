import { useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import type { OwnerCommandEventKind } from "@/lib/owner-command-center-types";
import {
  OWNER_REMEDIATION_CONFIRM_PHRASE,
  isOwnerRemediationConfirmed,
} from "@/lib/platform-ops-remediation-types";

const KIND_FILTERS: Array<{ id: "all" | OwnerCommandEventKind; label: string }> = [
  { id: "all", label: "All" },
  { id: "hive_consult", label: "Hive" },
  { id: "town_hall", label: "Town Hall" },
  { id: "incident", label: "Incidents" },
  { id: "specialist_chat", label: "Member chats" },
  { id: "ops_chat", label: "Ops chat" },
  { id: "protection", label: "Protection" },
  { id: "sandbox_repair", label: "Sandbox" },
];

function toneColor(tone: "ok" | "watch" | "alert", colors: { primary: string; muted: string }): string {
  if (tone === "alert") return "#dc2626";
  if (tone === "watch") return "#d97706";
  return colors.primary;
}

function severityColor(severity: string): string {
  if (severity === "critical") return "#dc2626";
  if (severity === "high") return "#ea580c";
  if (severity === "watch") return "#d97706";
  return "#16a34a";
}

function downloadJson(data: unknown, fileName: string): void {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function statusLabel(status: "online" | "watch" | "busy"): string {
  if (status === "busy") return "Active now";
  if (status === "watch") return "Watching";
  return "Online";
}

export function OwnerCommandCenterPanel() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const [kind, setKind] = useState<(typeof KIND_FILTERS)[number]["id"]>("all");
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approvePhrase, setApprovePhrase] = useState("");

  const snapshot = trpc.platformOps.getCommandCenter.useQuery(undefined, {
    refetchInterval: 4000,
  });
  const approve = trpc.platformOps.approveIncident.useMutation({
    onSuccess: () => {
      setApproveId(null);
      setApprovePhrase("");
      void utils.platformOps.getCommandCenter.invalidate();
      void utils.platformOps.listIncidents.invalidate();
    },
  });
  const archiveStatus = trpc.platformOps.getComplianceArchiveStatus.useQuery();
  const saveArchive = trpc.platformOps.saveComplianceArchiveToDisk.useMutation({
    onSuccess: () => void utils.platformOps.getComplianceArchiveStatus.invalidate(),
  });
  const exportArchive = trpc.platformOps.exportComplianceArchive.useQuery(undefined, {
    enabled: false,
  });
  const emergency = trpc.platformOps.getOwnerEmergency.useQuery();

  const events = useMemo(() => {
    const all = snapshot.data?.events ?? [];
    if (kind === "all") return all;
    if (kind === "incident") {
      return all.filter((e) => e.kind === "incident" || e.kind === "remediation" || e.kind === "health_scan");
    }
    if (kind === "protection") {
      return all.filter((e) => e.kind === "protection" || e.kind === "section");
    }
    return all.filter((e) => e.kind === kind);
  }, [snapshot.data?.events, kind]);

  const terminalLines = snapshot.data?.terminalLines ?? [];
  const roadmap = snapshot.data?.roadmap ?? [];
  const protection = snapshot.data?.protection ?? [];

  if (snapshot.isLoading && !snapshot.data) {
    return (
      <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (snapshot.error) {
    return (
      <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>🛰️ Command Center</Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
          Could not load your private feed. Confirm you are signed in as the platform owner.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.panel, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>🛰️ Command Center</Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        Private English audit — only you. Hive talks, sandbox repairs, and protection actions are
        saved to your database so you stay covered if an AI makes a mistake. Nothing goes live until
        you type {OWNER_REMEDIATION_CONFIRM_PHRASE}.
      </Text>

      <View style={[styles.eventCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 13 }}>
          {emergency.data?.phoneAlarmArmed ? "🔔 Phone alarm armed" : "🔔 Phone alarm — open the app on your phone once"}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
          High/critical site problems and isolated sections wake this app. Allow notifications on
          your phone. Sign in as owner and leave the app installed.
        </Text>
        <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 13, marginTop: 6 }}>
          Compliance archive (for the IRS / official review)
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
          Saved folder: {archiveStatus.data?.backupDir ?? "data/owner-audit-archive"}
          {archiveStatus.data?.last
            ? ` · last file ${archiveStatus.data.last.fileName}`
            : " · no file written yet"}
          {archiveStatus.data?.configuredExternalDrive ? " · external drive configured" : ""}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          <Pressable
            onPress={() => saveArchive.mutate()}
            disabled={saveArchive.isPending}
            style={{ backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
              {saveArchive.isPending ? "Saving…" : "Save archive to disk now"}
            </Text>
          </Pressable>
          {Platform.OS === "web" ? (
            <Pressable
              onPress={() => {
                void exportArchive.refetch().then((result) => {
                  if (result.data) {
                    downloadJson(result.data, `ur-ops-archive-${new Date().toISOString().slice(0, 10)}.json`);
                  }
                });
              }}
              style={{ borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>Download JSON copy</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.statRow}>
        {protection.map((stat) => (
          <View
            key={stat.id}
            style={[
              styles.statCard,
              { borderColor: toneColor(stat.tone, colors), backgroundColor: colors.background },
            ]}
          >
            <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "700" }}>{stat.label}</Text>
            <Text style={{ color: toneColor(stat.tone, colors), fontSize: 13, fontWeight: "800" }}>
              {stat.value}
            </Text>
          </View>
        ))}
      </View>

      {snapshot.data?.offlineSections && snapshot.data.offlineSections.length > 0 ? (
        <Text style={{ color: "#dc2626", fontSize: 12, lineHeight: 18 }}>
          Isolated: {snapshot.data.offlineSections.map((s) => s.id).join(", ")}
        </Text>
      ) : null}

      <Text style={[styles.section, { color: colors.foreground }]}>Sandbox repairs awaiting you</Text>
      {(snapshot.data?.pendingRepairs ?? []).length === 0 ? (
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
          No sandbox plans waiting. When Doctor or Security finds a bug, they diagnose it here first
          — the live site is not changed until you approve.
        </Text>
      ) : (
        (snapshot.data?.pendingRepairs ?? []).map((repair) => (
          <View
            key={repair.incidentId}
            style={[styles.eventCard, { borderColor: repair.sandboxPassed ? colors.primary : "#d97706", backgroundColor: colors.background }]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 13 }}>{repair.title}</Text>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700" }}>
              {repair.sandboxPassed ? "Sandbox passed" : "Needs your review"} · live site unchanged
            </Text>
            <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 19 }}>{repair.diagnosis}</Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
              Planned live steps: {repair.wouldTouchLive.join(" · ")}
            </Text>
            {repair.checks.map((check) => (
              <Text key={check.name} style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
                {check.passed ? "✓" : "•"} {check.name}: {check.detail}
              </Text>
            ))}
            {approveId === repair.incidentId ? (
              <TextInput
                value={approvePhrase}
                onChangeText={setApprovePhrase}
                placeholder={OWNER_REMEDIATION_CONFIRM_PHRASE}
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  color: colors.foreground,
                  marginTop: 6,
                }}
              />
            ) : null}
            <Pressable
              onPress={() => {
                if (approveId !== repair.incidentId) {
                  setApproveId(repair.incidentId);
                  setApprovePhrase("");
                  return;
                }
                approve.mutate({
                  incidentId: repair.incidentId,
                  ownerNote: "Approved sandbox repair from Command Center",
                  confirmPhrase: approvePhrase,
                });
              }}
              disabled={
                approve.isPending ||
                (approveId === repair.incidentId && !isOwnerRemediationConfirmed(approvePhrase))
              }
              style={{
                backgroundColor: "#059669",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                alignSelf: "flex-start",
                opacity:
                  approveId === repair.incidentId && !isOwnerRemediationConfirmed(approvePhrase)
                    ? 0.5
                    : 1,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                {approveId === repair.incidentId
                  ? `Apply live after ${OWNER_REMEDIATION_CONFIRM_PHRASE}`
                  : "Review & approve live repair"}
              </Text>
            </Pressable>
          </View>
        ))
      )}

      <Text style={[styles.section, { color: colors.foreground }]}>Ops AI roadmap</Text>
      <View style={styles.roadmapRow}>
        {roadmap.map((node) => (
          <View
            key={node.id}
            style={[styles.roadmapCard, { borderColor: colors.border, backgroundColor: colors.background }]}
          >
            <Text style={{ fontSize: 22 }}>{node.avatar}</Text>
            <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 13 }}>{node.name}</Text>
            <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 14 }}>{node.role}</Text>
            <Text
              style={{
                color: node.status === "watch" ? "#d97706" : colors.primary,
                fontSize: 11,
                fontWeight: "700",
                marginTop: 4,
              }}
            >
              {statusLabel(node.status)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.section, { color: colors.foreground }]}>Live terminal</Text>
      <View style={styles.terminal}>
        {terminalLines.length === 0 ? (
          <Text style={styles.terminalLine}>waiting for first AI action…</Text>
        ) : (
          terminalLines.slice(0, 16).map((line, index) => (
            <Text key={`${index}-${line.slice(0, 24)}`} style={styles.terminalLine} numberOfLines={2}>
              {line}
            </Text>
          ))
        )}
      </View>

      <Text style={[styles.section, { color: colors.foreground }]}>Live English log</Text>
      <View style={styles.filterRow}>
        {KIND_FILTERS.map((filter) => {
          const active = kind === filter.id;
          return (
            <Pressable
              key={filter.id}
              onPress={() => setKind(filter.id)}
              style={[
                styles.filterChip,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? `${colors.primary}18` : colors.background,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? colors.primary : colors.muted,
                  fontSize: 11,
                  fontWeight: "700",
                }}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {events.length === 0 ? (
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
          No events in this filter yet. Chat with an ops AI, run a health scan, or watch a hive
          huddle — it will show up here in English.
        </Text>
      ) : (
        events.slice(0, 24).map((event) => (
          <View
            key={event.id}
            style={[styles.eventCard, { borderColor: colors.border, backgroundColor: colors.background }]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={[styles.dot, { backgroundColor: severityColor(event.severity) }]} />
              <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 13, flex: 1 }}>
                {event.sourceAiName}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 10 }}>
                {new Date(event.createdAt).toLocaleTimeString("en-US", {
                  timeZone: "America/Indiana/Indianapolis",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "700" }}>
              {event.kind.replace(/_/g, " ").toUpperCase()}
              {event.translated ? " · translated to English" : " · English"}
              {event.relatedAiNames.length > 0 ? ` · with ${event.relatedAiNames.join(", ")}` : ""}
            </Text>
            <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 19 }}>{event.english}</Text>
            {event.originalExcerpt ? (
              <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
                Original (on file): {event.originalExcerpt}
              </Text>
            ) : null}
          </View>
        ))
      )}

      <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 4 }}>
        {snapshot.data?.auditNote}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginHorizontal: 16, marginBottom: 12, borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  title: { fontSize: 16, fontWeight: "800" },
  section: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  statRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: { borderWidth: 1, borderRadius: 10, padding: 10, minWidth: 140, flexGrow: 1, gap: 4 },
  roadmapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roadmapCard: { borderWidth: 1, borderRadius: 12, padding: 10, width: "47%", flexGrow: 1, gap: 4 },
  terminal: {
    backgroundColor: "#07111c",
    borderRadius: 10,
    padding: 10,
    gap: 3,
    minHeight: 120,
  },
  terminalLine: {
    color: "#86efac",
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Platform.select({
      web: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      default: "monospace",
    }),
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  filterChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
  eventCard: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
