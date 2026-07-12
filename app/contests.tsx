import { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Card, HeaderBar, EmptyState } from "@/components/ur-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getContests, getGiveaways, addPoints, Contest, Giveaway } from "@/lib/store";

export default function ContestsScreen() {
  const colors = useColors();
  const [tab, setTab] = useState<"contests" | "giveaways">("contests");
  const [contests, setContests] = useState<Contest[]>([]);
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [entered, setEntered] = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => {
    getContests().then(setContests);
    getGiveaways().then(setGiveaways);
  }, []));

  async function handleEnter(id: string, type: "contest" | "giveaway") {
    if (entered.has(id)) return;
    setEntered(new Set([...entered, id]));
    await addPoints(10);
    Alert.alert("You're entered! 🎉", `Good luck! You earned 10 loyalty points for entering.`);
  }

  const items = tab === "contests" ? contests : giveaways;

  return (
    <ScreenContainer>
      <HeaderBar title="Contests & Giveaways" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ flexDirection: "row", backgroundColor: colors.surface, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: colors.border }}>
          {(["contests", "giveaways"] as const).map((t) => {
            const active = tab === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: active ? colors.background : "transparent",
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: active ? colors.foreground : colors.muted, fontSize: 14, fontWeight: active ? "700" : "500", textTransform: "capitalize" }}>{t}</Text>
              </Pressable>
            );
          })}
        </View>

        {items.length === 0 ? (
          <EmptyState icon="trophy.fill" title={`No active ${tab}`} message="Check back soon for new opportunities to win!" />
        ) : (
          <View style={{ gap: 12 }}>
            {items.map((item) => (
              <Card key={item.id} style={{ gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: tab === "contests" ? colors.warning + "20" : colors.success + "20", alignItems: "center", justifyContent: "center" }}>
                    <IconSymbol name={tab === "contests" ? "trophy.fill" : "gift.fill"} size={22} color={tab === "contests" ? colors.warning : colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>{item.title}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>by {item.creatorName}</Text>
                  </View>
                </View>

                <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20 }}>{item.description}</Text>

                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: colors.border }}>
                  <View>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>Prize</Text>
                    <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginTop: 2 }}>{item.prize}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>Ends</Text>
                    <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginTop: 2 }}>{new Date(item.endsAt).toLocaleDateString()}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{item.entries} entries</Text>
                  <Pressable
                    onPress={() => handleEnter(item.id, tab === "contests" ? "contest" : "giveaway")}
                    disabled={entered.has(item.id)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: entered.has(item.id) ? colors.surface : colors.primary,
                      borderWidth: entered.has(item.id) ? 1 : 0,
                      borderColor: colors.border,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    {entered.has(item.id) ? (
                      <>
                        <IconSymbol name="checkmark" size={14} color={colors.success} />
                        <Text style={{ color: colors.success, fontSize: 13, fontWeight: "600" }}>Entered</Text>
                      </>
                    ) : (
                      <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>Enter Now</Text>
                    )}
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
