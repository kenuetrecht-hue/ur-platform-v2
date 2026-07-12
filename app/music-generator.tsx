import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { router } from "expo-router";


interface CompositionConfig {
  title: string;
  genre: string;
  mood: string;
  tempo: number;
  duration: number;
  instruments: string[];
}

const GENRES = ["pop", "rock", "jazz", "classical", "electronic", "ambient", "hip-hop", "folk"];
const MOODS = ["happy", "sad", "energetic", "calm", "dramatic", "mysterious", "romantic"];
const INSTRUMENTS = [
  "piano",
  "guitar",
  "violin",
  "drums",
  "bass",
  "synth",
  "flute",
  "trumpet",
  "cello",
];

const PRESETS = {
  upbeat_pop: {
    genre: "pop",
    mood: "happy",
    tempo: 120,
    instruments: ["synth", "drums", "bass"],
    label: "Upbeat Pop",
  },
  calm_ambient: {
    genre: "ambient",
    mood: "calm",
    tempo: 60,
    instruments: ["piano", "strings"],
    label: "Calm Ambient",
  },
  energetic_rock: {
    genre: "rock",
    mood: "energetic",
    tempo: 140,
    instruments: ["guitar", "drums", "bass"],
    label: "Energetic Rock",
  },
  dramatic_orchestral: {
    genre: "classical",
    mood: "dramatic",
    tempo: 100,
    instruments: ["strings", "brass"],
    label: "Dramatic Orchestral",
  },
};

export default function MusicGenerator() {
  const colors = useColors();
  const [config, setConfig] = useState<CompositionConfig>({
    title: "My Composition",
    genre: "pop",
    mood: "happy",
    tempo: 120,
    duration: 120,
    instruments: ["synth", "drums", "bass"],
  });

  const [generating, setGenerating] = useState(false);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showInstrumentModal, setShowInstrumentModal] = useState(false);

  const handleGenerateMusic = useCallback(async () => {
    setGenerating(true);
    // Simulate generation
    setTimeout(() => {
      setGenerating(false);
      // Navigate to player or show success
            // Navigate to player or show success
      // router.push("/music-player");
    }, 3000);
  }, []);

  const handleApplyPreset = (preset: any) => {
    setConfig({
      ...config,
      genre: preset.genre,
      mood: preset.mood,
      tempo: preset.tempo,
      instruments: preset.instruments,
    });
  };

  const toggleInstrument = (instrument: string) => {
    setConfig((prev) => ({
      ...prev,
      instruments: prev.instruments.includes(instrument)
        ? prev.instruments.filter((i) => i !== instrument)
        : [...prev.instruments, instrument],
    }));
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700" }}>
            🎵 Music Generator
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Presets */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16, gap: 12 }}>
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
            Quick Presets
          </Text>
          <FlatList
            scrollEnabled={true}
            data={Object.entries(PRESETS)}
            keyExtractor={([key]) => key}
            renderItem={({ item: [key, preset] }) => (
              <Pressable
                onPress={() => handleApplyPreset(preset)}
                style={({ pressed }) => ({
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                })}
              >
                <View>
                  <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
                    {preset.label}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                    {preset.tempo} BPM • {preset.genre}
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.muted} />
              </Pressable>
            )}
          />
        </View>

        {/* Title Input */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
            Composition Title
          </Text>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 14 }}>{config.title}</Text>
          </View>
        </View>

        {/* Genre Selection */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
            Genre
          </Text>
          <Pressable
            onPress={() => setShowGenreModal(true)}
            style={({ pressed }) => ({
              backgroundColor: colors.surface,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "500" }}>
              {config.genre.charAt(0).toUpperCase() + config.genre.slice(1)}
            </Text>
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </Pressable>
        </View>

        {/* Mood Selection */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
            Mood
          </Text>
          <Pressable
            onPress={() => setShowMoodModal(true)}
            style={({ pressed }) => ({
              backgroundColor: colors.surface,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "500" }}>
              {config.mood.charAt(0).toUpperCase() + config.mood.slice(1)}
            </Text>
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </Pressable>
        </View>

        {/* Tempo Slider */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
              Tempo
            </Text>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "700" }}>
              {config.tempo} BPM
            </Text>
          </View>
          <View
            style={{
              height: 40,
              backgroundColor: colors.surface,
              borderRadius: 8,
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                height: 4,
                backgroundColor: colors.primary,
                borderRadius: 2,
                width: `${((config.tempo - 40) / 200) * 100}%`,
              }}
            />
          </View>
        </View>

        {/* Duration Slider */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
              Duration
            </Text>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "700" }}>
              {Math.floor(config.duration / 60)}:{String(config.duration % 60).padStart(2, "0")}
            </Text>
          </View>
          <View
            style={{
              height: 40,
              backgroundColor: colors.surface,
              borderRadius: 8,
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                height: 4,
                backgroundColor: colors.primary,
                borderRadius: 2,
                width: `${((config.duration - 15) / 585) * 100}%`,
              }}
            />
          </View>
        </View>

        {/* Instruments Selection */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
              Instruments
            </Text>
            <Pressable
              onPress={() => setShowInstrumentModal(true)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <IconSymbol name="plus.circle" size={24} color={colors.primary} />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {config.instruments.map((instrument) => (
              <View
                key={instrument}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}>
                  {instrument}
                </Text>
                <Pressable onPress={() => toggleInstrument(instrument)}>
                  <IconSymbol name="xmark.circle.fill" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Generate Button */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 20 }}>
          <Pressable
            onPress={handleGenerateMusic}
            disabled={generating}
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            {generating ? (
              <ActivityIndicator color="#FFFFFF" size="large" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
                🎵 Generate Music
              </Text>
            )}
          </Pressable>
          <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center", marginTop: 12 }}>
            ⚠️ AI-Generated Music: For entertainment and educational purposes only
          </Text>
        </View>
      </ScrollView>

      {/* Genre Modal */}
      <Modal visible={showGenreModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: "80%",
            }}
          >
            <FlatList
              data={GENRES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setConfig({ ...config, genre: item });
                    setShowGenreModal(false);
                  }}
                  style={({ pressed }) => ({
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    backgroundColor: config.genre === item ? colors.primary + "20" : "transparent",
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text
                    style={{
                      color:
                        config.genre === item ? colors.primary : colors.foreground,
                      fontSize: 16,
                      fontWeight: config.genre === item ? "700" : "500",
                    }}
                  >
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Mood Modal */}
      <Modal visible={showMoodModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: "80%",
            }}
          >
            <FlatList
              data={MOODS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setConfig({ ...config, mood: item });
                    setShowMoodModal(false);
                  }}
                  style={({ pressed }) => ({
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    backgroundColor: config.mood === item ? colors.primary + "20" : "transparent",
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: config.mood === item ? colors.primary : colors.foreground,
                      fontSize: 16,
                      fontWeight: config.mood === item ? "700" : "500",
                    }}
                  >
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Instrument Modal */}
      <Modal visible={showInstrumentModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: "80%",
            }}
          >
            <FlatList
              data={INSTRUMENTS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => toggleInstrument(item)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    backgroundColor: config.instruments.includes(item)
                      ? colors.primary + "20"
                      : "transparent",
                    opacity: pressed ? 0.8 : 1,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  })}
                >
                  <Text
                    style={{
                      color: config.instruments.includes(item)
                        ? colors.primary
                        : colors.foreground,
                      fontSize: 16,
                      fontWeight: config.instruments.includes(item) ? "700" : "500",
                    }}
                  >
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </Text>
                  {config.instruments.includes(item) && (
                    <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
                  )}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
