/**
 * One AI voice at a time. Stops the previous clip (and browser TTS)
 * so Hear never stacks or echoes into the microphone.
 */

let current: HTMLAudioElement | null = null;
let endedHandler: (() => void) | null = null;
let revokeCurrent: (() => void) | null = null;

function playableSrc(url: string): { src: string; revoke: () => void } {
  if (!url.startsWith("data:")) {
    return { src: url, revoke: () => undefined };
  }
  const comma = url.indexOf(",");
  if (comma < 0) {
    return { src: url, revoke: () => undefined };
  }
  const header = url.slice(5, comma);
  const mime = header.split(";")[0] || "audio/mpeg";
  const payload = url.slice(comma + 1);
  const bytes = header.includes("base64")
    ? Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(payload));
  const objectUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
  return { src: objectUrl, revoke: () => URL.revokeObjectURL(objectUrl) };
}

/** Call from a tap/Send so later Hear / auto-speak is not blocked by the browser. */
export function unlockWebAudio(): void {
  if (typeof window === "undefined") return;
  try {
    const silent = new window.Audio(
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=",
    );
    silent.volume = 0.01;
    void silent.play().then(() => {
      silent.pause();
      silent.src = "";
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

export function stopExclusiveAudio(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  if (!current) return;
  if (endedHandler) {
    current.removeEventListener("ended", endedHandler);
    endedHandler = null;
  }
  current.pause();
  current.src = "";
  current = null;
  revokeCurrent?.();
  revokeCurrent = null;
}

export function isExclusiveAudioPlaying(): boolean {
  return Boolean(current && !current.paused && !current.ended);
}

export async function playExclusiveAudio(url: string): Promise<void> {
  stopExclusiveAudio();
  if (typeof window === "undefined" || !url) return;

  const playable = playableSrc(url);
  revokeCurrent = playable.revoke;
  const audio = new window.Audio(playable.src);
  current = audio;
  const done = new Promise<void>((resolve, reject) => {
    endedHandler = () => {
      if (current === audio) current = null;
      endedHandler = null;
      playable.revoke();
      if (revokeCurrent === playable.revoke) revokeCurrent = null;
      resolve();
    };
    audio.addEventListener("ended", endedHandler);
    audio.addEventListener("error", () => {
      reject(new Error("Audio would not play"));
    });
  });

  try {
    await audio.play();
  } catch (error) {
    stopExclusiveAudio();
    if (error instanceof Error && error.name === "AbortError") return;
    throw error;
  }

  await done;
}
