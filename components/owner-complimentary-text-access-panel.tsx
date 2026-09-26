import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { LETTERING_ON_COLOR, LETTERING_ON_WHITE } from "@/lib/gold-lettering";

/** Owner-only: free texting with the AIs. Speaking still requires pay. */
export function OwnerComplimentaryTextAccessPanel() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const { isPlatformOwner, hasAdminPermission } = usePlatformOwner();
  const [grantEmail, setGrantEmail] = useState("");
  const [grantReason, setGrantReason] = useState("");

  const enabled = isPlatformOwner && hasAdminPermission("grant_user_access");
  const accessGrants = trpc.platformOps.listAccessGrants.useQuery(undefined, {
    enabled,
  });
  const grantAccess = trpc.platformOps.grantFreeAccess.useMutation({
    onSuccess: () => {
      setGrantEmail("");
      setGrantReason("");
      void utils.platformOps.listAccessGrants.invalidate();
    },
  });
  const revokeGrant = trpc.platformOps.revokeFreeAccess.useMutation({
    onSuccess: () => void utils.platformOps.listAccessGrants.invalidate(),
  });

  if (!enabled) return null;

  return (
    <View style={{ gap: 10, paddingHorizontal: 16, paddingTop: 8 }} testID="complimentary-text-access">
      <Text style={{ fontSize: 16, fontWeight: "700", color: LETTERING_ON_COLOR }}>
        Free texting
      </Text>
      <Text style={{ color: LETTERING_ON_COLOR, fontSize: 13, lineHeight: 18 }}>
        Enter an email to give free texting back and forth with the AIs. Everyone else pays.
        They still pay to speak or have an AI speak.
      </Text>
      <TextInput
        value={grantEmail}
        onChangeText={setGrantEmail}
        placeholder="Email for free texting"
        placeholderTextColor={LETTERING_ON_WHITE}
        autoCapitalize="none"
        keyboardType="email-address"
        maxLength={320}
        style={{
          color: LETTERING_ON_WHITE,
          borderColor: colors.border,
          backgroundColor: "#FFFFFF",
          borderRadius: 10,
          borderWidth: 1,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
        }}
      />
      <TextInput
        value={grantReason}
        onChangeText={setGrantReason}
        placeholder="Reason (optional)"
        placeholderTextColor={LETTERING_ON_WHITE}
        maxLength={500}
        style={{
          color: LETTERING_ON_WHITE,
          borderColor: colors.border,
          backgroundColor: "#FFFFFF",
          borderRadius: 10,
          borderWidth: 1,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
        }}
      />
      <Pressable
        onPress={() =>
          grantAccess.mutate({
            userEmail: grantEmail.trim(),
            reason: grantReason.trim() || undefined,
            features: ["ai_chat"],
          })
        }
        disabled={grantAccess.isPending || !grantEmail.trim().includes("@")}
        style={{
          borderRadius: 12,
          padding: 14,
          alignItems: "center",
          backgroundColor: grantEmail.trim().includes("@") ? colors.primary : colors.muted,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Give free texting</Text>
      </Pressable>
      {(accessGrants.data ?? []).filter((g) => !g.revokedAt).slice(0, 8).map((g) => (
        <View
          key={g.id}
          style={{
            marginHorizontal: 0,
            borderRadius: 12,
            borderWidth: 1,
            padding: 14,
            backgroundColor: "#FFFFFF",
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontWeight: "700", color: LETTERING_ON_WHITE }}>{g.userEmail}</Text>
          <Text style={{ color: LETTERING_ON_WHITE, fontSize: 12 }}>Free texting</Text>
          {g.reason ? <Text style={{ color: LETTERING_ON_WHITE, fontSize: 12 }}>{g.reason}</Text> : null}
          <Pressable onPress={() => revokeGrant.mutate({ grantId: g.id })} style={{ marginTop: 6 }}>
            <Text style={{ color: "#dc2626", fontWeight: "600", fontSize: 12 }}>Revoke</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
