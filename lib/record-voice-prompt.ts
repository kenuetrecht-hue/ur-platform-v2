import { SPEECH_PROMPT_MAX_SECONDS } from "./speech-prompt";

export type VoicePromptSession = {
  ready: Promise<void>;
  stop: () => Promise<{ audioBase64: string; mimeType: string }>;
};

export function createVoicePromptSession(): VoicePromptSession {
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let stopRequested = false;
  let resolveBlob: ((blob: Blob) => void) | null = null;
  let rejectBlob: ((error: Error) => void) | null = null;
  const blobPromise = new Promise<Blob>((resolve, reject) => {
    resolveBlob = resolve;
    rejectBlob = reject;
  });

  const ready = (async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser cannot use the microphone. Open the site in Chrome or Edge.");
    }
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (stopRequested) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("Recording cancelled.");
    }
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
    const chunks: BlobPart[] = [];
    recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => rejectBlob?.(new Error("Microphone recording failed."));
    recorder.onstop = () => {
      stream?.getTracks().forEach((track) => track.stop());
      resolveBlob?.(new Blob(chunks, { type: mimeType.split(";")[0] }));
    };
    recorder.start();
    setTimeout(() => {
      if (recorder && recorder.state !== "inactive") recorder.stop();
    }, SPEECH_PROMPT_MAX_SECONDS * 1000);
  })();

  return {
    ready,
    stop: async () => {
      stopRequested = true;
      await ready;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      const blob = await blobPromise;
      return { audioBase64: await blobToBase64(blob), mimeType: blob.type || "audio/webm" };
    },
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
