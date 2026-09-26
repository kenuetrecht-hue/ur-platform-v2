import { useRouter } from "expo-router";
import { CreateDeskScreen, DeskField, DeskLink, DeskNotice, DeskPrimary, WashCopy } from "@/components/create-desk-screen";
import { useCreateDraftForm } from "@/components/use-create-draft-form";

export default function CreateVideoScreen() {
  const router = useRouter();
  const form = useCreateDraftForm("video");

  return (
    <CreateDeskScreen
      icon="🎬"
      title="New video"
      subtitle="Write the idea here, then open Cartoon Studio to make the video."
    >
      <WashCopy>Cartoon Studio is where the video is built. This page keeps the idea and the script notes.</WashCopy>
      <DeskField label="Title" value={form.title} onChangeText={form.setTitle} placeholder="Name this video" />
      <DeskField
        label="Idea"
        value={form.body}
        onChangeText={form.setBody}
        placeholder="What happens in the video?"
        multiline
      />
      <DeskNotice message={form.notice} />
      <DeskPrimary label="Save draft" onPress={() => void form.save()} loading={form.saving} />
      <DeskLink label="Open Cartoon Studio" onPress={() => router.push("/cartoon-studio")} />
      <DeskLink
        label="Ask ContentMate for a script"
        onPress={() =>
          router.push({
            pathname: "/ai/[creatorId]",
            params: {
              creatorId: "contentmate",
              prompt: `Write a short video script titled "${form.title || "Untitled"}". Idea: ${form.body || "a short how-to."}`,
            },
          })
        }
      />
    </CreateDeskScreen>
  );
}
