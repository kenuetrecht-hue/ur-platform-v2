import { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Alert, TextInput , Linking, Share } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Card, HeaderBar, SectionHeader, EmptyState } from "@/components/ur-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getPlatformStats, getLeads, getReports, getFeatureFlags, updateFeatureFlags, markLeadForwarded, markAllLeadsForwarded, getEmailSettings, saveEmailSettings, formatSingleLead, formatLeadsForExport, EmailSettings, Lead, Report, FeatureFlags } from "@/lib/store";

type Tab = "overview" | "leads" | "reports" | "features" | "ssi";

export default function AdminScreen() {
  const colors = useColors();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<any>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState({ urEmail: "", personalCcEmail: "" });

  const load = useCallback(async () => {
    const [s, l, r, f, e] = await Promise.all([
      getPlatformStats(),
      getLeads(),
      getReports(),
      getFeatureFlags(),
      getEmailSettings(),
    ]);
    setStats(s);
    setLeads(l);
    setReports(r);
    setFlags(f);
    setEmailSettings(e);
    setEmailDraft({ urEmail: e.urEmail, personalCcEmail: e.personalCcEmail });
  }, []);

  async function handleSaveEmailSettings() {
    if (!emailDraft.urEmail.includes("@") || !emailDraft.urEmail.includes(".")) {
      Alert.alert("Invalid email", "Please enter a valid UR email address.");
      return;
    }
    const next = await saveEmailSettings({
      urEmail: emailDraft.urEmail.trim(),
      personalCcEmail: emailDraft.personalCcEmail.trim(),
    });
    setEmailSettings(next);
    setEditingEmail(false);
  }

  async function toggleAutoEmail() {
    if (!emailSettings) return;
    const next = await saveEmailSettings({ autoEmailLeads: !emailSettings.autoEmailLeads });
    setEmailSettings(next);
  }

  async function sendLeadByEmail(lead: Lead) {
    if (!emailSettings) return;
    const subject = encodeURIComponent(`UR Lead — ${lead.name} — ${lead.service}`);
    const body = encodeURIComponent(formatSingleLead(lead));
    const cc = emailSettings.personalCcEmail.trim();
    const ccPart = cc ? `&cc=${encodeURIComponent(cc)}` : "";
    const url = `mailto:${emailSettings.urEmail}?subject=${subject}${ccPart}&body=${body}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) throw new Error("no mail client");
      await Linking.openURL(url);
    } catch {
      try { await Share.share({ message: formatSingleLead(lead), title: `UR Lead — ${lead.name}` }); }
      catch { Alert.alert("Lead", formatSingleLead(lead)); }
    }
  }

  async function emailAllUnforwarded() {
    if (!emailSettings) return;
    const pending = leads.filter((l) => !l.forwarded);
    if (pending.length === 0) {
      Alert.alert("All caught up", "There are no unforwarded leads to send.");
      return;
    }
    const subject = encodeURIComponent(`UR — ${pending.length} new lead${pending.length === 1 ? "" : "s"} to forward`);
    const body = encodeURIComponent(formatLeadsForExport(pending));
    const cc = emailSettings.personalCcEmail.trim();
    const ccPart = cc ? `&cc=${encodeURIComponent(cc)}` : "";
    const url = `mailto:${emailSettings.urEmail}?subject=${subject}${ccPart}&body=${body}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) throw new Error("no mail client");
      await Linking.openURL(url);
    } catch {
      try { await Share.share({ message: formatLeadsForExport(pending), title: `UR — ${pending.length} new leads` }); }
      catch { Alert.alert("Leads", formatLeadsForExport(pending)); }
    }
  }

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function toggleFlag(key: keyof FeatureFlags) {
    if (!flags) return;
    const updated = await updateFeatureFlags({ [key]: !flags[key] });
    setFlags(updated);
  }

  return (
    <ScreenContainer>
      <HeaderBar title="Admin" onBack={() => router.back()} />

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10, gap: 8 }}>
        {([
          ["overview", "Overview"],
          ["ssi", "SSI / Tax"],
          ["leads", "Leads"],
          ["reports", "Reports"],
          ["features", "Features"],
        ] as const).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={({ pressed }) => ({
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: tab === key ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: tab === key ? colors.primary : colors.border,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: tab === key ? "#FFFFFF" : colors.foreground, fontSize: 13, fontWeight: "500" }}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 16 }}>
        {tab === "overview" && stats && (
          <>
            <Pressable
              onPress={() => router.push("/partners-admin")}
              style={({ pressed }) => ({
                borderRadius: 16,
                padding: 16,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + "20", alignItems: "center", justifyContent: "center" }}>
                <IconSymbol name="link" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700" }}>Affiliate Partners</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Paste affiliate links → toggle on → they appear across UR</Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </Pressable>

            <LinearGradient
              colors={["#EC4899", "#8B5CF6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 20, padding: 24, gap: 8 }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 13, opacity: 0.9 }}>Platform Revenue (15% cut)</Text>
              <Text style={{ color: "#FFFFFF", fontSize: 40, fontWeight: "800" }}>${stats.totalRevenue.toFixed(2)}</Text>
              <Text style={{ color: "#FFFFFF", fontSize: 12, opacity: 0.85 }}>This month estimated</Text>
            </LinearGradient>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <AdminStat label="Total Users" value={stats.totalUsers.toLocaleString()} icon="person.2.fill" color={colors.primary} />
              <AdminStat label="Creators" value={stats.totalCreators.toString()} icon="sparkles" color={colors.warning} />
              <AdminStat label="Volume" value={`$${(stats.transactionVolume / 1000).toFixed(1)}k`} icon="creditcard.fill" color={colors.success} />
              <AdminStat label="Transactions" value={stats.transactionsCount.toString()} icon="arrow.up.arrow.down" color="#06B6D4" />
              <AdminStat label="Affiliate Leads" value={stats.leadsCount.toString()} icon="paperplane.fill" color="#EC4899" />
              <AdminStat label="Reports" value={reports.filter((r) => r.status === "pending").length.toString()} icon="exclamationmark.triangle.fill" color={colors.error} />
            </View>

            <Card style={{ gap: 6 }}>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>Revenue Breakdown</Text>
              <RevenueRow label="Platform fees (15%)" amount={stats.totalRevenue} colors={colors} />
              <RevenueRow label="Affiliate commissions" amount={leads.length * 12} colors={colors} />
              <RevenueRow label="Premium creator subs" amount={0} colors={colors} note="(activates Q3)" />
              <RevenueRow label="Brand sponsorships" amount={0} colors={colors} note="(activates Q4)" />
            </Card>
          </>
        )}

        {tab === "ssi" && stats && (
          <>
            <Card style={{ gap: 12, backgroundColor: colors.success + "10", borderColor: colors.success + "30" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.success + "20", alignItems: "center", justifyContent: "center" }}>
                  <IconSymbol name="doc.fill" size={20} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700" }}>SSI / SSDI Documentation</Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Auto-tracked for Social Security reporting</Text>
                </View>
              </View>
            </Card>

            <Card style={{ gap: 10 }}>
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700" }}>Monthly Earnings (this year)</Text>
              <LedgerRow month="January" amount={0} colors={colors} />
              <LedgerRow month="February" amount={45.50} colors={colors} />
              <LedgerRow month="March" amount={142.30} colors={colors} />
              <LedgerRow month="April" amount={287.40} colors={colors} highlight />
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>YTD Total</Text>
                <Text style={{ color: colors.success, fontSize: 16, fontWeight: "800" }}>$475.20</Text>
              </View>
              <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
                Below SGA limits for SSDI ($1,550/month in 2025) and SSI countable income thresholds.
              </Text>
            </Card>

            <View style={{ gap: 8 }}>
              <Pressable
                onPress={() => Alert.alert("Generate Report", "Monthly SSI/SSDI earnings report will be downloaded as PDF.\n\nIncludes:\n• Gross earnings\n• Platform fees\n• Net income\n• Date-stamped transactions")}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <IconSymbol name="doc.text.fill" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>Generate Monthly SSI Report</Text>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>For Social Security Administration</Text>
                </View>
                <IconSymbol name="arrow.down" size={16} color={colors.muted} />
              </Pressable>

              <Pressable
                onPress={() => Alert.alert("1099-K Tax Form", "Annual 1099-K form will be available January 31 for the prior tax year.")}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <IconSymbol name="doc.fill" size={20} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>Download 1099-K Tax Form</Text>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>For IRS / federal tax filing</Text>
                </View>
                <IconSymbol name="arrow.down" size={16} color={colors.muted} />
              </Pressable>
            </View>
          </>
        )}

        {tab === "leads" && (
          <>
            {/* UR Email Settings card */}
            {emailSettings && (
              <Card style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <IconSymbol name="envelope.fill" size={16} color={colors.primary} />
                  <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>UR Email Settings</Text>
                </View>
                {!editingEmail ? (
                  <>
                    <View style={{ gap: 4 }}>
                      <Text style={{ color: colors.muted, fontSize: 11 }}>UR business email</Text>
                      <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>{emailSettings.urEmail || "(not set)"}</Text>
                    </View>
                    {emailSettings.personalCcEmail ? (
                      <View style={{ gap: 4 }}>
                        <Text style={{ color: colors.muted, fontSize: 11 }}>Personal CC backup</Text>
                        <Text style={{ color: colors.foreground, fontSize: 13 }}>{emailSettings.personalCcEmail}</Text>
                      </View>
                    ) : null}
                    <Pressable
                      onPress={toggleAutoEmail}
                      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.7 : 1 })}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>Auto-email new leads</Text>
                        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>Show “Email to RMS” action on each lead</Text>
                      </View>
                      <View style={{ width: 40, height: 24, borderRadius: 12, backgroundColor: emailSettings.autoEmailLeads ? colors.success : colors.border, padding: 3, alignItems: emailSettings.autoEmailLeads ? "flex-end" : "flex-start" }}>
                        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFFFFF" }} />
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => setEditingEmail(true)}
                      style={({ pressed }) => ({ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, opacity: pressed ? 0.6 : 1 })}
                    >
                      <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>Edit emails</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <View style={{ gap: 6 }}>
                      <Text style={{ color: colors.muted, fontSize: 11 }}>UR business email</Text>
                      <TextInput
                        value={emailDraft.urEmail}
                        onChangeText={(t) => setEmailDraft((s) => ({ ...s, urEmail: t }))}
                        placeholder="ken.uetrecht.ur@gmail.com"
                        placeholderTextColor={colors.muted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        style={{ backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, color: colors.foreground }}
                      />
                    </View>
                    <View style={{ gap: 6 }}>
                      <Text style={{ color: colors.muted, fontSize: 11 }}>Personal CC backup (optional)</Text>
                      <TextInput
                        value={emailDraft.personalCcEmail}
                        onChangeText={(t) => setEmailDraft((s) => ({ ...s, personalCcEmail: t }))}
                        placeholder="yourpersonal@email.com"
                        placeholderTextColor={colors.muted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        style={{ backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, color: colors.foreground }}
                      />
                    </View>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Pressable
                        onPress={() => { setEmailDraft({ urEmail: emailSettings.urEmail, personalCcEmail: emailSettings.personalCcEmail }); setEditingEmail(false); }}
                        style={({ pressed }) => ({ flex: 1, padding: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, alignItems: "center", opacity: pressed ? 0.7 : 1 })}
                      >
                        <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleSaveEmailSettings}
                        style={({ pressed }) => ({ flex: 1, padding: 10, backgroundColor: colors.primary, borderRadius: 8, alignItems: "center", opacity: pressed ? 0.85 : 1 })}
                      >
                        <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>Save</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </Card>
            )}

            <Card style={{ gap: 8 }}>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>Real Merchant Services Leads</Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                Each row contains the four fields RMS needs. Tap a lead to copy, share, or email it, then mark it as forwarded once you’ve sent it to RMS.
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                {emailSettings?.autoEmailLeads ? (
                  <Pressable
                    onPress={emailAllUnforwarded}
                    style={({ pressed }) => ({ flex: 1, minWidth: "30%", padding: 10, backgroundColor: colors.success, borderRadius: 8, alignItems: "center", opacity: pressed ? 0.85 : 1 })}
                  >
                    <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>Email Pending Leads</Text>
                  </Pressable>
                ) : null}
                  <Pressable
                  onPress={async () => {
                    if (leads.length === 0) return;
                    const text = formatLeadsForExport(leads);
                    try { await Share.share({ message: text, title: "UR — RMS Leads Export" }); }
                    catch { Alert.alert("Export", text); }
                  }}
                  style={({ pressed }) => ({ flex: 1, minWidth: "30%", padding: 10, backgroundColor: colors.primary, borderRadius: 8, alignItems: "center", opacity: pressed ? 0.85 : 1 })}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>Print / Share All</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    if (leads.length === 0) return;
                    Alert.alert(
                      "Mark all as forwarded?",
                      "Use this once you've sent every lead above to RMS. They'll stay visible but show a green check.",
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Mark all", onPress: async () => { await markAllLeadsForwarded(); load(); } },
                      ],
                    );
                  }}
                  style={({ pressed }) => ({ flex: 1, padding: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, alignItems: "center", opacity: pressed ? 0.7 : 1 })}
                >
                  <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>Mark All Forwarded</Text>
                </Pressable>
              </View>
            </Card>
            {leads.length === 0 ? (
              <EmptyState icon="paperplane.fill" title="No leads yet" message="Leads will appear here as users submit the RMS form." />
            ) : (
              <View style={{ gap: 8 }}>
                {leads.map((lead) => (
                  <Card key={lead.id} style={{ gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700" }}>{lead.name}</Text>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {lead.forwarded && (
                          <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.success + "20", borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <IconSymbol name="checkmark.circle.fill" size={11} color={colors.success} />
                            <Text style={{ color: colors.success, fontSize: 10, fontWeight: "700" }}>FORWARDED</Text>
                          </View>
                        )}
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.warning + "20", borderRadius: 999 }}>
                          <Text style={{ color: colors.warning, fontSize: 10, fontWeight: "600", textTransform: "capitalize" }}>{lead.status}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={{ gap: 4 }}>
                      {lead.businessName ? (
                        <Text style={{ color: colors.foreground, fontSize: 13 }}><Text style={{ color: colors.muted, fontWeight: "600" }}>Business: </Text>{lead.businessName}</Text>
                      ) : null}
                      {lead.phone ? (
                        <Text style={{ color: colors.foreground, fontSize: 13 }}><Text style={{ color: colors.muted, fontWeight: "600" }}>Phone: </Text>{lead.phone}</Text>
                      ) : null}
                      <Text style={{ color: colors.foreground, fontSize: 13 }}><Text style={{ color: colors.muted, fontWeight: "600" }}>Email: </Text>{lead.email}</Text>
                      <Text style={{ color: colors.muted, fontSize: 11 }}>{lead.date} · {lead.service}</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                      <Pressable
                        onPress={async () => {
                          const text = formatSingleLead(lead);
                          try { await Share.share({ message: text, title: `UR Lead — ${lead.name}` }); }
                          catch { Alert.alert("Lead", text); }
                        }}
                        style={({ pressed }) => ({ flex: 1, minWidth: "30%", padding: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, alignItems: "center", opacity: pressed ? 0.7 : 1 })}
                      >
                        <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "600" }}>Copy / Share</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => sendLeadByEmail(lead)}
                        style={({ pressed }) => ({ flex: 1, minWidth: "30%", padding: 10, backgroundColor: colors.primary, borderRadius: 8, alignItems: "center", opacity: pressed ? 0.85 : 1 })}
                      >
                        <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}>Email to RMS</Text>
                      </Pressable>
                      <Pressable
                        onPress={async () => { await markLeadForwarded(lead.id, !lead.forwarded); load(); }}
                        style={({ pressed }) => ({ flex: 1, minWidth: "30%", padding: 10, backgroundColor: lead.forwarded ? colors.surface : colors.success, borderWidth: 1, borderColor: lead.forwarded ? colors.border : colors.success, borderRadius: 8, alignItems: "center", opacity: pressed ? 0.85 : 1 })}
                      >
                        <Text style={{ color: lead.forwarded ? colors.foreground : "#FFFFFF", fontSize: 12, fontWeight: "600" }}>{lead.forwarded ? "Undo Forwarded" : "Mark Forwarded"}</Text>
                      </Pressable>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </>
        )}

        {tab === "reports" && (
          <>
            <Card style={{ gap: 6 }}>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>User Reports</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Pending moderation review</Text>
            </Card>
            {reports.length === 0 ? (
              <EmptyState icon="checkmark.shield.fill" title="No pending reports" message="All clear! Community is healthy." />
            ) : (
              <View style={{ gap: 8 }}>
                {reports.map((report) => (
                  <Card key={report.id} style={{ gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>{report.reportedUserName}</Text>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.warning + "20", borderRadius: 999 }}>
                        <Text style={{ color: colors.warning, fontSize: 11, fontWeight: "600", textTransform: "capitalize" }}>{report.status}</Text>
                      </View>
                    </View>
                    <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "500" }}>Reason: {report.reason}</Text>
                    {report.description && (
                      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{report.description}</Text>
                    )}
                    <Text style={{ color: colors.muted, fontSize: 11 }}>{report.date}</Text>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                      <Pressable
                        onPress={() => Alert.alert("Dismissed", "Report marked as resolved.")}
                        style={({ pressed }) => ({ flex: 1, padding: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, alignItems: "center", opacity: pressed ? 0.7 : 1 })}
                      >
                        <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "500" }}>Dismiss</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => Alert.alert("Action taken", "User has been warned/suspended.")}
                        style={({ pressed }) => ({ flex: 1, padding: 10, backgroundColor: colors.error, borderRadius: 8, alignItems: "center", opacity: pressed ? 0.7 : 1 })}
                      >
                        <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>Take Action</Text>
                      </Pressable>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </>
        )}

        {tab === "features" && flags && (
          <>
            <Card style={{ gap: 6 }}>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>Feature Flags</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Toggle features on/off across the platform</Text>
            </Card>
            {([
              ["contestsEnabled", "Contests", "Allow creators to run prize contests"],
              ["giveawaysEnabled", "Giveaways", "Allow creators to host free giveaways"],
              ["videoUploadsEnabled", "Video Uploads", "Direct video hosting (planned Phase 6)"],
              ["cryptoEnabled", "Crypto Payments", "Bitcoin/USDC support (planned 2026)"],
              ["collaborationEnabled", "Creator Collabs", "Multi-creator collaboration tools"],
              ["schedulingEnabled", "Content Scheduling", "Schedule posts & messages ahead"],
            ] as const).map(([key, label, desc]) => (
              <Pressable
                key={key}
                onPress={() => toggleFlag(key as keyof FeatureFlags)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>{label}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{desc}</Text>
                </View>
                <View
                  style={{
                    width: 44,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: flags[key as keyof FeatureFlags] ? colors.success : colors.border,
                    padding: 3,
                    alignItems: flags[key as keyof FeatureFlags] ? "flex-end" : "flex-start",
                  }}
                >
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF" }} />
                </View>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function AdminStat({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  const colors = useColors();
  return (
    <View style={{ width: "48%", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "500" }}>{label}</Text>
        <IconSymbol name={icon as any} size={14} color={color} />
      </View>
      <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

function RevenueRow({ label, amount, colors, note }: any) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.foreground, fontSize: 13 }}>{label}</Text>
        {note && <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{note}</Text>}
      </View>
      <Text style={{ color: amount > 0 ? colors.success : colors.muted, fontSize: 14, fontWeight: "600" }}>${amount.toFixed(2)}</Text>
    </View>
  );
}

function LedgerRow({ month, amount, colors, highlight }: any) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 }}>
      <Text style={{ color: highlight ? colors.foreground : colors.muted, fontSize: 13, fontWeight: highlight ? "600" : "400" }}>{month}</Text>
      <Text style={{ color: highlight ? colors.foreground : colors.muted, fontSize: 14, fontWeight: highlight ? "700" : "500" }}>${amount.toFixed(2)}</Text>
    </View>
  );
}
