import { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Switch,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import type { PrimitiveType } from "@/lib/workspace-design-types";
import { designLayerSummary, snapValue } from "@/lib/workspace-design-utils";
import { parseStlFile } from "@/lib/stl-utils";
import type { useWorkspaceDesign } from "@/hooks/use-workspace-design";

type DesignApi = ReturnType<typeof useWorkspaceDesign>;

const PRIMITIVES: { type: PrimitiveType; label: string; emoji: string }[] = [
  { type: "box", label: "Box", emoji: "📦" },
  { type: "sphere", label: "Sphere", emoji: "🔮" },
  { type: "cylinder", label: "Cylinder", emoji: "🛢️" },
  { type: "torus", label: "Torus", emoji: "🍩" },
  { type: "plane", label: "Plane", emoji: "⬜" },
];

const COLOR_PRESETS = ["#4a90e2", "#50c878", "#f5a623", "#e94b8b", "#9b59b6", "#ffffff", "#333333"];

export function WorkspaceDesignLayersPanel({
  designApi,
  sessionSaved,
}: {
  designApi: DesignApi;
  sessionSaved: boolean;
}) {
  const colors = useColors();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posX, setPosX] = useState("");
  const [posY, setPosY] = useState("");
  const [posZ, setPosZ] = useState("");

  const {
    design,
    selectedLayerId,
    setSelectedLayerId,
    patchDesign,
    addPrimitive,
    addStl,
    updateLayerById,
    removeLayerById,
    moveLayerById,
    duplicateLayerById,
    isSaving,
  } = designApi;

  const selected = design.layers.find((l) => l.id === selectedLayerId) ?? null;
  const summary = designLayerSummary(design);

  useEffect(() => {
    if (selectedLayerId) syncPosFields(selectedLayerId);
  }, [selectedLayerId, design.layers]);

  const syncPosFields = (layerId: string) => {
    const layer = design.layers.find((l) => l.id === layerId);
    if (!layer) return;
    setPosX(String(layer.transform.position.x));
    setPosY(String(layer.transform.position.y));
    setPosZ(String(layer.transform.position.z));
  };

  const handleSelect = (id: string) => {
    setSelectedLayerId(id);
    syncPosFields(id);
  };

  const handleStlPick = () => {
    if (Platform.OS !== "web") {
      Alert.alert("STL upload", "Open the 3D workspace in a web browser to upload STL files.");
      return;
    }
    fileRef.current?.click();
  };

  const onFileChange = async (e: { target: { files?: FileList | null; value: string } }) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!sessionSaved) {
      Alert.alert("Save session first", "Save your workspace session before uploading STL files.");
      return;
    }
    setUploading(true);
    try {
      const parsed = await parseStlFile(file);
      addStl(parsed);
    } catch (err) {
      Alert.alert("STL upload failed", err instanceof Error ? err.message : "Invalid file");
    } finally {
      setUploading(false);
    }
  };

  const applyPosition = () => {
    if (!selected) return;
    const snap = design.snapEnabled;
    const gx = snap ? snapValue(parseFloat(posX) || 0) : parseFloat(posX) || 0;
    const gy = snap ? snapValue(parseFloat(posY) || 0) : parseFloat(posY) || 0;
    const gz = snap ? snapValue(parseFloat(posZ) || 0) : parseFloat(posZ) || 0;
    updateLayerById(selected.id, {
      transform: {
        ...selected.transform,
        position: { x: gx, y: gy, z: gz },
      },
    });
  };

  return (
    <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>🧱 Design Layers</Text>
        {isSaving ? (
          <Text style={{ color: colors.muted, fontSize: 10 }}>Saving…</Text>
        ) : (
          <Text style={{ color: colors.muted, fontSize: 10 }}>Auto-saved</Text>
        )}
      </View>

      <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 8 }}>
        {summary.totalLayers} layers · {summary.stlLayers} STL · {summary.primitiveLayers} primitives
        {summary.totalTriangles > 0 ? ` · ${summary.totalTriangles.toLocaleString()} triangles` : ""}
      </Text>

      <View style={styles.toggleRow}>
        <Text style={{ color: colors.muted, fontSize: 11 }}>Grid</Text>
        <Switch
          value={design.gridEnabled}
          onValueChange={(v) => patchDesign({ gridEnabled: v })}
        />
        <Text style={{ color: colors.muted, fontSize: 11, marginLeft: 8 }}>Snap</Text>
        <Switch
          value={design.snapEnabled}
          onValueChange={(v) => patchDesign({ snapEnabled: v })}
        />
      </View>

      <Text style={[styles.section, { color: colors.foreground }]}>Add shape</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {PRIMITIVES.map((p) => (
          <Pressable
            key={p.type}
            onPress={() => addPrimitive(p.type)}
            style={[styles.addBtn, { borderColor: colors.border }]}
          >
            <Text>{p.emoji}</Text>
            <Text style={{ color: colors.foreground, fontSize: 10, fontWeight: "600" }}>{p.label}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={handleStlPick}
          disabled={uploading}
          style={[styles.addBtn, { borderColor: colors.primary, backgroundColor: `${colors.primary}12` }]}
        >
          {uploading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <>
              <Text>📁</Text>
              <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "700" }}>Upload STL</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      {Platform.OS === "web" ? (
        // @ts-expect-error hidden file input
        <input
          ref={fileRef}
          type="file"
          accept=".stl,model/stl"
          style={{ display: "none" }}
          onChange={onFileChange}
        />
      ) : null}

      <Text style={[styles.section, { color: colors.foreground, marginTop: 10 }]}>Layers</Text>
      <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
        {[...design.layers].reverse().map((layer) => {
          const isSel = layer.id === selectedLayerId;
          return (
            <Pressable
              key={layer.id}
              onPress={() => handleSelect(layer.id)}
              style={[
                styles.layerRow,
                {
                  borderColor: isSel ? colors.primary : colors.border,
                  backgroundColor: isSel ? `${colors.primary}10` : "transparent",
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
                  {!layer.visible ? "👁‍🗨 " : ""}
                  {layer.locked ? "🔒 " : ""}
                  {layer.kind === "stl" ? "📐 " : "◻ "}
                  {layer.name}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 10 }}>
                  {layer.kind}
                  {layer.stl ? ` · ${layer.stl.triangleCount?.toLocaleString() ?? "?"} tri` : ""}
                </Text>
              </View>
              <View style={[styles.colorDot, { backgroundColor: layer.color }]} />
            </Pressable>
          );
        })}
      </ScrollView>

      {selected ? (
        <View style={[styles.inspector, { borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 13 }}>{selected.name}</Text>
          <TextInput
            value={selected.name}
            onChangeText={(name) => updateLayerById(selected.id, { name })}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />

          <View style={styles.toggleRow}>
            <Text style={{ color: colors.muted, fontSize: 11 }}>Visible</Text>
            <Switch
              value={selected.visible}
              onValueChange={(visible) => updateLayerById(selected.id, { visible })}
            />
            <Text style={{ color: colors.muted, fontSize: 11, marginLeft: 8 }}>Locked</Text>
            <Switch
              value={selected.locked}
              onValueChange={(locked) => updateLayerById(selected.id, { locked })}
            />
          </View>

          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>Color</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {COLOR_PRESETS.map((c) => (
              <Pressable
                key={c}
                onPress={() => updateLayerById(selected.id, { color: c })}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c, borderColor: selected.color === c ? colors.primary : colors.border },
                ]}
              />
            ))}
          </ScrollView>

          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>Position (X Y Z)</Text>
          <View style={styles.posRow}>
            <TextInput
              value={posX}
              onChangeText={setPosX}
              keyboardType="numeric"
              placeholder="X"
              placeholderTextColor={colors.muted}
              style={[styles.posInput, { borderColor: colors.border, color: colors.foreground }]}
            />
            <TextInput
              value={posY}
              onChangeText={setPosY}
              keyboardType="numeric"
              placeholder="Y"
              placeholderTextColor={colors.muted}
              style={[styles.posInput, { borderColor: colors.border, color: colors.foreground }]}
            />
            <TextInput
              value={posZ}
              onChangeText={setPosZ}
              keyboardType="numeric"
              placeholder="Z"
              placeholderTextColor={colors.muted}
              style={[styles.posInput, { borderColor: colors.border, color: colors.foreground }]}
            />
            <Pressable onPress={applyPosition} style={[styles.applyBtn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 11 }}>Apply</Text>
            </Pressable>
          </View>

          <View style={styles.actionRow}>
            <Pressable onPress={() => moveLayerById(selected.id, "up")} style={styles.smallAction}>
              <Text style={{ color: colors.primary, fontSize: 11 }}>↑ Up</Text>
            </Pressable>
            <Pressable onPress={() => moveLayerById(selected.id, "down")} style={styles.smallAction}>
              <Text style={{ color: colors.primary, fontSize: 11 }}>↓ Down</Text>
            </Pressable>
            <Pressable onPress={() => duplicateLayerById(selected.id)} style={styles.smallAction}>
              <Text style={{ color: colors.primary, fontSize: 11 }}>Duplicate</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Alert.alert("Delete layer?", selected.name, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => removeLayerById(selected.id) },
                ]);
              }}
              style={styles.smallAction}
            >
              <Text style={{ color: "#dc2626", fontSize: 11 }}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>
          Select a layer to edit transforms, color, and visibility.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 15, fontWeight: "800" },
  section: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  addBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    gap: 2,
  },
  layerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    gap: 8,
  },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  inspector: { marginTop: 10, borderTopWidth: 1, paddingTop: 10, gap: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13 },
  colorSwatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  posRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  posInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 12,
    minWidth: 48,
  },
  applyBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  smallAction: { paddingVertical: 4 },
});
