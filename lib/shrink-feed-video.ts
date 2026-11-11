import { feedVideoBitrate, feedVideoKeepSeconds } from "./feed-video-size";

export function feedRecorderMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "video/webm";
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) return "video/webm;codecs=vp8,opus";
  if (MediaRecorder.isTypeSupported("video/webm")) return "video/webm";
  if (MediaRecorder.isTypeSupported("video/mp4")) return "video/mp4";
  return "video/webm";
}

export type ShrunkFeedVideo = {
  blob: Blob;
  name: string;
  trimmed: boolean;
};

/**
 * Makes a too-large video smaller so it can post.
 * The whole clip is kept unless it is so long that even a small picture will not fit.
 */
export async function shrinkFeedVideo(file: Blob, fileName: string): Promise<ShrunkFeedVideo> {
  if (typeof document === "undefined") {
    throw new Error("Open this page in the browser to send a video that large.");
  }
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.playsInline = true;
  video.volume = 0;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("This browser could not read that video. Try MP4 or MOV."));
    });
    const keep = feedVideoKeepSeconds(video.duration);
    const trimmed = video.duration - keep > 0.5;
    const sourceWidth = video.videoWidth || 1280;
    const sourceHeight = video.videoHeight || 720;
    const width = Math.max(2, Math.min(1280, sourceWidth));
    const height = Math.max(2, Math.round((sourceHeight / sourceWidth) * width));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser could not make that video smaller.");
    const canvasStream = canvas.captureStream(24);
    const withAudio = video as HTMLVideoElement & { captureStream?: () => MediaStream };
    let captured: MediaStream | null = null;
    if (typeof withAudio.captureStream === "function") {
      captured = withAudio.captureStream();
      for (const track of captured.getAudioTracks()) canvasStream.addTrack(track);
    }
    const mimeType = feedRecorderMimeType();
    const recorder = new MediaRecorder(canvasStream, {
      mimeType,
      videoBitsPerSecond: feedVideoBitrate(keep || video.duration || 1),
    });
    const chunks: Blob[] = [];
    const done = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => reject(new Error("This browser could not make that video smaller."));
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType.split(";")[0] || "video/webm" }));
    });
    recorder.start(1000);
    await video.play();
    await new Promise<void>((resolve) => {
      const draw = () => {
        if (video.currentTime >= keep || video.ended || video.paused) {
          resolve();
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        requestAnimationFrame(draw);
      };
      draw();
    });
    video.pause();
    if (recorder.state !== "inactive") recorder.stop();
    captured?.getTracks().forEach((track) => track.stop());
    const blob = await done;
    const ext = blob.type.includes("mp4") ? "mp4" : "webm";
    const stem = fileName.replace(/\.[^.]+$/, "") || "video";
    return { blob, name: `${stem}.${ext}`, trimmed };
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
