/**
 * Speak signup / ID-check copy out loud.
 * Prefers the phone's most natural English voice (Samantha, Neural, etc.).
 * Browser speech is never as warm as a studio recording — this is the free path.
 */

export function canSpeakPageCopy(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopPageCopy(): void {
  if (!canSpeakPageCopy()) return;
  window.speechSynthesis.cancel();
}

/** Higher score = closer to a human-sounding English voice. */
export function scoreSpeechVoice(voice: { name: string; lang: string; localService?: boolean; default?: boolean }): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  if (!lang.startsWith("en")) return -100;

  let score = 4;
  if (voice.localService) score += 3;
  if (voice.default) score += 1;
  if (/samantha|daniel|karen|moira|nicky|alex|fred|susan|victoria|tom|siri/.test(name)) score += 22;
  if (/natural|neural|premium|enhanced|online \(natural\)|multilingual/.test(name)) score += 16;
  if (/google uk|google us|google english/.test(name)) score += 12;
  if (/aria|jenny|guy|sara|sonia|ryan|andrew|emma|brian/.test(name)) score += 10;
  if (/compact|espeak|whisper|novelty|bad news|good news|bells|boing|bubbles|cellos|zarvox|trinoids|albert|ralph/.test(name)) {
    score -= 40;
  }
  return score;
}

export function pickHumanSpeechVoice<T extends { name: string; lang: string; localService?: boolean; default?: boolean }>(
  voices: T[],
): T | undefined {
  if (voices.length === 0) return undefined;
  return [...voices].sort((a, b) => scoreSpeechVoice(b) - scoreSpeechVoice(a))[0];
}

function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!canSpeakPageCopy()) return Promise.resolve([]);
  const ready = window.speechSynthesis.getVoices();
  if (ready.length > 0) return Promise.resolve(ready);

  return new Promise((resolve) => {
    const finish = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", finish, { once: true });
    window.setTimeout(finish, 800);
  });
}

export async function speakPageCopy(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  if (!canSpeakPageCopy()) return;

  const voices = await waitForVoices();
  const voice = pickHumanSpeechVoice(voices);

  await new Promise<void>((resolve) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.rate = 0.88;
    utterance.pitch = 0.92;
    utterance.volume = 1;
    if (voice) utterance.voice = voice;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
