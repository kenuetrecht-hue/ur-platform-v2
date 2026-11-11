/** Turns a photo, or one frame of a video, into a simple cartoon picture. */

export function posterizeChannel(value: number, levels = 5): number {
  const safe = Math.max(0, Math.min(255, Math.round(value)));
  const steps = Math.max(2, levels);
  const bucket = 255 / (steps - 1);
  return Math.round(Math.round(safe / bucket) * bucket);
}

function drawCartoon(source: CanvasImageSource, width: number, height: number): Promise<Blob> {
  const maxWidth = 960;
  const scale = width > maxWidth ? maxWidth / width : 1;
  const w = Math.max(2, Math.round(width * scale));
  const h = Math.max(2, Math.round((height || width) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return Promise.reject(new Error("This browser could not draw that cartoon."));
  ctx.drawImage(source, 0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  const data = image.data;
  const lum = new Uint8Array(w * h);
  for (let pixel = 0, index = 0; index < data.length; index += 4, pixel += 1) {
    data[index] = posterizeChannel(data[index] ?? 0);
    data[index + 1] = posterizeChannel(data[index + 1] ?? 0);
    data[index + 2] = posterizeChannel(data[index + 2] ?? 0);
    lum[pixel] = Math.round(((data[index] ?? 0) * 3 + (data[index + 1] ?? 0) * 6 + (data[index + 2] ?? 0)) / 10);
  }
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const pixel = y * w + x;
      const diff = Math.abs((lum[pixel] ?? 0) - (lum[pixel - 1] ?? 0)) + Math.abs((lum[pixel] ?? 0) - (lum[pixel - w] ?? 0));
      if (diff > 48) {
        const index = pixel * 4;
        data[index] = 28;
        data[index + 1] = 24;
        data[index + 2] = 46;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("This browser could not save that cartoon."));
      else resolve(blob);
    }, "image/png");
  });
}

async function frameFromVideo(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; cleanup: () => void }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Use a JPEG, PNG, MP4, MOV, or WebM."));
    });
    const halfway = Number.isFinite(video.duration) ? Math.min(0.6, Math.max(0, video.duration / 2)) : 0;
    if (halfway > 0.05) {
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.currentTime = halfway;
      });
    }
    return {
      source: video,
      width: video.videoWidth || 640,
      height: video.videoHeight || 360,
      cleanup: () => {
        video.removeAttribute("src");
        video.load();
        URL.revokeObjectURL(url);
      },
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export async function cartoonifyFromFile(file: Blob): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("Open Cartoon Studio on the website to turn a picture into a cartoon.");
  }
  const name = file instanceof File ? file.name : "";
  const video = file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(name);
  if (video) {
    const frame = await frameFromVideo(file);
    try {
      return await drawCartoon(frame.source, frame.width, frame.height);
    } finally {
      frame.cleanup();
    }
  }
  const bitmap = await createImageBitmap(file);
  try {
    return await drawCartoon(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}
