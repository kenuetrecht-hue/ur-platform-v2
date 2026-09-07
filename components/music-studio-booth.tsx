import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { MusicStudioTurntable } from "@/components/music-studio-turntable";
import type { MusicDeckId } from "@/lib/music-studio";

const FADER_STOPS = [0, 25, 50, 75, 100] as const;

type Props = {
  title: string;
  bpm: number;
  playing: boolean;
  metronome: boolean;
  crossfade: number;
  editDeck: MusicDeckId;
  onToggleMetronome: () => void;
  onCrossfade: (value: number) => void;
  onEditDeck: (deck: MusicDeckId) => void;
  onCue: (deck: MusicDeckId) => void;
  onCopyAToB: () => void;
  onSetCueHere: (deck: MusicDeckId) => void;
};

export function MusicStudioBooth({
  title,
  bpm,
  playing,
  metronome,
  crossfade,
  editDeck,
  onToggleMetronome,
  onCrossfade,
  onEditDeck,
  onCue,
  onCopyAToB,
  onSetCueHere,
}: Props) {
  const colors = useColors();

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <View style={{ flex: 1, minWidth: 220 }}>
          <MusicStudioTurntable spinning={playing && crossfade < 90} bpm={bpm} title={`${title} A`} deckName="Deck A" />
        </View>
        <View style={{ flex: 1, minWidth: 220 }}>
          <MusicStudioTurntable spinning={playing && crossfade > 10} bpm={bpm} title={`${title} B`} deckName="Deck B" />
        </View>
      </View>

      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
        Crossfader {crossfade < 15 ? "A" : crossfade > 85 ? "B" : "A / B"}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {FADER_STOPS.map((stop) => {
          const active = crossfade === stop;
          return (
            <Pressable
              key={stop}
              onPress={() => onCrossfade(stop)}
              style={[
                styles.mini,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary : colors.surface,
                },
              ]}
            >
              <Text style={{ color: active ? "#fff" : colors.foreground, fontSize: 12 }}>
                {stop === 0 ? "A" : stop === 100 ? "B" : `${stop}`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Pressable onPress={() => onCue("a")} style={[styles.chip, { borderColor: colors.primary }]}>
          <Text style={{ color: colors.foreground, fontWeight: "800" }}>Cue A</Text>
        </Pressable>
        <Pressable onPress={() => onCue("b")} style={[styles.chip, { borderColor: colors.primary }]}>
          <Text style={{ color: colors.foreground, fontWeight: "800" }}>Cue B</Text>
        </Pressable>
        <Pressable
          onPress={onToggleMetronome}
          style={[
            styles.chip,
            {
              borderColor: metronome ? colors.primary : colors.border,
              backgroundColor: metronome ? colors.primary : colors.surface,
            },
          ]}
        >
          <Text style={{ color: metronome ? "#fff" : colors.foreground, fontWeight: "700" }}>
            {metronome ? "Metronome on" : "Metronome"}
          </Text>
        </Pressable>
        <Pressable onPress={onCopyAToB} style={[styles.chip, { borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>Copy A → B</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <Text style={{ color: colors.muted, fontWeight: "700" }}>Edit grid</Text>
        {(["a", "b"] as const).map((deck) => {
          const active = editDeck === deck;
          return (
            <Pressable
              key={deck}
              onPress={() => onEditDeck(deck)}
              style={[
                styles.mini,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary : colors.surface,
                },
              ]}
            >
              <Text style={{ color: active ? "#fff" : colors.foreground, fontSize: 12 }}>
                Deck {deck.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
        <Pressable onPress={() => onSetCueHere(editDeck)} style={[styles.mini, { borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontSize: 12 }}>Set cue here</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  mini: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
});
