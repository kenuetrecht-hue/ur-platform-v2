import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  if (typeof globalThis.btoa === "function") return globalThis.btoa(binary);
  throw new Error("Base64 encoding unavailable.");
}

/** Connect OctoPrint WiFi printers and send G-code for personal merchandise. */
export function EquipmentHubPanel() {
  const colors = useColors();
  const utils = trpc.useUtils();

  const profiles = trpc.equipment.listProfiles.useQuery();
  const connections = trpc.equipment.listConnections.useQuery();

  const [host, setHost] = useState("");
  const [port, setPort] = useState("80");
  const [apiKey, setApiKey] = useState("");
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [gcodeSample, setGcodeSample] = useState("; Sample G-code\nG28\nM104 S200");

  const probe = trpc.equipment.probeOctoPrint.useMutation();
  const connect = trpc.equipment.connect.useMutation({
    onSuccess: () => {
      void utils.equipment.listConnections.invalidate();
      setHost("");
      setApiKey("");
    },
  });
  const disconnect = trpc.equipment.disconnect.useMutation({
    onSuccess: () => void utils.equipment.listConnections.invalidate(),
  });
  const printerStatus = trpc.equipment.printerStatus.useQuery(
    { connectionId: selectedConnection! },
    { enabled: Boolean(selectedConnection), refetchInterval: 10_000 },
  );
  const sendToPrinter = trpc.equipment.sendToPrinter.useMutation({
    onSuccess: () => Alert.alert("Sent", "File uploaded to your printer."),
    onError: (e) => Alert.alert("Upload failed", e.message),
  });

  const activeId = selectedConnection ?? connections.data?.[0]?.id ?? null;

  const handleConnect = async () => {
    if (!host.trim() || !apiKey.trim()) {
      Alert.alert("Missing info", "Enter your printer IP and OctoPrint API key.");
      return;
    }
    try {
      await probe.mutateAsync({
        host: host.trim(),
        port: Number(port) || 80,
        apiKey: apiKey.trim(),
      });
      await connect.mutateAsync({
        equipmentId: "octoprint-custom",
        equipmentName: "My 3D Printer",
        connectivity: "wifi",
        profileId: "prusa-i3-mk3s",
        adapter: "octoprint",
        connectionDetails: {
          host: host.trim(),
          port: Number(port) || 80,
          apiKey: apiKey.trim(),
        },
      });
      Alert.alert("Connected", "Printer linked over WiFi.");
    } catch (e) {
      Alert.alert(
        "Connection failed",
        e instanceof Error ? e.message : "Check IP, API key, and same WiFi network.",
      );
    }
  };

  const handleSendGcode = () => {
    if (!activeId) {
      Alert.alert("No printer", "Connect a printer first.");
      return;
    }
    const base64 = encodeBase64(gcodeSample);
    sendToPrinter.mutate({
      connectionId: activeId,
      fileName: "ur-merchandise.gcode",
      fileContentBase64: base64,
      startPrint: false,
    });
  };

  return (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>🖨️ Print Lab</Text>
      <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 10, lineHeight: 18 }}>
        Connect OctoPrint on your WiFi (Prusa, Ender, Bambu+OctoPrint, etc.). Phone and printer
        must be on the same network.
      </Text>

      <Text style={[styles.label, { color: colors.muted }]}>Printer IP</Text>
      <TextInput
        value={host}
        onChangeText={setHost}
        placeholder="192.168.1.50"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
      />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.muted }]}>Port</Text>
          <TextInput
            value={port}
            onChangeText={setPort}
            keyboardType="number-pad"
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
        </View>
        <View style={{ flex: 2, marginLeft: 8 }}>
          <Text style={[styles.label, { color: colors.muted }]}>OctoPrint API key</Text>
          <TextInput
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="From OctoPrint settings"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            secureTextEntry
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
        </View>
      </View>

      <Pressable
        onPress={handleConnect}
        disabled={connect.isPending || probe.isPending}
        style={[styles.btn, { backgroundColor: colors.primary }]}
      >
        {connect.isPending || probe.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Connect over WiFi</Text>
        )}
      </Pressable>

      {connections.data && connections.data.length > 0 ? (
        <View style={{ marginTop: 12, gap: 8 }}>
          <Text style={[styles.label, { color: colors.foreground }]}>Your printers</Text>
          {connections.data.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setSelectedConnection(c.id)}
              style={[
                styles.connCard,
                {
                  borderColor: activeId === c.id ? colors.primary : colors.border,
                  backgroundColor: activeId === c.id ? `${colors.primary}12` : "transparent",
                },
              ]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "600" }}>{c.equipmentName}</Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>
                {c.connectivity} · {c.status}
              </Text>
              <Pressable
                onPress={() => disconnect.mutate({ connectionId: c.id })}
                style={{ marginTop: 6 }}
              >
                <Text style={{ color: "#dc2626", fontSize: 12, fontWeight: "600" }}>Disconnect</Text>
              </Pressable>
            </Pressable>
          ))}

          {printerStatus.data?.adapter === "octoprint" && printerStatus.data.printer ? (
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              State: {printerStatus.data.printer.state.text}
              {printerStatus.data.job
                ? ` · ${Math.round(printerStatus.data.job.progress.completion)}%`
                : ""}
            </Text>
          ) : null}

          <Text style={[styles.label, { color: colors.muted, marginTop: 8 }]}>G-code preview</Text>
          <TextInput
            value={gcodeSample}
            onChangeText={setGcodeSample}
            multiline
            numberOfLines={4}
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.foreground, minHeight: 72 },
            ]}
          />
          <Pressable
            onPress={handleSendGcode}
            disabled={sendToPrinter.isPending}
            style={[styles.btn, { backgroundColor: "#059669" }]}
          >
            <Text style={styles.btnText}>Send to printer</Text>
          </Pressable>
        </View>
      ) : null}

      {profiles.data && profiles.data.length > 0 ? (
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 10 }}>
          {profiles.data.length} equipment profiles ready (Prusa, Formlabs, Haas CNC, UR robots…)
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  title: { fontSize: 16, fontWeight: "800" },
  label: { fontSize: 11, fontWeight: "600", marginTop: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginTop: 4,
  },
  row: { flexDirection: "row" },
  btn: { borderRadius: 10, padding: 12, alignItems: "center", marginTop: 10 },
  btnText: { color: "#fff", fontWeight: "700" },
  connCard: { borderWidth: 1, borderRadius: 10, padding: 10 },
});
