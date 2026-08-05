import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const BLUEPRINT_AI_ID = "ai-blueprint-reader-001";

/** Upload/describe schematics for Blueprint Reader AI analysis. */
export function BlueprintReaderPanel({ compact }: { compact?: boolean }) {
  const colors = useColors();
  const router = useRouter();
  const types = trpc.blueprintReader.supportedTypes.useQuery();
  const analyze = trpc.blueprintReader.analyze.useMutation();
  const [description, setDescription] = useState("");
  const [fileName, setFileName] = useState("");

  const handleAnalyze = () => {
    if (description.trim().length < 10) return;
    analyze.mutate({
      description: description.trim(),
      fileName: fileName.trim() || undefined,
    });
  };

  const result = analyze.data;

  return (
    <View
      style={[
        styles.panel,
        {
          borderColor: colors.primary,
          backgroundColor: compact ? colors.surface : `${colors.primary}08`,
          marginHorizontal: compact ? 0 : 16,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={{ fontSize: compact ? 20 : 24 }}>📐</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Blueprint Reader AI</Text>
          <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
            Any schematic — architectural, electrical, P&ID, PCB, HVAC, structural, automotive, robotics…
          </Text>
        </View>
      </View>

      {!compact && types.data ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
          {types.data.types.slice(0, 8).map((t) => (
            <View key={t.id} style={[styles.typeChip, { borderColor: colors.border }]}>
              <Text>{t.emoji}</Text>
              <Text style={{ color: colors.muted, fontSize: 9 }}>{t.label.split(" ")[0]}</Text>
            </View>
          ))}
          <View style={[styles.typeChip, { borderColor: colors.primary }]}>
            <Text>+7</Text>
            <Text style={{ color: colors.primary, fontSize: 9 }}>more</Text>
          </View>
        </ScrollView>
      ) : null}

      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Describe your drawing (e.g. '2nd floor electrical one-line, panel A, 200A service…')"
        placeholderTextColor={colors.muted}
        multiline
        numberOfLines={compact ? 3 : 4}
        style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
      />
      {Platform.OS === "web" ? (
        <TextInput
          value={fileName}
          onChangeText={setFileName}
          placeholder="Optional: filename.pdf or sheet name"
          placeholderTextColor={colors.muted}
          style={[styles.fileInput, { borderColor: colors.border, color: colors.foreground }]}
        />
      ) : null}

      <View style={styles.row}>
        <Pressable
          onPress={handleAnalyze}
          disabled={analyze.isPending || description.trim().length < 10}
          style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }]}
        >
          {analyze.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Analyze schematic</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(tabs)/ais",
              params: { ai: BLUEPRINT_AI_ID },
            })
          }
          style={[styles.btn, { borderColor: colors.primary, borderWidth: 1 }]}
        >
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>Chat</Text>
        </Pressable>
      </View>

      {result ? (
        <View style={[styles.result, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.foreground, fontWeight: "800" }}>
            {result.typeLabel} · {Math.round(result.confidence * 100)}% match
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 }}>
            {result.summary.replace(/\*\*/g, "")}
          </Text>
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12, marginTop: 10 }}>
            Reading checklist
          </Text>
          {result.readingChecklist.slice(0, 3).map((item) => (
            <Text key={item} style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
              • {item}
            </Text>
          ))}
          {result.industryTrends.length > 0 ? (
            <>
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12, marginTop: 10 }}>
                Industry trends
              </Text>
              {result.industryTrends.slice(0, 2).map((t) => (
                <Text key={t.title} style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
                  📈 {t.title}: {t.summary}
                </Text>
              ))}
            </>
          ) : null}
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(tabs)/ais",
                params: { ai: BLUEPRINT_AI_ID, learn: "1" },
              })
            }
            style={{ marginTop: 10 }}
          >
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>
              Open Learn mode for full blueprint academy →
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 14, borderWidth: 1.5, padding: 14, gap: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 16, fontWeight: "800" },
  typeChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    marginRight: 6,
    gap: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: "top",
  },
  fileInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
  },
  row: { flexDirection: "row", gap: 8 },
  btn: { borderRadius: 10, padding: 12, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
  result: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 4 },
});
