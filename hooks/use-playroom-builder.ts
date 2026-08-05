import { useCallback, useRef, useState } from "react";
import type { WorkspaceDesignState } from "@/lib/workspace-design-types";
import { addLayer } from "@/lib/workspace-design-utils";
import {
  getPlayroomPlan,
  playroomStartState,
  type PlayroomPlanId,
} from "@/lib/workspace-playroom-plans";
import type { useWorkspaceDesign } from "@/hooks/use-workspace-design";

type DesignApi = Pick<
  ReturnType<typeof useWorkspaceDesign>,
  "loadDesign" | "flushSave" | "setSelectedLayerId"
>;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Runs AI playroom build plans step-by-step into the 3D canvas. */
export function usePlayroomBuilder(designApi: DesignApi) {
  const [building, setBuilding] = useState(false);
  const [planId, setPlanId] = useState<PlayroomPlanId | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [plannerMsg, setPlannerMsg] = useState("");
  const [builderMsg, setBuilderMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const cancelRef = useRef(false);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    setBuilding(false);
  }, []);

  const runPlan = useCallback(
    async (id: PlayroomPlanId) => {
      if (building) return;
      cancelRef.current = false;
      const plan = getPlayroomPlan(id);
      setPlanId(id);
      setBuilding(true);
      setStepIndex(0);
      setProgress(0);

      let state: WorkspaceDesignState = playroomStartState();
      designApi.loadDesign(state);

      const totalSteps = plan.steps.length;
      for (let i = 0; i < totalSteps; i++) {
        if (cancelRef.current) break;
        const step = plan.steps[i]!;
        setStepIndex(i + 1);
        setProgress(Math.round(((i + 0.3) / totalSteps) * 100));
        setPlannerMsg(step.aiPlanner);
        setBuilderMsg("…");
        await delay(step.pauseMs * 0.4);
        if (cancelRef.current) break;

        setBuilderMsg(step.aiBuilder);
        for (const layer of step.layers) {
          if (cancelRef.current) break;
          state = addLayer(state, layer);
          designApi.loadDesign({ ...state });
          designApi.setSelectedLayerId(layer.id);
          await delay(320);
        }
        setProgress(Math.round(((i + 1) / totalSteps) * 100));
        await delay(200);
      }

      if (!cancelRef.current) {
        setPlannerMsg("✅ All AIs done! Explore the scene — rotate, zoom, edit layers.");
        setBuilderMsg(`Built ${state.layers.length} parts. What a masterpiece!`);
        await designApi.flushSave();
      }

      setBuilding(false);
    },
    [building, designApi],
  );

  const runAll = useCallback(async () => {
    const order: PlayroomPlanId[] = ["eieio_farm", "house_with_eyes", "car"];
    for (const id of order) {
      if (cancelRef.current) break;
      await runPlan(id);
      await delay(1200);
    }
  }, [runPlan]);

  return {
    building,
    planId,
    stepIndex,
    plannerMsg,
    builderMsg,
    progress,
    runPlan,
    runAll,
    cancel,
  };
}
