import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { putMuxDirectUpload } from "@/lib/mux-direct-upload";
import { MUX_DIRECT_UPLOAD_MAX_BYTES } from "@/lib/mux-video-engine";

type Props = {
  sessionId: string;
  onUploadId?: (uploadId: string) => void;
};

async function blobFromNativeUri(uri: string, mimeType?: string): Promise<Blob> {
  const response = await fetch(uri);
  const blob = await response.blob();
  if (mimeType && blob.type !== mimeType) {
    return new Blob([blob], { type: mimeType });
  }
  return blob;
}

export function MuxVideoUploader({ sessionId, onUploadId }: Props) {
  const colors = useColors();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);

  const status = trpc.muxVideo.status.useQuery();
  const createUpload = trpc.muxVideo.createClassReplayUpload.useMutation();
  const upload = trpc.muxVideo.getUpload.useQuery(
    { uploadId: uploadId ?? "" },
    { enabled: Boolean(uploadId), refetchInterval: uploadId ? 4000 : false },
  );

  useEffect(() => {
    if (upload.data?.id) onUploadId?.(upload.data.id);
  }, [onUploadId, upload.data?.id]);

  const startUpload = async (file: Blob) => {
    setError(null);
    setBusy(true);
    setProgress(0);
    try {
      const created = await createUpload.mutateAsync({ sessionId, purpose: "class_replay" });
      setUploadId(created.id);
      onUploadId?.(created.id);
      await putMuxDirectUpload(created.uploadUrl, file, setProgress);
      setProgress(100);
    } catch {
      setError("Could not upload this video to Mux.");
    } finally {
      setBusy(false);
    }
  };

  const pickFile = async () => {
    if (Platform.OS === "web") {
      fileInputRef.current?.click();
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: ["video/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MUX_DIRECT_UPLOAD_MAX_BYTES) {
      setError("That video is too large to upload.");
      return;
    }
    const blob = await blobFromNativeUri(asset.uri, asset.mimeType);
    await startUpload(blob);
  };

  if (status.data && !status.data.configured) {
    return (
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        Mux is the video engine. Add MUX_TOKEN_ID and MUX_TOKEN_SECRET in the server .env to upload recordings.
      </Text>
    );
  }

  const muxReady = upload.data?.ready;
  const muxStatus = upload.data?.status;

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700" }}>
        Mux recording (pay-per-view)
      </Text>
      {Platform.OS === "web" ? (
        <input
          ref={fileInputRef as never}
          type="file"
          accept="video/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void startUpload(file);
            event.target.value = "";
          }}
        />
      ) : null}
      <Pressable
        onPress={() => void pickFile()}
        disabled={busy}
        style={{
          backgroundColor: colors.primary,
          borderRadius: 10,
          paddingVertical: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
          {busy ? `Uploading to Mux… ${progress}%` : muxReady ? "Replace Mux video" : "Upload video to Mux"}
        </Text>
      </Pressable>
      {busy ? <ActivityIndicator color={colors.primary} /> : null}
      {muxStatus ? (
        <Text style={{ color: muxReady ? "#059669" : colors.muted, fontSize: 12 }}>
          {muxReady ? "Mux is ready — publish to sell this replay." : `Mux status: ${muxStatus}`}
        </Text>
      ) : null}
      {error ? <Text style={{ color: "#dc2626", fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}
