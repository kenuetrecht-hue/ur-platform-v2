import { useEffect, useMemo, useState } from "react";
import type { PublicCartoonProject } from "@/lib/cartoon-studio";
import { useFairShowWatch } from "@/hooks/use-fair-show-watch";
import { canSpeakPageCopy, speakPageCopy, stopPageCopy } from "@/lib/speak-page-copy";

export function useCartoonStudioPlayback(project: PublicCartoonProject, sample = false) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playNonce, setPlayNonce] = useState(0);
  const [speechNote, setSpeechNote] = useState<string | null>(null);
  const scene = project.scenes[index] ?? project.scenes[0];
  const watchedSeconds = useMemo(
    () => project.scenes.slice(0, index).reduce((sum, item) => sum + item.durationSeconds, 0),
    [project.scenes, index],
  );
  const { pulse } = useFairShowWatch({
    contentId: project.id,
    kind: "cartoon",
    durationSeconds: project.totalSeconds,
    enabled: !sample,
  });

  useEffect(() => () => stopPageCopy(), []);

  useEffect(() => {
    if (!playing || !scene) return;
    let cancelled = false;
    void (async () => {
      const minMs = Math.max(800, scene.durationSeconds * 1000);
      if (scene.voiceEnabled && scene.narration.trim()) {
        if (!canSpeakPageCopy()) {
          setSpeechNote("Turn the volume on, then tap Hear Uri again.");
          await wait(minMs);
        } else {
          const spoke = await speakPageCopy(scene.narration);
          if (cancelled) return;
          if (!spoke) {
            setSpeechNote("Uri could not talk on this device. Turn the volume on, then tap Hear Uri again.");
            await wait(minMs);
          }
        }
      } else {
        await wait(minMs);
      }
      if (cancelled) return;
      const nextWatched = watchedSeconds + scene.durationSeconds;
      if (index + 1 < project.scenes.length) {
        pulse(nextWatched);
        setIndex(index + 1);
      } else {
        pulse(nextWatched, true);
        setPlaying(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playing, index, scene, project.scenes.length, watchedSeconds, pulse, playNonce]);

  const hearUri = () => {
    stopPageCopy();
    setSpeechNote(null);
    setIndex(0);
    setPlaying(true);
    setPlayNonce((n) => n + 1);
  };

  const stop = () => {
    stopPageCopy();
    setPlaying(false);
  };

  return {
    index,
    setIndex,
    playing,
    scene,
    speechNote,
    hearUri,
    stop,
    sceneCount: project.scenes.length,
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
