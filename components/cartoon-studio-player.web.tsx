import { useState } from "react";
import { Pressable, Text } from "react-native";
import { CartoonStudioPlayerShell } from "@/components/cartoon-studio-player-shell";
import { cartoonFrameDataUri, type PublicCartoonProject } from "@/lib/cartoon-studio";

type Props = {
  project: PublicCartoonProject;
  sample?: boolean;
};

export function CartoonStudioPlayer({ project, sample = false }: Props) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportWebm = async () => {
    setExportError(null);
    setExporting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d");
      if (!ctx || typeof MediaRecorder === "undefined") {
        throw new Error("This browser cannot record a video file.");
      }
      const stream = canvas.captureStream(12);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      const done = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
        recorder.onerror = () => reject(new Error("Recording failed."));
      });
      recorder.start();
      for (const next of project.scenes) {
        const image = new Image();
        image.src = cartoonFrameDataUri(next.frameSvg);
        await image.decode();
        const end = performance.now() + next.durationSeconds * 1000;
        while (performance.now() < end) {
          ctx.drawImage(image, 0, 0, 1280, 720);
          await new Promise((resolve) => window.setTimeout(resolve, 80));
        }
      }
      recorder.stop();
      const blob = await done;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${project.title.replace(/[^\w]+/g, "-").slice(0, 40) || "cartoon"}.webm`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Could not export the cartoon.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <CartoonStudioPlayerShell
      project={project}
      sample={sample}
      extraActions={
        sample ? null : (
          <>
            <Pressable
              disabled={exporting}
              onPress={() => void exportWebm()}
              style={{ backgroundColor: "#059669", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                {exporting ? "Recording…" : "Download video"}
              </Text>
            </Pressable>
            {exportError ? (
              <Text style={{ color: "#c0392b", fontSize: 12 }}>{exportError}</Text>
            ) : null}
          </>
        )
      }
    />
  );
}
