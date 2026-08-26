import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type Mode = "field" | "office";
type FieldTab = "clock" | "scan" | "log" | "punch" | "safety";

function readBrowserCoords(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 15_000 },
    );
  });
}

export function JobsiteConsole() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const context = trpc.jobsite.getMyContext.useQuery();
  const [mode, setMode] = useState<Mode>("field");
  const [fieldTab, setFieldTab] = useState<FieldTab>("clock");
  const [companyName, setCompanyName] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const companies = context.data?.companies ?? [];
  const active = useMemo(() => {
    if (selectedCompanyId) {
      return companies.find((c) => c.company.id === selectedCompanyId) ?? companies[0];
    }
    return companies[0];
  }, [companies, selectedCompanyId]);

  const companyId = active?.company.id;
  const isManager = active?.role === "company_owner" || active?.role === "office_manager";

  const jobs = trpc.jobsite.listJobs.useQuery(
    { companyId: companyId! },
    { enabled: Boolean(companyId) },
  );
  const roster = trpc.jobsite.listRoster.useQuery(
    { companyId: companyId! },
    { enabled: Boolean(companyId) },
  );
  const inventory = trpc.jobsite.listInventory.useQuery(
    { companyId: companyId! },
    { enabled: Boolean(companyId) },
  );
  const equipment = trpc.jobsite.listEquipment.useQuery(
    { companyId: companyId! },
    { enabled: Boolean(companyId) },
  );
  const dashboard = trpc.jobsite.dashboard.useQuery(
    { companyId: companyId! },
    { enabled: Boolean(companyId && isManager) },
  );
  const members = trpc.jobsite.listMembers.useQuery(
    { companyId: companyId! },
    { enabled: Boolean(companyId) },
  );
  const dailyLogs = trpc.jobsite.listDailyLogs.useQuery(
    { companyId: companyId! },
    { enabled: Boolean(companyId) },
  );
  const punchList = trpc.jobsite.listPunchList.useQuery(
    { companyId: companyId! },
    { enabled: Boolean(companyId) },
  );
  const safety = trpc.jobsite.listSafetyReports.useQuery(
    { companyId: companyId! },
    { enabled: Boolean(companyId) },
  );

  const createCompany = trpc.jobsite.createCompany.useMutation({
    onSuccess: () => void utils.jobsite.getMyContext.invalidate(),
  });

  const [jobName, setJobName] = useState("");
  const [jobAddress, setJobAddress] = useState("");
  const [jobLat, setJobLat] = useState("39.7392");
  const [jobLng, setJobLng] = useState("-104.9903");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"crew" | "office_manager">("crew");
  const [sku, setSku] = useState("");
  const [itemName, setItemName] = useState("");
  const [qtyYard, setQtyYard] = useState("0");
  const [checkoutQty, setCheckoutQty] = useState("1");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [equipName, setEquipName] = useState("");
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [weather, setWeather] = useState("");
  const [crewNotes, setCrewNotes] = useState("");
  const [punchTitle, setPunchTitle] = useState("");
  const [safetyNotes, setSafetyNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const createJob = trpc.jobsite.createJob.useMutation({
    onSuccess: () => {
      void utils.jobsite.listJobs.invalidate();
      void utils.jobsite.dashboard.invalidate();
      setJobName("");
      setJobAddress("");
    },
    onError: (e) => setStatus(e.message),
  });
  const invite = trpc.jobsite.inviteMember.useMutation({
    onSuccess: () => {
      void utils.jobsite.listMembers.invalidate();
      setInviteEmail("");
    },
    onError: (e) => setStatus(e.message),
  });
  const clockIn = trpc.jobsite.clockIn.useMutation({
    onSuccess: (p) => {
      void utils.jobsite.listRoster.invalidate();
      setStatus(p.flagged ? `Clocked in — flagged: ${p.flagReason}` : "Clocked in.");
    },
    onError: (e) => setStatus(e.message),
  });
  const clockOut = trpc.jobsite.clockOut.useMutation({
    onSuccess: () => {
      void utils.jobsite.listRoster.invalidate();
      setStatus("Clocked out.");
    },
    onError: (e) => setStatus(e.message),
  });
  const createItem = trpc.jobsite.createInventoryItem.useMutation({
    onSuccess: () => {
      void utils.jobsite.listInventory.invalidate();
      setSku("");
      setItemName("");
    },
    onError: (e) => setStatus(e.message),
  });
  const checkout = trpc.jobsite.checkoutToJob.useMutation({
    onSuccess: () => {
      void utils.jobsite.listInventory.invalidate();
      setStatus("Checked out to job.");
    },
    onError: (e) => setStatus(e.message),
  });
  const consume = trpc.jobsite.consumeOnJob.useMutation({
    onSuccess: () => {
      void utils.jobsite.listInventory.invalidate();
      setStatus("Marked used on job.");
    },
    onError: (e) => setStatus(e.message),
  });
  const registerEquip = trpc.jobsite.registerEquipment.useMutation({
    onSuccess: (res) => {
      void utils.jobsite.listEquipment.invalidate();
      setLastToken(res.deviceToken);
      setEquipName("");
      setStatus("Copy the device token now — it is shown once.");
    },
    onError: (e) => setStatus(e.message),
  });
  const addLog = trpc.jobsite.addDailyLog.useMutation({
    onSuccess: () => {
      void utils.jobsite.listDailyLogs.invalidate();
      setCrewNotes("");
      setStatus("Daily log saved.");
    },
    onError: (e) => setStatus(e.message),
  });
  const addPunch = trpc.jobsite.addPunchItem.useMutation({
    onSuccess: () => {
      void utils.jobsite.listPunchList.invalidate();
      setPunchTitle("");
    },
    onError: (e) => setStatus(e.message),
  });
  const completePunch = trpc.jobsite.completePunchItem.useMutation({
    onSuccess: () => void utils.jobsite.listPunchList.invalidate(),
  });
  const addSafety = trpc.jobsite.addSafetyReport.useMutation({
    onSuccess: () => {
      void utils.jobsite.listSafetyReports.invalidate();
      setSafetyNotes("");
      setStatus("Safety report filed.");
    },
    onError: (e) => setStatus(e.message),
  });

  const jobId = selectedJobId ?? jobs.data?.[0]?.id ?? null;
  const myOpen = roster.data?.find((p) => !p.clockOutAt);

  const inputStyle = [
    styles.input,
    { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background },
  ];

  if (context.isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ margin: 24 }} />;
  }

  if (!companyId) {
    return (
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 16 }}>
          Start a jobsite company
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          The office uses the website. The crew uses Clock, Scan, and Job on the phone. Login is
          required. Crew cannot see another company.
        </Text>
        <TextInput
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="Company name"
          placeholderTextColor={colors.muted}
          maxLength={120}
          style={inputStyle}
        />
        <Pressable
          onPress={() => createCompany.mutate({ name: companyName, requireOnSiteToClock: false })}
          disabled={createCompany.isPending || companyName.trim().length < 2}
          style={[styles.btn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.btnText}>Create company</Text>
        </Pressable>
        {createCompany.error ? (
          <Text style={{ color: "#b91c1c" }}>{createCompany.error.message}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["field", "office"] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[
              styles.chip,
              { backgroundColor: mode === m ? colors.primary : colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={{ color: mode === m ? "#fff" : colors.foreground, fontWeight: "700" }}>
              {m === "field" ? "Job site" : "Office"}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ color: colors.muted, fontSize: 12 }}>
        {active?.company.name} · {active?.role.replace("_", " ")}
      </Text>
      {status ? <Text style={{ color: colors.foreground, fontSize: 13 }}>{status}</Text> : null}

      {mode === "field" ? (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(["clock", "scan", "log", "punch", "safety"] as const).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setFieldTab(tab)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: fieldTab === tab ? colors.primary : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={{ color: fieldTab === tab ? "#fff" : colors.foreground, fontWeight: "700", fontSize: 12 }}>
                  {tab === "clock" ? "Clock" : tab === "scan" ? "Scan" : tab === "log" ? "Daily" : tab === "punch" ? "Punch" : "Safety"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: colors.muted, fontSize: 12 }}>Job</Text>
          {(jobs.data ?? []).map((job) => (
            <Pressable key={job.id} onPress={() => setSelectedJobId(job.id)}>
              <Text style={{ color: job.id === jobId ? colors.primary : colors.foreground, fontWeight: "600" }}>
                {job.id === jobId ? "● " : "○ "}
                {job.name} · {job.address}
              </Text>
            </Pressable>
          ))}

          {fieldTab === "clock" && jobId ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {myOpen ? `On the clock since ${new Date(myOpen.clockInAt).toLocaleTimeString()}` : "Not clocked in"}
              </Text>
              <Pressable
                onPress={async () => {
                  const coords = await readBrowserCoords();
                  if (myOpen) {
                    clockOut.mutate({ companyId, lat: coords?.lat, lng: coords?.lng });
                  } else {
                    clockIn.mutate({ companyId, jobId, lat: coords?.lat, lng: coords?.lng });
                  }
                }}
                style={[styles.btn, { backgroundColor: myOpen ? "#b91c1c" : "#059669" }]}
              >
                <Text style={styles.btnText}>{myOpen ? "Clock out" : "Clock in"}</Text>
              </Pressable>
            </View>
          ) : null}

          {fieldTab === "scan" && jobId ? (
            <View style={{ gap: 8 }}>
              {(inventory.data ?? []).map((item) => (
                <Pressable key={item.id} onPress={() => setSelectedItemId(item.id)}>
                  <Text style={{ color: item.id === selectedItemId ? colors.primary : colors.foreground }}>
                    {item.sku} {item.name} · yard {item.qtyYard} · truck {item.qtyTruck} · job{" "}
                    {item.qtyByJob[jobId] ?? 0}
                  </Text>
                </Pressable>
              ))}
              <TextInput
                value={checkoutQty}
                onChangeText={setCheckoutQty}
                keyboardType="number-pad"
                maxLength={5}
                style={inputStyle}
              />
              <Pressable
                onPress={() =>
                  selectedItemId &&
                  checkout.mutate({
                    companyId,
                    itemId: selectedItemId,
                    jobId,
                    source: "yard",
                    quantity: Number(checkoutQty) || 1,
                  })
                }
                style={[styles.btn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.btnText}>Check out from yard</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  selectedItemId &&
                  consume.mutate({
                    companyId,
                    itemId: selectedItemId,
                    jobId,
                    quantity: Number(checkoutQty) || 1,
                  })
                }
                style={[styles.btn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
              >
                <Text style={[styles.btnText, { color: colors.foreground }]}>Mark used on job</Text>
              </Pressable>
            </View>
          ) : null}

          {fieldTab === "log" && jobId ? (
            <View style={{ gap: 8 }}>
              <TextInput value={weather} onChangeText={setWeather} placeholder="Weather" placeholderTextColor={colors.muted} maxLength={200} style={inputStyle} />
              <TextInput
                value={crewNotes}
                onChangeText={setCrewNotes}
                placeholder="What the crew did today"
                placeholderTextColor={colors.muted}
                maxLength={2000}
                multiline
                style={[inputStyle, { minHeight: 80 }]}
              />
              <Pressable
                onPress={() =>
                  addLog.mutate({ companyId, jobId, weather, crewNotes, materials: "", delays: "" })
                }
                style={[styles.btn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.btnText}>Save daily log</Text>
              </Pressable>
            </View>
          ) : null}

          {fieldTab === "punch" && jobId ? (
            <View style={{ gap: 8 }}>
              <TextInput value={punchTitle} onChangeText={setPunchTitle} placeholder="Punch item" placeholderTextColor={colors.muted} maxLength={200} style={inputStyle} />
              <Pressable
                onPress={() => addPunch.mutate({ companyId, jobId, title: punchTitle, locationNote: "" })}
                style={[styles.btn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.btnText}>Add punch item</Text>
              </Pressable>
              {(punchList.data ?? [])
                .filter((i) => i.jobId === jobId)
                .map((i) => (
                  <Pressable
                    key={i.id}
                    onPress={() => i.status === "open" && completePunch.mutate({ companyId, itemId: i.id })}
                  >
                    <Text style={{ color: colors.foreground }}>
                      {i.status === "done" ? "[done] " : "[open] "}
                      {i.title}
                    </Text>
                  </Pressable>
                ))}
            </View>
          ) : null}

          {fieldTab === "safety" && jobId ? (
            <View style={{ gap: 8 }}>
              <TextInput
                value={safetyNotes}
                onChangeText={setSafetyNotes}
                placeholder="Safety notes or incident"
                placeholderTextColor={colors.muted}
                maxLength={2000}
                multiline
                style={[inputStyle, { minHeight: 80 }]}
              />
              <Pressable
                onPress={() =>
                  addSafety.mutate({
                    companyId,
                    jobId,
                    checklist: "Daily site walk",
                    notes: safetyNotes,
                    incident: false,
                  })
                }
                style={[styles.btn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.btnText}>File safety report</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {!isManager ? (
            <Text style={{ color: colors.muted }}>Office tools are for the owner and office managers.</Text>
          ) : (
            <>
              {dashboard.data ? (
                <Text style={{ color: colors.foreground }}>
                  On site {dashboard.data.openPunches} · flagged {dashboard.data.flaggedPunches} · low stock{" "}
                  {dashboard.data.lowStock} · equipment alerts {dashboard.data.equipmentAlerts}
                </Text>
              ) : null}

              <Text style={[styles.h, { color: colors.foreground }]}>New job</Text>
              <TextInput value={jobName} onChangeText={setJobName} placeholder="Job name" placeholderTextColor={colors.muted} maxLength={120} style={inputStyle} />
              <TextInput value={jobAddress} onChangeText={setJobAddress} placeholder="Address" placeholderTextColor={colors.muted} maxLength={200} style={inputStyle} />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput value={jobLat} onChangeText={setJobLat} placeholder="Lat" placeholderTextColor={colors.muted} style={[inputStyle, { flex: 1 }]} />
                <TextInput value={jobLng} onChangeText={setJobLng} placeholder="Lng" placeholderTextColor={colors.muted} style={[inputStyle, { flex: 1 }]} />
              </View>
              <Pressable
                onPress={() =>
                  createJob.mutate({
                    companyId,
                    name: jobName,
                    address: jobAddress,
                    lat: Number(jobLat),
                    lng: Number(jobLng),
                  })
                }
                style={[styles.btn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.btnText}>Create job</Text>
              </Pressable>

              <Text style={[styles.h, { color: colors.foreground }]}>Invite crew</Text>
              <TextInput
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="Email"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                maxLength={320}
                style={inputStyle}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable onPress={() => setInviteRole("crew")} style={[styles.chip, { borderColor: colors.border }]}>
                  <Text style={{ color: colors.foreground }}>{inviteRole === "crew" ? "● crew" : "○ crew"}</Text>
                </Pressable>
                <Pressable onPress={() => setInviteRole("office_manager")} style={[styles.chip, { borderColor: colors.border }]}>
                  <Text style={{ color: colors.foreground }}>
                    {inviteRole === "office_manager" ? "● office" : "○ office"}
                  </Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => invite.mutate({ companyId, email: inviteEmail, role: inviteRole })}
                style={[styles.btn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.btnText}>Send invite</Text>
              </Pressable>
              {(members.data ?? []).map((m) => (
                <Text key={m.id} style={{ color: colors.muted, fontSize: 12 }}>
                  {m.displayName} · {m.role} · {m.status}
                  {m.email ? ` · ${m.email}` : ""}
                </Text>
              ))}

              <Text style={[styles.h, { color: colors.foreground }]}>Who is on site</Text>
              {(roster.data ?? [])
                .filter((p) => !p.clockOutAt)
                .map((p) => (
                  <Text key={p.id} style={{ color: colors.foreground }}>
                    {p.displayName}
                    {p.flagged ? " · flagged" : " · on site stamp"}
                  </Text>
                ))}

              <Text style={[styles.h, { color: colors.foreground }]}>Inventory</Text>
              <TextInput value={sku} onChangeText={setSku} placeholder="SKU" placeholderTextColor={colors.muted} maxLength={40} style={inputStyle} />
              <TextInput value={itemName} onChangeText={setItemName} placeholder="Item name" placeholderTextColor={colors.muted} maxLength={120} style={inputStyle} />
              <TextInput value={qtyYard} onChangeText={setQtyYard} placeholder="Yard qty" placeholderTextColor={colors.muted} keyboardType="number-pad" style={inputStyle} />
              <Pressable
                onPress={() =>
                  createItem.mutate({
                    companyId,
                    sku,
                    name: itemName,
                    unit: "ea",
                    qtyYard: Number(qtyYard) || 0,
                  })
                }
                style={[styles.btn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.btnText}>Add inventory</Text>
              </Pressable>
              {(inventory.data ?? []).map((i) => (
                <Text key={i.id} style={{ color: colors.foreground, fontSize: 12 }}>
                  {i.sku} {i.name} · yard {i.qtyYard} · truck {i.qtyTruck}
                </Text>
              ))}

              <Text style={[styles.h, { color: colors.foreground }]}>Heavy equipment</Text>
              <TextInput value={equipName} onChangeText={setEquipName} placeholder="Machine name" placeholderTextColor={colors.muted} maxLength={120} style={inputStyle} />
              <Pressable
                onPress={() => registerEquip.mutate({ companyId, name: equipName })}
                style={[styles.btn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.btnText}>Register machine</Text>
              </Pressable>
              {lastToken ? (
                <Text selectable style={{ color: colors.foreground, fontSize: 11 }}>
                  Device token (copy now): {lastToken}
                </Text>
              ) : null}
              {(equipment.data ?? []).map((e) => (
                <Text key={e.id} style={{ color: colors.foreground, fontSize: 12 }}>
                  {e.name}
                  {e.lastPing
                    ? ` · ${e.lastPing.lat.toFixed(4)}, ${e.lastPing.lng.toFixed(4)}`
                    : " · no ping yet"}
                  {e.alerts[0] ? ` · ${e.alerts[0].type}` : ""}
                </Text>
              ))}

              <Text style={[styles.h, { color: colors.foreground }]}>Daily logs</Text>
              {(dailyLogs.data ?? []).slice(0, 8).map((l) => (
                <Text key={l.id} style={{ color: colors.muted, fontSize: 12 }}>
                  {l.authorName}: {l.crewNotes}
                </Text>
              ))}
              {(safety.data ?? []).filter((s) => s.incident).length ? (
                <Text style={{ color: "#b91c1c" }}>Incident reports on file — review in the list below.</Text>
              ) : null}
              {(safety.data ?? []).slice(0, 5).map((s) => (
                <Text key={s.id} style={{ color: colors.muted, fontSize: 12 }}>
                  {s.incident ? "INCIDENT · " : ""}
                  {s.authorName}: {s.notes || s.checklist}
                </Text>
              ))}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  btn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  h: { fontWeight: "800", fontSize: 15, marginTop: 6 },
});
