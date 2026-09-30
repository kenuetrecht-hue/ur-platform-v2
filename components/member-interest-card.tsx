import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { AppPressable } from "@/components/app-pressable";
import { LETTERING_ON_WHITE } from "@/lib/gold-lettering";
import { trpc } from "@/lib/trpc";
import type { MemberInterestId } from "@/lib/member-interests";

/** Asked once after join so the feed can lead with what this member wants. */
export function MemberInterestCard() {
  const choices = trpc.social.interestChoices.useQuery();
  const mine = trpc.social.myInterests.useQuery();
  const utils = trpc.useUtils();
  const save = trpc.social.saveInterests.useMutation({
    onSuccess: async () => {
      await utils.social.myInterests.invalidate();
      await utils.social.feed.invalidate();
      await utils.aiFreeBoard.list.invalidate();
      await utils.fairShow.discover.invalidate();
      setEditing(false);
    },
  });
  const [picked, setPicked] = useState<MemberInterestId[] | null>(null);
  const [editing, setEditing] = useState(false);

  if (choices.isLoading || mine.isLoading) {
    return <ActivityIndicator color={LETTERING_ON_WHITE} style={{ marginVertical: 12 }} />;
  }

  const saved = (mine.data?.interests ?? []) as MemberInterestId[];
  const selected = picked ?? saved;
  const showForm = editing || saved.length === 0;

  const toggle = (id: MemberInterestId) => {
    setPicked((current) => {
      const base = current ?? saved;
      if (base.includes(id)) return base.filter((item) => item !== id);
      if (base.length >= 5) return base;
      return [...base, id];
    });
  };

  if (!showForm) {
    const labels = (choices.data ?? [])
      .filter((item) => saved.includes(item.id as MemberInterestId))
      .map((item) => item.label);
    return (
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 14,
          padding: 14,
          gap: 6,
        }}
      >
        <Text style={{ color: LETTERING_ON_WHITE, fontWeight: "800", fontSize: 15 }}>
          Showing your interests first
        </Text>
        <Text style={{ color: LETTERING_ON_WHITE, fontSize: 13, lineHeight: 18 }}>{labels.join(" · ")}</Text>
        <AppPressable onPress={() => setEditing(true)}>
          <Text style={{ color: LETTERING_ON_WHITE, fontWeight: "800", fontSize: 13 }}>Change interests</Text>
        </AppPressable>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 14,
        gap: 8,
      }}
    >
      <Text style={{ color: LETTERING_ON_WHITE, fontWeight: "800", fontSize: 16 }}>
        What do you want to see?
      </Text>
      <Text style={{ color: LETTERING_ON_WHITE, fontSize: 13, lineHeight: 18 }}>
        Pick one to five. We lead with that, and we still mix in other posts and creator videos.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(choices.data ?? []).map((item) => {
          const on = selected.includes(item.id as MemberInterestId);
          return (
            <AppPressable
              key={item.id}
              onPress={() => toggle(item.id as MemberInterestId)}
              style={{
                backgroundColor: on ? "#4F46E5" : "#FFFFFF",
                borderWidth: 1,
                borderColor: "#4F46E5",
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: on ? "#FFFFFF" : LETTERING_ON_WHITE, fontWeight: "700", fontSize: 13 }}>
                {item.label}
              </Text>
            </AppPressable>
          );
        })}
      </View>
      {save.error ? (
        <Text style={{ color: "#B91C1C", fontSize: 13 }}>{save.error.message}</Text>
      ) : null}
      <AppPressable
        onPress={() => {
          if (selected.length < 1) return;
          save.mutate({ interests: selected });
        }}
        disabled={selected.length < 1 || save.isPending}
        style={{
          backgroundColor: "#4F46E5",
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: "center",
          opacity: selected.length < 1 ? 0.5 : 1,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
          {save.isPending ? "Saving…" : "Save interests"}
        </Text>
      </AppPressable>
    </View>
  );
}
