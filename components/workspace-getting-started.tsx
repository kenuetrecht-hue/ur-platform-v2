import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { WorkspaceTapButton } from "@/components/workspace-tap-button";
import type { CadCameraView, CadDrawTool } from "@/lib/workspace-cad";
import type { DesignLayer } from "@/lib/workspace-design-types";
import {
  WORKSPACE_COACH_STEPS,
  WORKSPACE_COACH_STORAGE_KEY,
  WORKSPACE_FIRST_SESSION_BLURB,
  nextWorkspaceCoachStep,
  type WorkspaceCoachStepId,
} from "@/lib/workspace-first-steps";

export function WorkspaceGettingStarted({
  layers,
  cameraView,
  drawTool,
  hasPendingStart,
  drewSegment,
  onShowRoom,
  onLookFromAbove,
  onStartWall,
}: {
  layers: readonly Pick<DesignLayer, "role" | "cad">[];
  cameraView: CadCameraView;
  drawTool: CadDrawTool;
  hasPendingStart: boolean;
  drewSegment: boolean;
  onShowRoom: () => void;
  onLookFromAbove: () => void;
  onStartWall: () => void;
}) {
  const colors = useColors();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    setHidden(localStorage.getItem(WORKSPACE_COACH_STORAGE_KEY) === "1");
  }, []);

  const persistHidden = (value: boolean) => {
    setHidden(value);
    if (typeof localStorage === "undefined") return;
    if (value) localStorage.setItem(WORKSPACE_COACH_STORAGE_KEY, "1");
    else localStorage.removeItem(WORKSPACE_COACH_STORAGE_KEY);
  };

  const current = nextWorkspaceCoachStep({
    layers,
    cameraView,
    drawTool,
    drewSegment,
  });

  if (hidden) {
    return (
      <View style={styles.compactWrap}>
        <WorkspaceTapButton onPress={() => persistHidden(false)}>
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>
            Need a walkthrough?
          </Text>
        </WorkspaceTapButton>
      </View>
    );
  }

  const runStep = (id: WorkspaceCoachStepId) => {
    if (id === "room") onShowRoom();
    if (id === "plan") onLookFromAbove();
    if (id === "wall" || id === "draw") onStartWall();
  };

  return (
    <View style={[styles.panel, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>Start here — you are not behind</Text>
        <WorkspaceTapButton onPress={() => persistHidden(true)}>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700" }}>Hide</Text>
        </WorkspaceTapButton>
      </View>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 10 }}>
        {WORKSPACE_FIRST_SESSION_BLURB}
      </Text>
      {Platform.OS !== "web" ? (
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 10 }}>
          The drawing table itself opens in a web browser. The buttons below still set up the room.
        </Text>
      ) : null}

      {WORKSPACE_COACH_STEPS.map((step) => {
        const done =
          (step.id === "room" && current !== "room") ||
          (step.id === "plan" && (current === "wall" || current === "draw" || current === "done")) ||
          (step.id === "wall" && (current === "draw" || current === "done")) ||
          (step.id === "draw" && current === "done");
        const active = current === step.id;
        return (
          <View
            key={step.id}
            style={[
              styles.step,
              {
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? `${colors.primary}14` : "transparent",
              },
            ]}
          >
            <Text style={{ color: done ? colors.primary : colors.foreground, fontWeight: "800", fontSize: 12 }}>
              {done ? "✓" : step.n}. {step.title}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 }}>{step.detail}</Text>
            {active && step.id !== "draw" ? (
              <WorkspaceTapButton
                onPress={() => runStep(step.id)}
                style={[styles.action, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>{step.actionLabel}</Text>
              </WorkspaceTapButton>
            ) : null}
            {active && step.id === "draw" ? (
              <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12, marginTop: 8 }}>
                {hasPendingStart
                  ? "First click is in. Click once more for the other end of the wall."
                  : "Click the grid below, twice."}
              </Text>
            ) : null}
          </View>
        );
      })}

      {current === "done" ? (
        <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700", marginTop: 8 }}>
          That wall is on the drawing. Switch back to Select when you want to pick pieces instead of drawing.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  compactWrap: { paddingHorizontal: 16 },
  panel: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "800", flex: 1 },
  step: { borderWidth: 1, borderRadius: 12, padding: 10 },
  action: { marginTop: 8, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: "center" },
});
