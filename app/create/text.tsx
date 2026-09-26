import { useRouter } from "expo-router";
import { CreateDeskScreen, DeskField, DeskLink, DeskNotice, DeskPrimary, WashCopy } from "@/components/create-desk-screen";
import { useCreateDraftForm } from "@/components/use-create-draft-form";

export default function CreateTextScreen() {
  const router = useRouter();
  const form = useCreateDraftForm("text");

  return (
    <CreateDeskScreen
      icon="📝"
      title="New text"
      subtitle="Write the post here. Author Muse and ContentMate can help finish it."
    >
      <WashCopy>Saving keeps this writing in Drafts on this phone or computer.</WashCopy>
      <DeskField label="Title" value={form.title} onChangeText={form.setTitle} placeholder="Name this writing" />
      <DeskField
        label="Writing"
        value={form.body}
        onChangeText={form.setBody}
        placeholder="Start the caption, post, or script."
        multiline
      />
      <DeskNotice message={form.notice} />
      <DeskPrimary label="Save draft" onPress={() => void form.save()} loading={form.saving} />
      <DeskLink
        label="Ask Author Muse"
        onPress={() =>
          router.push({
            pathname: "/ai/[creatorId]",
            params: {
              creatorId: "ai-author-001",
              prompt: `Help me finish this writing titled "${form.title || "Untitled"}": ${form.body || "Start a short post."}`,
            },
          })
        }
      />
      <DeskLink
        label="Ask ContentMate"
        onPress={() =>
          router.push({
            pathname: "/ai/[creatorId]",
            params: {
              creatorId: "contentmate",
              prompt: `Tighten this creator post titled "${form.title || "Untitled"}": ${form.body || "Start a short caption."}`,
            },
          })
        }
      />
    </CreateDeskScreen>
  );
}
