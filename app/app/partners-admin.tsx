import { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Switch, Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Card, HeaderBar } from "@/components/ur-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getPartners,
  savePartner,
  togglePartner,
  Partner,
  PARTNER_SLOT_LABELS,
} from "@/lib/store";

export default function PartnersAdminScreen() {
  const colors = useColors();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [editingUrl, setEditingUrl] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const all = await getPartners();
    setPartners(all);
    // Seed the local edit buffer from saved values
    const buf: Record<string, string> = {};
    for (const p of all) buf[p.id] = p.url;
    setEditingUrl(buf);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onSaveUrl(p: Partner) {
    const next: Partner = { ...p, url: (editingUrl[p.id] ?? "").trim() };
    const all = await savePartner(next);
    setPartners(all);
    Alert.alert("Saved", `${p.name} link saved.`);
  }

  async function onToggle(p: Partner) {
    if (!p.enabled && (editingUrl[p.id] ?? "").trim().length === 0) {
      Alert.alert(
        "Add a link first",
        `Paste your ${p.name} affiliate link, save it, then turn the partner on.`,
      );
      return;
    }
    const all = await togglePartner(p.id);
    setPartners(all);
  }

  const enabledCount = partners.filter((p) => p.enabled).length;
  const linkedCount = partners.filter((p) => p.url.trim().length > 0).length;
  const totalClicks = partners.reduce((sum, p) => sum + p.clicks, 0);

  return (
    <ScreenContainer>
      <HeaderBar title="Partners" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}>
        <Card>
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
            Your affiliate partners
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 }}>
            Paste your affiliate link for each program you&apos;ve been approved for, then flip it on.
            UR rotates enabled partners across the slots you assign \u2014 no code changes needed.
          </Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
            <Stat label="Linked" value={linkedCount} colors={colors} />
            <Stat label="Enabled" value={enabledCount} colors={colors} />
            <Stat label="Total clicks" value={totalClicks} colors={colors} />
          </View>
        </Card>

        {partners.map((p) => (
          <Card key={p.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>{p.name}</Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.primary + "15", borderWidth: 1, borderColor: colors.primary + "40" }}>
                    <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "700", letterSpacing: 0.3 }}>{p.category.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{p.tagline}</Text>
                <Text style={{ color: colors.foreground, fontSize: 12, marginTop: 6 }}>
                  Payout: <Text style={{ fontWeight: "600" }}>{p.payoutNote}</Text>
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                  Slots: {p.slots.map((s) => PARTNER_SLOT_LABELS[s]).join(", ")}
                </Text>
                {p.clicks > 0 && (
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                    Clicks: {p.clicks}
                  </Text>
                )}
              </View>
              <Switch value={p.enabled} onValueChange={() => onToggle(p)} />
            </View>

            <View style={{ marginTop: 12, gap: 6 }}>
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "600", letterSpacing: 0.3 }}>AFFILIATE LINK</Text>
              <TextInput
                value={editingUrl[p.id] ?? ""}
                onChangeText={(t) => setEditingUrl((prev) => ({ ...prev, [p.id]: t }))}
                placeholder="https://..."
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => onSaveUrl(p)}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.foreground,
                  backgroundColor: colors.surface,
                  fontSize: 13,
                }}
              />
              <Pressable
                onPress={() => onSaveUrl(p)}
                style={({ pressed }) => ({
                  alignSelf: "flex-start",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.85 : 1,
                  marginTop: 4,
                })}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>Save link</Text>
              </Pressable>
            </View>
          </Card>
        ))}

        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
            <Text style={{ color: colors.foreground, fontSize: 13, flex: 1, lineHeight: 19 }}>
              Tip: a partner only appears in the app once it has both a saved link and the toggle on. Off = invisible.
            </Text>
          </View>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

function Stat({ label, value, colors }: { label: string; value: number; colors: any }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600", letterSpacing: 0.3 }}>{label.toUpperCase()}</Text>
      <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "800", marginTop: 2 }}>{value}</Text>
    </View>
  );
}
