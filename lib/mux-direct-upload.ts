import { MUX_DIRECT_UPLOAD_MAX_BYTES } from "./mux-video-engine";

export async function putMuxDirectUpload(
  uploadUrl: string,
  file: Blob,
  onProgress?: (percent: number) => void,
): Promise<void> {
  if (file.size > MUX_DIRECT_UPLOAD_MAX_BYTES) {
    throw new Error("That video is too large to upload.");
  }
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error("Mux could not accept this video."));
    };
    xhr.onerror = () => reject(new Error("Mux upload failed."));
    xhr.send(file);
  });
}
