import { useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { FAIR_SHOW_RULES, type FairShowContentKind } from "@/lib/fair-show";

type WatchTarget = {
  contentId: string;
  kind: FairShowContentKind;
  durationSeconds: number;
  enabled?: boolean;
};

export function useFairShowWatch(target: WatchTarget | null) {
  const { isAuthenticated } = useAuth();
  const heartbeat = trpc.fairShow.heartbeat.useMutation();
  const lastSentAt = useRef(0);
  const lastSeconds = useRef(0);
  const targetRef = useRef(target);
  const authRef = useRef(isAuthenticated);
  const mutateRef = useRef(heartbeat.mutate);
  targetRef.current = target;
  authRef.current = isAuthenticated;
  mutateRef.current = heartbeat.mutate;

  const enabled = Boolean(target && (target.enabled ?? true) && isAuthenticated);

  const pulse = useCallback((secondsWatched: number, completed = false) => {
    const current = targetRef.current;
    if (!authRef.current || !current || current.enabled === false) return;
    const now = Date.now();
    if (!completed && now - lastSentAt.current < FAIR_SHOW_RULES.heartbeatSeconds * 1000) {
      if (secondsWatched <= lastSeconds.current) return;
    }
    lastSentAt.current = now;
    lastSeconds.current = secondsWatched;
    mutateRef.current({
      contentId: current.contentId,
      kind: current.kind,
      secondsWatched,
      durationSeconds: current.durationSeconds,
      completed,
    });
  }, []);

  useEffect(() => {
    lastSentAt.current = 0;
    lastSeconds.current = 0;
  }, [target?.contentId]);

  return { pulse, enabled };
}
