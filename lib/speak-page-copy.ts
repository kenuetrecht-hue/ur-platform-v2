/**
 * Speak signup / ID-check copy out loud.
 * Uri talks in short breaths, with contractions, on the warmest English
 * voice the phone or browser will give us.
 */

let speakGeneration = 0;

function isNativeApp(): boolean {
  return typeof navigator !== "undefined" && navigator.product === "ReactNative";
}

export function canSpeakPageCopy(): boolean {
  if (isNativeApp()) return true;
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopPageCopy(): void {
  speakGeneration += 1;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  if (isNativeApp()) {
    void import("expo-speech").then((Speech) => Speech.stop()).catch(() => undefined);
  }
}

type ScoredVoice = {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
  quality?: string;
  identifier?: string;
};

/** Higher score = closer to a human-sounding English voice. */
export function scoreSpeechVoice(voice: ScoredVoice): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  if (!lang.startsWith("en")) return -100;

  let score = 4;
  if (/en-us/.test(lang)) score += 5;
  if (/en-gb|en-au|en-ie/.test(lang)) score += 2;
  if (/enhanced/i.test(voice.quality ?? "")) score += 16;

  if (/neural|natural|online \(natural\)|enhanced|premium|multilingual|superstar/.test(name)) {
    score += 24;
  }
  // Warm everyday voices — Uri should sound like a guy next door, not a newsreader.
  if (/aaron|daniel|andrew|tom|nicky|samantha|moira|karen/.test(name)) score += 24;
  if (/alex|fred|susan|victoria|siri|ryan|brian/.test(name)) score += 16;
  if (/aria|jenny|guy|sara|sonia|emma|ava|davis/.test(name)) score += 12;
  if (/samsung/.test(name) && /english/.test(name)) score += 10;

  if (voice.localService && !/desktop|compact|espeak/.test(name)) score += 2;
  if (voice.default) score += 1;

  if (/desktop|compact|espeak|google us english|google uk english/.test(name)) score -= 20;
  if (/whisper|novelty|bad news|good news|bells|boing|bubbles|cellos|zarvox|trinoids|albert|ralph/.test(name)) {
    score -= 40;
  }
  return score;
}

export function pickHumanSpeechVoice<T extends ScoredVoice>(voices: T[]): T | undefined {
  if (voices.length === 0) return undefined;
  return [...voices].sort((a, b) => scoreSpeechVoice(b) - scoreSpeechVoice(a))[0];
}

/** Make abbreviations and stiff lines speak the way a person would. */
export function prepareSpeechForHumanVoice(text: string): string {
  return text
    .replace(/\bI understand fully you do not want to do this\./gi, "Look, I get it. You don't want to do this.")
    .replace(/\bUR does not keep\b/gi, "We don't keep")
    .replace(/\bUR\b/g, "this app")
    .replace(/\b18\+/g, "eighteen plus")
    .replace(/\bIDs\b/g, "I.D.s")
    .replace(/\bID\b/g, "I.D.")
    .replace(/\bThat is\b/g, "That's")
    .replace(/\bWe are\b/g, "We're")
    .replace(/\bdo not\b/g, "don't")
    .replace(/\s+[—–]\s+/g, ". ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Short spoken breaths. Long dumps are what make the phone voice sound like a robot. */
export function splitSpeechChunks(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve([]);
  const ready = window.speechSynthesis.getVoices();
  if (ready.length > 0) return Promise.resolve(ready);

  return new Promise((resolve) => {
    const finish = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", finish, { once: true });
    window.setTimeout(finish, 800);
  });
}

/** Chrome often drops the next speak() if it follows cancel() in the same tick. */
export const WEB_SPEECH_CANCEL_SETTLE_MS = 160;

export async function settleAfterSpeechCancel(): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  await pause(WEB_SPEECH_CANCEL_SETTLE_MS);
  try {
    window.speechSynthesis.resume();
  } catch {
    /* some browsers throw if nothing is paused */
  }
}

function speakWebUtterance(
  text: string,
  voice: SpeechSynthesisVoice | undefined,
  rate: number,
  pitch: number,
): Promise<void> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1;
    if (voice) utterance.voice = voice;
    const maxMs = Math.min(20_000, Math.max(4_000, text.length * 80));
    const timer = window.setTimeout(() => resolve(), maxMs);
    const finish = () => {
      window.clearTimeout(timer);
      resolve();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
    try {
      window.speechSynthesis.resume();
    } catch {
      /* ignore */
    }
  });
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function speakNativeChunks(chunks: string[], generation: number): Promise<void> {
  const Speech = await import("expo-speech");
  await Speech.stop();
  await pause(WEB_SPEECH_CANCEL_SETTLE_MS);
  if (generation !== speakGeneration) return;
  const voices = await Speech.getAvailableVoicesAsync().catch(() => []);
  const picked = pickHumanSpeechVoice(
    voices.map((voice) => ({
      name: voice.name,
      lang: voice.language,
      quality: voice.quality,
      identifier: voice.identifier,
    })),
  );

  for (let index = 0; index < chunks.length; index += 1) {
    if (generation !== speakGeneration) return;
    const ios = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent ?? "");
    const rate = ios ? 0.92 : 0.94;
    const pitch = index === 0 ? 1.04 : 1.02;
    await new Promise<void>((resolve) => {
      const maxMs = Math.min(20_000, Math.max(4_000, chunks[index].length * 80));
      const timer = setTimeout(resolve, maxMs);
      const finish = () => {
        clearTimeout(timer);
        resolve();
      };
      Speech.speak(chunks[index], {
        language: "en-US",
        rate,
        pitch,
        voice: picked?.identifier,
        onDone: finish,
        onStopped: finish,
        onError: finish,
      });
    });
    if (generation !== speakGeneration) return;
    if (index < chunks.length - 1) await pause(220);
  }
}

export async function speakPageCopy(text: string): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const generation = (speakGeneration += 1);
  const chunks = splitSpeechChunks(prepareSpeechForHumanVoice(trimmed));
  if (chunks.length === 0) return false;

  if (isNativeApp()) {
    try {
      await speakNativeChunks(chunks, generation);
      return generation === speakGeneration;
    } catch {
      return false;
    }
  }

  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;

  const voices = await waitForVoices();
  if (generation !== speakGeneration) return false;
  const voice = pickHumanSpeechVoice(voices);

  await settleAfterSpeechCancel();
  if (generation !== speakGeneration) return false;

  for (let index = 0; index < chunks.length; index += 1) {
    if (generation !== speakGeneration) return false;
    const rate = index === 0 ? 0.96 : 0.94;
    const pitch = index % 2 === 0 ? 1.03 : 1.01;
    await speakWebUtterance(chunks[index], voice, rate, pitch);
    if (generation !== speakGeneration) return false;
    if (index < chunks.length - 1) await pause(200);
  }
  return true;
}
