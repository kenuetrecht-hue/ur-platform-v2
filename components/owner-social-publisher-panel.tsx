import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { AppPressable } from "@/components/app-pressable";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { SOCIAL_NETWORK_LABEL, type SocialNetwork } from "@/lib/social-publisher-types";

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
  const userAdjusted = useRef(false);

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
    if (!caption) {
      setHint("Write the post first.");
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
        onError: (error) => setHint(error.message),
      },
    );
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
        Ayrshare and Buffer are both wired. Each network uses only one of them, so the same post
        cannot go out twice. Personal plans only — your linked accounts. Creator/affiliate posting
        waits for the Ayrshare Business plan.
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
        disabled={publish.isPending}
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
