import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { AppPressable } from "@/components/app-pressable";
import { useColors } from "@/hooks/use-colors";
import { getAccessToken } from "@/lib/auth-storage";
import { trpc } from "@/lib/trpc";
import { getTrpcApiUrl } from "@/lib/trpc-url";
import { SOCIAL_NETWORK_LABEL, type SocialNetwork } from "@/lib/social-publisher-types";

const SOCIAL_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/pdf",
];

type AttachedPostFile = {
  url: string;
  kind: "image" | "video" | "file";
  name: string;
};

function plainSocialPostError(message: string): string {
  if (/doctype|not valid json|unexpected token/i.test(message)) {
    return "The post did not go out. Ayrshare sent a web page instead of a result. Try Post now again.";
  }
  return message;
}

function ownerSocialUploadUrl(): string {
  return getTrpcApiUrl().replace(/\/api\/trpc\/?$/, "/api/owner-social-upload");
}

async function uploadSocialFile(file: Blob, fileName: string): Promise<AttachedPostFile> {
  const token = await getAccessToken();
  const form = new FormData();
  form.append("file", file, fileName);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);
  try {
    const response = await fetch(ownerSocialUploadUrl(), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
      credentials: "include",
      signal: controller.signal,
    });
    const json = (await response.json()) as {
      url?: string;
      kind?: AttachedPostFile["kind"];
      name?: string;
      error?: { message?: string };
    };
    if (!response.ok || !json.url || !json.kind) {
      throw new Error(json.error?.message || "That file could not be uploaded.");
    }
    return { url: json.url, kind: json.kind, name: json.name || fileName };
  } finally {
    clearTimeout(timeout);
  }
}

