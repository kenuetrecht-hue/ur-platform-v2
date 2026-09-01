import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
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

  const readyNetworks = useMemo(
    () => (status.data?.networks ?? []).filter((n) => n.ready),
    [status.data],
  );

  const toggle = (network: SocialNetwork) => {
    setPicked((current) =>
      current.includes(network) ? current.filter((n) => n !== network) : [...current, network],
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
        <Pressable
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
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
            {SOCIAL_NETWORK_LABEL[network.network]}
            {network.publisher ? ` · ${network.publisher}` : ""}
          </Text>
          {network.ready ? null : (
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{network.reason}</Text>
          )}
        </Pressable>
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
      <Pressable
        disabled={!body.trim() || picked.length === 0 || publish.isPending || readyNetworks.length === 0}
        onPress={() => {
          publish.mutate(
            {
              body: body.trim(),
              platforms: picked,
              sourceJobId,
            },
            {
              onSuccess: (result) => {
                const ok = result.results.filter((r) => r.ok).map((r) => r.network);
                const failed = result.results.filter((r) => !r.ok);
                setHint(
                  failed.length
                    ? `Sent ${ok.join(", ") || "none"}. Failed: ${failed.map((f) => f.network).join(", ")}.`
                    : `Sent via ${result.mode}: ${ok.join(", ")}.`,
                );
              },
              onError: (error) => setHint(error.message),
            },
          );
        }}
        style={{
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: "center",
          backgroundColor:
            !body.trim() || picked.length === 0 || publish.isPending ? colors.muted : colors.primary,
        }}
      >
        {publish.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>Post now</Text>
        )}
      </Pressable>
      {hint ? (
        <Text style={{ color: publish.isError ? "#dc2626" : colors.muted, fontSize: 12 }}>{hint}</Text>
      ) : null}
    </View>
  );
}
