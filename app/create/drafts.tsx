import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { CreateDeskScreen, DeskLink, WashCopy } from "@/components/create-desk-screen";
import { LETTERING_ON_COLOR } from "@/lib/gold-lettering";
import { CREATE_DESK_ROUTES, type CreateDraft } from "@/lib/create-desk";
import { deleteDraft, listDrafts } from "@/lib/create-desk-store";

const KIND_LABEL: Record<CreateDraft["kind"], string> = {
  video: "Video",
  image: "Image",
  text: "Text",
};

const KIND_ROUTE: Record<CreateDraft["kind"], string> = {
  video: CREATE_DESK_ROUTES.video,
  image: CREATE_DESK_ROUTES.image,
  text: CREATE_DESK_ROUTES.text,
};

export default function CreateDraftsScreen() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<CreateDraft[]>([]);

  const refresh = useCallback(() => {
    void listDrafts().then(setDrafts);
  }, []);

  useFocusEffect(refresh);

  return (
    <CreateDeskScreen
      icon="📄"
      title="Drafts"
      subtitle="Video ideas, picture prompts, and writing you saved on this device."
    >
      <WashCopy>Open a draft to keep working. Nothing here is published until you use it.</WashCopy>
      {drafts.length === 0 ? (
        <WashCopy>No drafts yet. Start from New video, New image, or New text, then tap Save draft.</WashCopy>
      ) : (
        drafts.map((draft) => (
          <View key={draft.id} style={{ gap: 6 }}>
            <Text style={{ color: LETTERING_ON_COLOR, fontWeight: "800", fontSize: 16 }}>{draft.title}</Text>
            <Text style={{ color: LETTERING_ON_COLOR, fontSize: 12 }}>
              {KIND_LABEL[draft.kind]} · {new Date(draft.updatedAt).toLocaleString()}
            </Text>
            <DeskLink
              label="Open"
              onPress={() =>
                router.push({
                  pathname: KIND_ROUTE[draft.kind],
                  params: { draft: draft.id },
                })
              }
            />
            <DeskLink
              label="Remove"
              onPress={() => {
                void deleteDraft(draft.id).then(refresh);
              }}
            />
          </View>
        ))
      )}
    </CreateDeskScreen>
  );
}
