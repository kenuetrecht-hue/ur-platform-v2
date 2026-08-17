import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  TextInput,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { CreatorAIInterface } from "@/components/creator-ai-interface";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import type { AdminStaffRole } from "@/lib/admin-access-types";
import { AiSessionProgrammingPanel } from "@/components/ai-session-programming-panel";
import { PlatformSectionMaintenancePanel } from "@/components/platform-section-maintenance-panel";
import { PlatformContentProtectionPanel } from "@/components/platform-content-protection-panel";
import { TransactionHistoryList } from "@/components/transaction-history-list";

export function PlatformOpsConsole({ isPlatformOwner: isOwnerProp }: { isPlatformOwner?: boolean }) {
  const colors = useColors();
  const { isPlatformOwner: isOwnerHook, hasAdminPermission } = usePlatformOwner();
  const isPlatformOwner = isOwnerProp ?? isOwnerHook;
  const utils = trpc.useUtils();
  const [selectedOpsAi, setSelectedOpsAi] = useState<string>("platform-security-ai");
  const [rejectNote, setRejectNote] = useState("");
  const [ownerInstructions, setOwnerInstructions] = useState("");
  const [instructionIncidentId, setInstructionIncidentId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffNote, setStaffNote] = useState("");
  const [staffRole, setStaffRole] = useState<AdminStaffRole>("viewer");

  const roleOptions = trpc.platformOps.listAdminRoleOptions.useQuery(undefined, {
    enabled: isPlatformOwner,
  });
  const adminStaff = trpc.platformOps.listAdminStaff.useQuery(undefined, {
    enabled: isPlatformOwner,
  });
  const grantStaff = trpc.platformOps.grantAdminStaff.useMutation({
    onSuccess: () => {
      setStaffEmail("");
      setStaffNote("");
      void utils.platformOps.listAdminStaff.invalidate();
    },
  });
  const revokeStaff = trpc.platformOps.revokeAdminStaff.useMutation({
    onSuccess: () => void utils.platformOps.listAdminStaff.invalidate(),
  });

  const dashboard = trpc.platformOps.dashboard.useQuery(undefined, {
    enabled: hasAdminPermission("view_ops_dashboard"),
  });
  const incidents = trpc.platformOps.listIncidents.useQuery(undefined, {
    enabled: hasAdminPermission("view_incidents"),
  });
  const notifications = trpc.platformOps.listNotifications.useQuery(undefined, {
    enabled: hasAdminPermission("view_notifications"),
  });
  const accessGrants = trpc.platformOps.listAccessGrants.useQuery(undefined, {
    enabled: hasAdminPermission("grant_user_access"),
  });

  const runScan = trpc.platformOps.runHealthScan.useMutation({
    onSuccess: () => {
      void utils.platformOps.listIncidents.invalidate();
      void utils.platformOps.dashboard.invalidate();
    },
  });

  const approve = trpc.platformOps.approveIncident.useMutation({
    onSuccess: () => {
      void utils.platformOps.listIncidents.invalidate();
      void utils.platformOps.dashboard.invalidate();
      void utils.platformOps.listSections.invalidate();
    },
  });

  const sendInstructions = trpc.platformOps.submitOwnerInstructions.useMutation({
    onSuccess: () => {
      setOwnerInstructions("");
      setInstructionIncidentId(null);
      void utils.platformOps.listIncidents.invalidate();
      void utils.platformOps.listNotifications.invalidate();
    },
  });

  const reopenSection = trpc.platformOps.reopenIncidentSection.useMutation({
    onSuccess: () => {
      void utils.platformOps.listIncidents.invalidate();
      void utils.platformOps.listSections.invalidate();
      void utils.platformOps.dashboard.invalidate();
    },
  });

  const reject = trpc.platformOps.rejectIncident.useMutation({
    onSuccess: () => {
      setRejectNote("");
      void utils.platformOps.listIncidents.invalidate();
      void utils.platformOps.dashboard.invalidate();
    },
  });

  const resolve = trpc.platformOps.resolveIncident.useMutation({
    onSuccess: () => {
      void utils.platformOps.listIncidents.invalidate();
      void utils.platformOps.dashboard.invalidate();
    },
  });

  const markRead = trpc.platformOps.markNotificationsRead.useMutation({
    onSuccess: () => void utils.platformOps.listNotifications.invalidate(),
  });

  const grantAccess = trpc.platformOps.grantFreeAccess.useMutation({
    onSuccess: () => {
      setGrantEmail("");
      setGrantReason("");
      void utils.platformOps.listAccessGrants.invalidate();
    },
  });

  const ledger = trpc.partnerDashboard.listAllTransactionsAdmin.useQuery(undefined, {
    enabled: hasAdminPermission("manage_ai_sessions"),
  });

  const revokeGrant = trpc.platformOps.revokeFreeAccess.useMutation({
    onSuccess: () => void utils.platformOps.listAccessGrants.invalidate(),
  });

  const opsAis = [
    { id: "platform-doctor-ai", name: "Doctor AI", avatar: "🩺" },
    { id: "platform-administration-ai", name: "Administration AI", avatar: "🏛️" },
    { id: "platform-security-ai", name: "Security AI", avatar: "🛡️" },
  ];

  const selectedMeta = opsAis.find((a) => a.id === selectedOpsAi)!;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
      <View style={[styles.banner, { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}>
        <Text style={[styles.bannerTitle, { color: colors.foreground }]}>
          🏛️ Administration & ops
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
          Doctor, Administration, and Security AIs monitor UR 24/7. When something breaks, they
          isolate that section immediately, alert you with the problem + fix plan, and wait for your
          OK before any deploy or reopen.
        </Text>
      </View>

      {isPlatformOwner ? <PlatformContentProtectionPanel /> : null}

      {isPlatformOwner ? (
        <View style={{ gap: 10, paddingHorizontal: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: 0 }]}>
            Admin staff access
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
            Hire help with limited roles. Only you can add or remove staff. Staff never get full
            owner platform powers.
          </Text>
          <TextInput
            value={staffEmail}
            onChangeText={setStaffEmail}
            placeholder="Staff email"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[styles.grantInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {(roleOptions.data ?? []).map((r) => (
              <Pressable
                key={r.id}
                onPress={() => setStaffRole(r.id)}
                style={[
                  styles.opsChip,
                  {
                    backgroundColor: staffRole === r.id ? colors.primary : colors.surface,
                    borderColor: staffRole === r.id ? colors.primary : colors.border,
                    minWidth: 140,
                  },
                ]}
              >
                <Text
                  style={{
                    color: staffRole === r.id ? "#fff" : colors.foreground,
                    fontWeight: "700",
                    fontSize: 11,
                    textAlign: "center",
                  }}
                >
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <TextInput
            value={staffNote}
            onChangeText={setStaffNote}
            placeholder="Note (optional)"
            placeholderTextColor={colors.muted}
            style={[styles.grantInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
          />
          <Pressable
            onPress={() =>
              grantStaff.mutate({
                userEmail: staffEmail.trim(),
                role: staffRole,
                note: staffNote.trim() || undefined,
              })
            }
            disabled={grantStaff.isPending || !staffEmail.trim().includes("@")}
            style={[styles.scanBtn, { marginHorizontal: 0, backgroundColor: staffEmail.includes("@") ? colors.primary : colors.muted }]}
          >
            <Text style={styles.scanBtnText}>Grant administration access</Text>
          </Pressable>
          {(adminStaff.data ?? []).filter((g) => !g.revokedAt).map((g) => (
            <View key={g.id} style={[styles.card, { marginHorizontal: 0, backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ fontWeight: "700", color: colors.foreground }}>{g.userEmail}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{g.role.replace(/_/g, " ")}</Text>
              {g.note ? <Text style={{ color: colors.muted, fontSize: 11 }}>{g.note}</Text> : null}
              <Pressable onPress={() => revokeStaff.mutate({ grantId: g.id })} style={{ marginTop: 6 }}>
                <Text style={{ color: "#dc2626", fontWeight: "600", fontSize: 12 }}>Revoke access</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {hasAdminPermission("view_ops_dashboard") ? (
      <View style={styles.statsRow}>
        {[
          { label: "Awaiting you", value: dashboard.data?.awaitingApproval ?? 0 },
          { label: "Sections off", value: dashboard.data?.sectionsDisabled ?? 0 },
          { label: "Alerts", value: dashboard.data?.unreadNotifications ?? 0 },
        ].map((s) => (
          <View key={s.label} style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: colors.primary }}>{s.value}</Text>
            <Text style={{ fontSize: 11, color: colors.muted, fontWeight: "600" }}>{s.label}</Text>
          </View>
        ))}
      </View>
      ) : null}

      {hasAdminPermission("run_health_scan") ? (
      <Pressable
        onPress={() => runScan.mutate()}
        disabled={runScan.isPending}
        style={[styles.scanBtn, { backgroundColor: colors.primary }]}
      >
        {runScan.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.scanBtnText}>Run security & health scan</Text>
        )}
      </Pressable>
      ) : null}

      {hasAdminPermission("grant_user_access") ? (
      <View style={{ gap: 10, paddingHorizontal: 16 }}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: 0 }]}>
          Complimentary access
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
          Grant free AI access to anyone you choose. Everyone else must pay for membership or stamps.
        </Text>
        <TextInput
          value={grantEmail}
          onChangeText={setGrantEmail}
          placeholder="User email to grant free access"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[styles.grantInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
        />
        <TextInput
          value={grantReason}
          onChangeText={setGrantReason}
          placeholder="Reason (optional)"
          placeholderTextColor={colors.muted}
          style={[styles.grantInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
        />
        <Pressable
          onPress={() =>
            grantAccess.mutate({
              userEmail: grantEmail.trim(),
              reason: grantReason.trim() || undefined,
            })
          }
          disabled={grantAccess.isPending || !grantEmail.trim().includes("@")}
          style={[styles.scanBtn, { marginHorizontal: 0, backgroundColor: grantEmail.trim().includes("@") ? colors.primary : colors.muted }]}
        >
          <Text style={styles.scanBtnText}>Grant free AI access</Text>
        </Pressable>
        {(accessGrants.data ?? []).filter((g) => !g.revokedAt).slice(0, 5).map((g) => (
          <View key={g.id} style={[styles.card, { marginHorizontal: 0, backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontWeight: "700", color: colors.foreground }}>{g.userEmail}</Text>
            {g.reason ? <Text style={{ color: colors.muted, fontSize: 12 }}>{g.reason}</Text> : null}
            <Pressable onPress={() => revokeGrant.mutate({ grantId: g.id })} style={{ marginTop: 6 }}>
              <Text style={{ color: "#dc2626", fontWeight: "600", fontSize: 12 }}>Revoke</Text>
            </Pressable>
          </View>
        ))}
      </View>
      ) : null}

      {hasAdminPermission("view_notifications") && notifications.data && notifications.data.length > 0 ? (
        <View style={{ gap: 8 }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent alerts</Text>
            <Pressable onPress={() => markRead.mutate()} disabled={!hasAdminPermission("mark_notifications_read")}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>Mark read</Text>
            </Pressable>
          </View>
          {notifications.data.slice(0, 3).map((n) => (
            <View key={n.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ fontWeight: "700", color: colors.foreground }}>{n.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }} numberOfLines={4}>
                {n.content}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {isPlatformOwner ? (
        <PlatformSectionMaintenancePanel canManage={isPlatformOwner} />
      ) : null}

      {hasAdminPermission("view_incidents") ? (
      <View style={{ gap: 8 }}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Incidents</Text>
        {incidents.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {(incidents.data ?? []).length === 0 ? (
          <Text style={{ color: colors.muted, fontSize: 14 }}>
            No incidents yet. Run a health scan or chat with an ops AI about a concern.
          </Text>
        ) : (
          (incidents.data ?? []).map((inc) => (
            <View key={inc.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Pressable onPress={() => setExpandedId(expandedId === inc.id ? null : inc.id)}>
                <View style={styles.incidentHeader}>
                  <Text style={{ fontWeight: "700", color: colors.foreground, flex: 1 }}>{inc.title}</Text>
                  <Text style={[styles.badge, { color: inc.severity === "critical" || inc.severity === "high" ? "#dc2626" : colors.primary }]}>
                    {inc.status.replace(/_/g, " ")}
                  </Text>
                </View>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{inc.category} · {inc.sourceAi}</Text>
                {inc.affectedSectionId ? (
                  <Text style={{ color: colors.primary, fontSize: 11, marginTop: 4 }}>
                    Section: {inc.affectedSectionId}
                  </Text>
                ) : null}
                {inc.autoIsolated ? (
                  <Text style={{ color: "#dc2626", fontSize: 11, marginTop: 4, fontWeight: "700" }}>
                    🛑 Section auto-isolated — rest of UR still online
                  </Text>
                ) : null}
              </Pressable>
              {expandedId === inc.id ? (
                <View style={{ marginTop: 10, gap: 8 }}>
                  <Text style={{ color: colors.foreground, fontSize: 13 }}><Text style={{ fontWeight: "700" }}>Problem: </Text>{inc.problem}</Text>
                  <Text style={{ color: colors.foreground, fontSize: 13 }}><Text style={{ fontWeight: "700" }}>Proposed fix: </Text>{inc.proposedFix}</Text>
                  {inc.deployProposal?.steps?.length ? (
                    <View style={{ gap: 4 }}>
                      <Text style={{ fontWeight: "700", color: colors.foreground, fontSize: 12 }}>
                        Deploy / remediation plan
                      </Text>
                      {inc.deployProposal.steps.map((step, idx) => (
                        <Text key={`${inc.id}-step-${idx}`} style={{ color: colors.muted, fontSize: 12 }}>
                          {idx + 1}. {step}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  {inc.ownerInstructions ? (
                    <Text style={{ color: colors.foreground, fontSize: 12 }}>
                      <Text style={{ fontWeight: "700" }}>Your instructions: </Text>
                      {inc.ownerInstructions}
                    </Text>
                  ) : null}
                  {inc.remediationResults?.length ? (
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      Remediation:{" "}
                      {inc.remediationResults.map((r) => `${r.success ? "✓" : "✗"} ${r.actionId}`).join(" · ")}
                    </Text>
                  ) : null}
                  {inc.actionsTaken.length > 0 ? (
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      Actions: {inc.actionsTaken.join(" · ")}
                    </Text>
                  ) : null}
                  {isPlatformOwner && instructionIncidentId === inc.id ? (
                    <TextInput
                      value={ownerInstructions}
                      onChangeText={setOwnerInstructions}
                      placeholder="Tell your ops AIs what to do next…"
                      placeholderTextColor={colors.muted}
                      multiline
                      style={[
                        styles.grantInput,
                        { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, minHeight: 72 },
                      ]}
                    />
                  ) : null}
                  {(inc.status === "awaiting_owner_approval" ||
                    inc.status === "section_isolated") &&
                  hasAdminPermission("manage_incidents") ? (
                    <View style={{ gap: 8, marginTop: 4 }}>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <Pressable
                          onPress={() => approve.mutate({ incidentId: inc.id, ownerNote: "Approved fix plan" })}
                          disabled={approve.isPending}
                          style={[styles.actionBtn, { backgroundColor: "#059669" }]}
                        >
                          <Text style={styles.actionBtnText}>
                            {approve.isPending ? "Running…" : "✅ Approve fix & deploy"}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            instructionIncidentId === inc.id
                              ? sendInstructions.mutate({
                                  incidentId: inc.id,
                                  instructions: ownerInstructions,
                                })
                              : setInstructionIncidentId(inc.id)
                          }
                          disabled={sendInstructions.isPending}
                          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                        >
                          <Text style={styles.actionBtnText}>
                            {instructionIncidentId === inc.id ? "Send instructions" : "📋 Instruct AIs"}
                          </Text>
                        </Pressable>
                        {inc.affectedSectionId && inc.autoIsolated ? (
                          <Pressable
                            onPress={() => reopenSection.mutate({ incidentId: inc.id, ownerNote: "Reopen without full deploy" })}
                            disabled={reopenSection.isPending}
                            style={[styles.actionBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
                          >
                            <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Reopen section</Text>
                          </Pressable>
                        ) : null}
                        <Pressable
                          onPress={() => reject.mutate({ incidentId: inc.id, ownerNote: rejectNote || "Rejected" })}
                          style={[styles.actionBtn, { backgroundColor: "#dc2626" }]}
                        >
                          <Text style={styles.actionBtnText}>Reject plan</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : inc.status === "deploy_executed" || inc.status === "approved" ? (
                    <Pressable
                      onPress={() => resolve.mutate({ incidentId: inc.id })}
                      style={[styles.actionBtn, { backgroundColor: colors.primary, alignSelf: "flex-start" }]}
                    >
                      <Text style={styles.actionBtnText}>Mark resolved</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))
        )}
      </View>
      ) : null}

      {hasAdminPermission("manage_ai_sessions") ? (
        <AiSessionProgrammingPanel />
      ) : null}

      {hasAdminPermission("manage_ai_sessions") && ledger.data ? (
        <View style={{ paddingHorizontal: 16, gap: 10, paddingBottom: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Platform transactions ({ledger.data.stats.totalTransactions})
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, paddingHorizontal: 16 }}>
            Every sale, bonus, and comp — ${(ledger.data.stats.totalVolumeCents / 100).toFixed(2)} total
            volume · {ledger.data.links.length} custom links issued
          </Text>
          <TransactionHistoryList
            transactions={ledger.data.transactions}
            emptyMessage="No transactions recorded yet."
          />
        </View>
      ) : null}

      {hasAdminPermission("chat_ops_ai") ? (
      <View style={{ gap: 8 }}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ops AI chat</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {opsAis.map((ai) => (
            <Pressable
              key={ai.id}
              onPress={() => setSelectedOpsAi(ai.id)}
              style={[
                styles.opsChip,
                {
                  backgroundColor: selectedOpsAi === ai.id ? colors.primary : colors.surface,
                  borderColor: selectedOpsAi === ai.id ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={{ fontSize: 20 }}>{ai.avatar}</Text>
              <Text style={{ color: selectedOpsAi === ai.id ? "#fff" : colors.foreground, fontWeight: "700", fontSize: 12 }}>
                {ai.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ height: 420, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
          <CreatorAIInterface
            key={selectedOpsAi}
            creatorId={selectedOpsAi}
            creatorName={selectedMeta.name}
            creatorAvatar={selectedMeta.avatar}
            welcomeMessage={`Owner channel active. I'm ${selectedMeta.name}. Report issues, request scans, propose section isolation (one area offline while UR stays up), or ask for compliance/security status. I'll file incidents and notify you for final approval.`}
          />
        </View>
      </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  banner: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  bannerTitle: { fontSize: 17, fontWeight: "800" },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16 },
  stat: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "center", gap: 2 },
  scanBtn: { marginHorizontal: 16, borderRadius: 12, padding: 14, alignItems: "center" },
  scanBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", paddingHorizontal: 16 },
  card: { marginHorizontal: 16, borderRadius: 12, borderWidth: 1, padding: 14 },
  incidentHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  actionBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  opsChip: { borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "center", gap: 4, minWidth: 100 },
  grantInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
});
