import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  MUSIC_HOOKUPS,
  MUSIC_USER_STARTS_REMINDER,
  bluetoothPairHelp,
  downloadMusicMidi,
  downloadUsbDeckPack,
  listUserAudioInputs,
  listUserMidiOutputs,
  pingUserMidiOutput,
  printMusicLeadSheet,
  type AudioInputInfo,
  type MidiPortInfo,
} from "@/lib/music-studio-hookups";
import type { MusicKeyId, MusicKitId, MusicPattern } from "@/lib/music-studio";

type Props = {
  title: string;
  bpm: number;
  keyName: MusicKeyId;
  kit: MusicKitId;
  lyrics: string;
  pattern: MusicPattern;
};

export function MusicStudioHookups({ title, bpm, keyName, kit, lyrics, pattern }: Props) {
  const colors = useColors();
  const [note, setNote] = useState<string | null>(null);
  const [ports, setPorts] = useState<MidiPortInfo[]>([]);
  const [inputs, setInputs] = useState<AudioInputInfo[]>([]);

  const printChart = () => {
    const result = printMusicLeadSheet({ title, bpm, key: keyName, kit, lyrics });
    setNote(result.detail);
  };

  const saveMidi = () => {
    const result = downloadMusicMidi(pattern, bpm, title);
    setNote(result.detail);
  };

  const connectMidi = async () => {
    const listed = await listUserMidiOutputs();
    setPorts(listed.ports);
    setNote(listed.detail);
    if (listed.ok && listed.ports.length) {
      const ping = await pingUserMidiOutput(listed.ports[0]?.id);
      setNote(ping.detail);
    }
  };

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.foreground, fontWeight: "800" }}>Studio hookups</Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
        Same rule as printers and CAD: we hand you a file or an OS dialog. {MUSIC_USER_STARTS_REMINDER}
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Pressable onPress={printChart} style={[styles.chip, { borderColor: colors.primary }]}>
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>Print lead sheet</Text>
        </Pressable>
        <Pressable onPress={saveMidi} style={[styles.chip, { borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>Download MIDI</Text>
        </Pressable>
        <Pressable onPress={() => void connectMidi()} style={[styles.chip, { borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>Connect MIDI</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            const result = downloadUsbDeckPack(pattern, bpm, title, { key: keyName, kit });
            setNote(result.detail);
          }}
          style={[styles.chip, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>USB deck pack</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            const result = bluetoothPairHelp();
            setNote(result.detail);
          }}
          style={[styles.chip, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>Bluetooth help</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void listUserAudioInputs().then((result) => {
              setInputs(result.devices);
              setNote(result.detail);
            });
          }}
          style={[styles.chip, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>Pick audio in</Text>
        </Pressable>
      </View>

      {ports.length ? (
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Allowed MIDI: {ports.map((port) => port.name).join(" · ")}
        </Text>
      ) : null}
      {inputs.length ? (
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Allowed inputs: {inputs.map((device) => device.label).join(" · ")}
        </Text>
      ) : null}

      {MUSIC_HOOKUPS.map((hook) => (
        <Text key={hook.id} style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
          {hook.status === "now" ? "Now" : "Later"} · {hook.label}: {hook.how}
        </Text>
      ))}

      {note ? <Text style={{ color: colors.foreground, fontSize: 12 }}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
});