export function OwnerSocialPublisherPanel({
  seedCaption,
  sourceJobId,
}: {
  seedCaption?: string;
  sourceJobId?: string;
}) {
  const colors = useColors();
  const status = trpc.platformOps.getSocialPublisherStatus.useQuery();
  const publish = trpc.platformOps.publishOwnerSocialPost.useMutation();
  const [body, setBody] = useState(seedCaption ?? "");
  const [picked, setPicked] = useState<SocialNetwork[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<AttachedPostFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const userAdjusted = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const readyNetworks = useMemo(
    () => (status.data?.networks ?? []).filter((n) => n.ready),
    [status.data],
  );

  useEffect(() => {
    if (userAdjusted.current) return;
    setPicked(readyNetworks.map((network) => network.network));
  }, [readyNetworks]);

  const toggle = (network: SocialNetwork) => {
    userAdjusted.current = true;
    setPicked((current) =>
      current.includes(network) ? current.filter((n) => n !== network) : [...current, network],
    );
  };

  const sendPost = () => {
    const caption = body.trim();
    const targets = picked.length > 0 ? picked : readyNetworks.map((network) => network.network);
    if (!caption && !attachment) {
      setHint("Write the post or add a picture, video, or PDF.");
      return;
    }
    if (targets.length === 0) {
      setHint(status.data?.setupNeeded ?? "No social account is linked yet, so there is nowhere to send this.");
      return;
    }
    publish.mutate(
      {
        body: caption,
        platforms: targets,
        mediaUrls: attachment ? [attachment.url] : undefined,
        mediaKind: attachment?.kind,
        sourceJobId,
      },
      {
        onSuccess: (result) => {
          const ok = result.results.filter((r) => r.ok).map((r) => r.network);
          const failed = result.results.filter((r) => !r.ok);
          setHint(
            failed.length
              ? `Sent ${ok.join(", ") || "none"}. Failed: ${failed.map((f) => `${f.network}${f.error ? ` (${f.error})` : ""}`).join(", ")}.`
              : `Sent via ${result.mode}: ${ok.join(", ")}.`,
          );
        },
        onError: (error) => setHint(plainSocialPostError(error.message)),
      },
    );
  };

  const takeFile = (file: Blob, fileName: string) => {
    if (file.size > 100 * 1024 * 1024) {
      setHint("That file is over 100 MB.");
      return;
    }
    setUploading(true);
    setHint(null);
    void uploadSocialFile(file, fileName)
      .then((uploaded) => {
        setAttachment(uploaded);
        setHint(
          uploaded.kind === "file"
            ? "PDF added. It will go out as a link with the caption."
            : uploaded.kind === "image"
              ? "Picture added. It will go out with the caption."
              : "Video added. It will go out with the caption.",
        );
      })
      .catch((error: unknown) => {
        setAttachment(null);
        setHint(error instanceof Error ? plainSocialPostError(error.message) : "That file could not be uploaded.");
      })
      .finally(() => setUploading(false));
  };

  const pickFile = async () => {
    if (Platform.OS === "web") {
      fileInputRef.current?.click();
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: SOCIAL_FILE_TYPES,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    takeFile(blob, asset.name || "upload");
  };

  return (
    <View
      style={{
        marginHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: 14,
        gap: 10,
      }}
    >
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 13 }}>
        Post to your social accounts
      </Text>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
        A picture or video is sent with the caption. A PDF is sent as a link on Facebook, X, and LinkedIn.
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12 }}>
        Ayrshare: {status.data?.ayrshareConfigured ? "key on" : "add AYRSHARE_API_KEY"}
        {status.data?.ayrshareConfigured
          ? ` · ${status.data.ayrshareLinkedNetworks.length} account${status.data.ayrshareLinkedNetworks.length === 1 ? "" : "s"} linked`
          : ""}{" "}
        · Buffer: {status.data?.bufferConfigured ? "key on (GraphQL)" : "add BUFFER_ACCESS_TOKEN"}
      </Text>
      {status.data?.setupNeeded ? (
        <Text style={{ color: "#b45309", fontSize: 13, lineHeight: 18 }}>{status.data.setupNeeded}</Text>
      ) : null}
      {(status.data?.networks ?? []).map((network) => (
        <AppPressable
          key={network.network}
          disabled={!network.ready}
          onPress={() => toggle(network.network)}
          style={{
            borderRadius: 10,
            borderWidth: 1,
            borderColor: picked.includes(network.network) ? colors.primary : colors.border,
            backgroundColor: picked.includes(network.network) ? `${colors.primary}14` : colors.background,
            paddingVertical: 8,
            paddingHorizontal: 10,
            opacity: network.ready ? 1 : 0.55,
          }}
        >
          <Text pointerEvents="none" style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
            {SOCIAL_NETWORK_LABEL[network.network]}
            {network.publisher ? ` · ${network.publisher}` : ""}
          </Text>
          {network.ready ? null : (
            <Text pointerEvents="none" style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{network.reason}</Text>
          )}
        </AppPressable>
      ))}
      {Platform.OS === "web" ? (
        <input
          ref={fileInputRef as never}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,application/pdf"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) takeFile(file, file.name);
            event.target.value = "";
          }}
        />
      ) : null}
      <AppPressable
        testID="owner-social-add-file"
        disabled={uploading || publish.isPending}
        onPress={() => void pickFile()}
        style={{
          borderRadius: 12,
          paddingVertical: 10,
          alignItems: "center",
          borderWidth: 1,
          borderColor: colors.primary,
        }}
      >
        <Text pointerEvents="none" style={{ color: colors.primary, fontWeight: "800", fontSize: 14 }}>
          {uploading ? "Uploading…" : attachment ? "Replace picture, video, or PDF" : "Add a picture, video, or PDF"}
        </Text>
      </AppPressable>
      {attachment ? (
        <Text style={{ color: colors.foreground, fontSize: 13 }}>
          {attachment.name}{" "}
          <Text onPress={() => setAttachment(null)} style={{ color: colors.primary, fontWeight: "700" }}>
            Remove
          </Text>
        </Text>
      ) : null}
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Caption to post…"
        placeholderTextColor={colors.muted}
        multiline
        maxLength={2200}
        style={{
          minHeight: 88,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: colors.foreground,
          fontSize: 15,
          textAlignVertical: "top",
        }}
      />
      <AppPressable
        testID="owner-social-post-now"
        disabled={publish.isPending || uploading}
        onPress={sendPost}
        style={{
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: "center",
          backgroundColor: publish.isPending ? colors.muted : colors.primary,
        }}
      >
        {publish.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text pointerEvents="none" style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>
            Post now
          </Text>
        )}
      </AppPressable>
      {hint ? (
        <Text style={{ color: publish.isError ? "#dc2626" : colors.muted, fontSize: 12 }}>{hint}</Text>
      ) : null}
    </View>
  );
}
