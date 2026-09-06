import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { cartoonFrameDataUri, type PublicCartoonProject } from "@/lib/cartoon-studio";

type Props = {
  project: PublicCartoonProject;
};

export function CartoonStudioPlayer({ project }: Props) {
  const colors = useColors();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const scene = project.scenes[index] ?? project.scenes[0];
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!playing || !scene) return;
    const timer = window.setTimeout(() => {
      if (index + 1 < project.scenes.length) {
        setIndex(index + 1);
      } else {
        setPlaying(false);
      }
    }, scene.durationSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [playing, index, scene, project.scenes.length]);

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

  if (!scene) return null;

  return (
    <View style={{ gap: 10 }}>
      <img
        ref={imgRef}
        src={cartoonFrameDataUri(scene.frameSvg)}
        alt={scene.title}
        style={{ width: "100%", maxHeight: 420, objectFit: "contain", borderRadius: 16, background: "#111" }}
      />
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
        Scene {scene.order} / {project.scenes.length} · {scene.durationSeconds}s · {project.totalSeconds}s of {project.billedSeconds}s paid
      </Text>
      {scene.caption ? (
        <Text style={{ color: colors.foreground, fontSize: 13 }}>Caption: {scene.caption}</Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Pressable
          onPress={() => {
            setIndex(0);
            setPlaying(true);
          }}
          style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>{playing ? "Playing…" : "Play cartoon"}</Text>
        </Pressable>
        <Pressable
          onPress={() => setIndex(Math.max(0, index - 1))}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>Back</Text>
        </Pressable>
        <Pressable
          onPress={() => setIndex(Math.min(project.scenes.length - 1, index + 1))}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>Next</Text>
        </Pressable>
        <Pressable
          disabled={exporting}
          onPress={() => void exportWebm()}
          style={{ backgroundColor: "#059669", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {exporting ? "Recording…" : "Download video"}
          </Text>
        </Pressable>
      </View>
      {exportError ? (
        <Text style={{ color: "#c0392b", fontSize: 12 }}>{exportError}</Text>
      ) : null}
    </View>
  );
}
