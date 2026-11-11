import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/lib/auth-context";
import { getAccessToken } from "@/lib/auth-storage";
import { cartoonifyFromFile } from "@/lib/cartoonify-photo";
import { FEED_VIDEO_MAX_BYTES } from "@/lib/feed-video-size";
import { LETTERING_ON_WHITE } from "@/lib/gold-lettering";
import { trpc } from "@/lib/trpc";
import { getTrpcApiUrl } from "@/lib/trpc-url";

async function uploadMemberFile(file: Blob, fileName: string): Promise<string> {
  const token = await getAccessToken();
  const form = new FormData();
  form.append("file", file, fileName);
  const response = await fetch(getTrpcApiUrl().replace(/\/api\/trpc\/?$/, "/api/member-feed-upload"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
    credentials: "include",
  });
  const payload = (await response.json()) as { url?: string; error?: { message?: string } };
  if (!response.ok || !payload.url) {
    throw new Error(payload.error?.message || "That picture could not be stored.");
  }
  return payload.url;
}

async function uploadOwnerFile(file: Blob, fileName: string): Promise<string> {
  const token = await getAccessToken();
  const form = new FormData();
  form.append("file", file, fileName);
  const response = await fetch(getTrpcApiUrl().replace(/\/api\/trpc\/?$/, "/api/owner-social-upload"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
    credentials: "include",
  });
  const payload = (await response.json()) as { url?: string; error?: { message?: string } };
  if (!response.ok || !payload.url) {
    throw new Error(payload.error?.message || "Facebook could not take that cartoon yet.");
  }
  return payload.url;
}

