import { useRef, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { WorkspaceTapButton } from "@/components/workspace-tap-button";
import type { useWorkspaceDesign } from "@/hooks/use-workspace-design";
import type { WorkspaceDesignState } from "@/lib/workspace-design-types";
import {
  WORKSPACE_GRAVITY_FT_S2,
  WORKSPACE_PHYSICS_ENGINES,
  stepWorkspacePhysics,
  type WorkspacePhysicsEngineId,
} from "@/lib/workspace-physics";

type DesignApi = ReturnType<typeof useWorkspaceDesign>;

export function WorkspacePhysicsPanel({ designApi }: { designApi: DesignApi }) {
  const colors = useColors();
  const { design, addBuildKit, applyPhysicsPositionsToDesign, loadDesign } = designApi;
  const snapshot = useRef<WorkspaceDesignState | null>(null);
  const [engine, setEngine] = useState<WorkspacePhysicsEngineId>("rapier");
  const [running, setRunning] = useState(false);
  const [lastNote, setLastNote] = useState<string | null>(null);

  const runSim = async () => {
    snapshot.current = JSON.parse(JSON.stringify(design)) as WorkspaceDesignState;
    setRunning(true);
    setLastNote(null);
    try {
      const result = await stepWorkspacePhysics({ engine, layers: design.layers });
      applyPhysicsPositionsToDesign(result.positions);
      const label = WORKSPACE_PHYSICS_ENGINES.find((e) => e.id === engine)?.label ?? engine;
      setLastNote(`${label} · ${result.steps} steps @ 60 Hz · g = ${WORKSPACE_GRAVITY_FT_S2} ft/s²`);
    } catch (err) {
      setLastNote(err instanceof Error ? err.message : "Physics failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Physics · Rapier & Cannon.js</Text>
      <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 8 }}>
        CAD drawing stays frozen. Play drops dynamic pieces (probes, robot bases) onto walls and slabs.
        1 unit = 1 foot. Not a certified structural analysis.
      </Text>

      <View style={styles.row}>
        {WORKSPACE_PHYSICS_ENGINES.map((e) => (
          <WorkspaceTapButton
            key={e.id}
            onPress={() => setEngine(e.id)}
            style={[
              styles.chip,
              {
                borderColor: engine === e.id ? colors.primary : colors.border,
                backgroundColor: engine === e.id ? `${colors.primary}18` : "transparent",
              },
            ]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>{e.label}</Text>
          </WorkspaceTapButton>
        ))}
      </View>

      <View style={styles.row}>
        <WorkspaceTapButton
          onPress={() => void runSim()}
          disabled={running}
          style={[styles.btn, { backgroundColor: colors.primary }]}
        >
          {running ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnText}>Play 3 s</Text>
          )}
        </WorkspaceTapButton>
        <WorkspaceTapButton
          onPress={() => {
            if (snapshot.current) loadDesign(snapshot.current);
            setLastNote("Reset to pre-sim pose");
          }}
          style={[styles.btn, { borderWidth: 1, borderColor: colors.border }]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>Reset</Text>
        </WorkspaceTapButton>
        <WorkspaceTapButton
          onPress={() => addBuildKit("physics_probe")}
          style={[styles.btn, { borderWidth: 1, borderColor: colors.border }]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>+ Drop ball</Text>
        </WorkspaceTapButton>
      </View>

      {lastNote ? (
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8 }}>{lastNote}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 14 },
  title: { fontSize: 15, fontWeight: "800", marginBottom: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  btn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, minWidth: 88, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
