/**
 * Speak signup / ID-check copy out loud.
 * People should hear Uri — they should not have to read the script.
 * Uses the phone or browser voice. No Azure key on the client.
 */

export function canSpeakPageCopy(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopPageCopy(): void {
  if (!canSpeakPageCopy()) return;
  window.speechSynthesis.cancel();
}

export function speakPageCopy(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return Promise.resolve();

  return new Promise((resolve) => {
    if (!canSpeakPageCopy()) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (voice) =>
        voice.lang.toLowerCase().startsWith("en") &&
        (voice.name.includes("Samantha") ||
          voice.name.includes("Aria") ||
          voice.name.includes("Google US") ||
          voice.name.includes("Samantha")),
    );
    const english = preferred ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("en"));
    if (english) utterance.voice = english;

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