export function CartoonSelfUpload({ isPlatformOwner }: { isPlatformOwner: boolean }) {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const [sourcePreview, setSourcePreview] = useState("");
  const [sourceKind, setSourceKind] = useState<"image" | "video" | "">("");
  const [cartoonPreview, setCartoonPreview] = useState("");
  const [cartoonUrl, setCartoonUrl] = useState("");
  const [cartoonBlob, setCartoonBlob] = useState<Blob | null>(null);
  const [caption, setCaption] = useState("");
  const [mine, setMine] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef("");
  const cartoonRef = useRef("");

  const postOnUr = trpc.social.createPost.useMutation({
    onSuccess: () => setStatus("The cartoon is on your UR feed."),
    onError: (err) => setError(err.message),
  });
  const postFacebook = trpc.platformOps.publishOwnerSocialPost.useMutation({
    onSuccess: () => setStatus("The cartoon was sent to Facebook."),
    onError: (err) => setError(err.message),
  });

  useEffect(() => {
    return () => {
      if (previewRef.current.startsWith("blob:")) URL.revokeObjectURL(previewRef.current);
      if (cartoonRef.current.startsWith("blob:")) URL.revokeObjectURL(cartoonRef.current);
    };
  }, []);

  const remember = (next: string, kind: "image" | "video") => {
    if (previewRef.current.startsWith("blob:")) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next;
    setSourcePreview(next);
    setSourceKind(kind);
  };

  const onFile = async (file: File) => {
    const kind = file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(file.name) ? "video" : "image";
    if (file.size > FEED_VIDEO_MAX_BYTES) {
      setError("That file is over 250 MB. Use a shorter clip or a picture.");
      return;
    }
    setError(null);
    setStatus("");
    setCartoonUrl("");
    setBusy(true);
    remember(URL.createObjectURL(file), kind);
    try {
      const cartoon = await cartoonifyFromFile(file);
      if (cartoonRef.current.startsWith("blob:")) URL.revokeObjectURL(cartoonRef.current);
      const local = URL.createObjectURL(cartoon);
      cartoonRef.current = local;
      setCartoonPreview(local);
      setCartoonBlob(cartoon);
      const url = await uploadMemberFile(cartoon, "cartoon-me.png");
      setCartoonUrl(url);
      setStatus(kind === "video" ? "The cartoon is drawn from your video. It is in the box." : "The cartoon is in the box.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That picture could not become a cartoon.");
    } finally {
      setBusy(false);
    }
  };

  const canPost = Boolean(cartoonUrl && mine && isAuthenticated && !busy);

  return (
    <View style={[styles.box, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
        Upload a picture or video of yourself
      </Text>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
        It shows here, then we draw a cartoon from it. Add a statement if you want, then post the cartoon on UR.
        {isPlatformOwner ? " You can also send that cartoon to Facebook." : ""} Only your own face.
      </Text>
      {Platform.OS === "web" ? (
        <label
          data-testid="cartoon-self-upload"
          style={{
            display: "flex",
            justifyContent: "center",
            borderRadius: 12,
            padding: "10px 12px",
            background: "#FFFFFF",
            border: "1px solid #E0E7FF",
            cursor: busy ? "default" : "pointer",
            textAlign: "center",
          }}
        >
          <input
            type="file"
            accept="image/*,video/*,.jpg,.jpeg,.png,.webp,.mp4,.mov,.webm"
            disabled={busy}
            style={{ display: "none" }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void onFile(file);
            }}
          />
          <span style={{ color: LETTERING_ON_WHITE, fontWeight: 800 }}>
            {busy ? "Drawing the cartoon…" : "Choose a picture or video"}
          </span>
        </label>
      ) : (
        <Text style={{ color: colors.foreground, fontSize: 13 }}>
          Open Cartoon Studio on the website to upload a picture or video.
        </Text>
      )}
      {sourcePreview && sourceKind === "image" ? (
        <Image source={{ uri: sourcePreview }} style={styles.preview} resizeMode="cover" />
      ) : null}
      {sourcePreview && sourceKind === "video" && Platform.OS === "web" ? (
        // @ts-expect-error web video
        <video src={sourcePreview} controls playsInline style={{ width: "100%", borderRadius: 10, maxHeight: 280, background: "#111" }} />
      ) : null}
      {cartoonPreview ? <Image source={{ uri: cartoonPreview }} style={styles.preview} resizeMode="cover" /> : null}
      <TextInput
        value={caption}
        onChangeText={setCaption}
        maxLength={400}
        placeholder="Add a statement if you want. You can leave this blank."
        placeholderTextColor={colors.muted}
        style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
      />
      <Pressable onPress={() => setMine((value) => !value)}>
        <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 19 }}>
          {mine ? "☑" : "☐"} This picture or video is me. I am not uploading someone else.
        </Text>
      </Pressable>
      <Pressable
        disabled={!canPost || postOnUr.isPending}
        onPress={() =>
          postOnUr.mutate({
            body: caption.trim(),
            imageUrl: cartoonUrl,
            contentRightsMode: "original",
            rightsConfirmed: true,
            visibility: "public",
          })
        }
        style={[styles.primary, { backgroundColor: colors.primary, opacity: canPost ? 1 : 0.5 }]}
      >
        {postOnUr.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Post this cartoon on UR</Text>}
      </Pressable>
      {isPlatformOwner ? (
        <Pressable
          disabled={!canPost || !cartoonBlob || postFacebook.isPending}
          onPress={() => {
            if (!cartoonBlob) return;
            setError(null);
            setBusy(true);
            void uploadOwnerFile(cartoonBlob, "cartoon-me.png")
              .then((url) =>
                postFacebook.mutate({
                  body: caption.trim() || "A cartoon from UR Platform.",
                  platforms: ["facebook"],
                  mediaUrls: [url],
                  mediaKind: "image",
                }),
              )
              .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Facebook could not take that cartoon yet.");
              })
              .finally(() => setBusy(false));
          }}
          style={[styles.primary, { backgroundColor: "#1877F2", opacity: canPost ? 1 : 0.5 }]}
        >
          {postFacebook.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Send this cartoon to Facebook</Text>}
        </Pressable>
      ) : null}
      {status ? <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>{status}</Text> : null}
      {error ? <Text style={{ color: "#c0392b", fontSize: 13 }}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1.5, borderRadius: 14, padding: 14, gap: 8 },
  preview: { width: "100%", height: 240, borderRadius: 10 },
  input: { borderWidth: 1, borderRadius: 12, minHeight: 44, padding: 12, fontSize: 15 },
  primary: { borderRadius: 12, padding: 14, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "800", textAlign: "center" },
});
