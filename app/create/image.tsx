import { useState } from "react";
import { Image, View } from "react-native";
import { useRouter } from "expo-router";
import { CreateDeskScreen, DeskField, DeskLink, DeskNotice, DeskPrimary, WashCopy } from "@/components/create-desk-screen";
import { useCreateDraftForm } from "@/components/use-create-draft-form";
import { trpc } from "@/lib/trpc";

const RATIOS = ["1:1", "9:16", "16:9"] as const;

export default function CreateImageScreen() {
  const router = useRouter();
  const form = useCreateDraftForm("image");
  const [ratio, setRatio] = useState<(typeof RATIOS)[number]>("1:1");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const generate = trpc.aiCreators.generateImage.useMutation();

  async function makeImage() {
    const prompt = form.body.trim();
    if (!prompt) {
      form.setNotice("Write what the picture should show.");
      return;
    }
    form.setNotice(null);
    try {
      const result = await generate.mutateAsync({
        creatorId: "contentmate",
        prompt,
        aspectRatio: ratio,
      });
      setImageUrl(result.url);
      form.setNotice("Picture ready. Save the prompt in Drafts if you want it again.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not make that picture.";
      form.setNotice(message);
    }
  }

  return (
    <CreateDeskScreen
      icon="🖼️"
      title="New image"
      subtitle="Describe the picture. ContentMate draws it when image credits are available."
    >
      <WashCopy>The words stay in Drafts on this device. The picture itself is made by ContentMate.</WashCopy>
      <DeskField label="Name" value={form.title} onChangeText={form.setTitle} placeholder="Name this picture" />
      <DeskField
        label="What should the picture show?"
        value={form.body}
        onChangeText={form.setBody}
        placeholder="A clear picture of…"
        multiline
      />
      <View style={{ gap: 8 }}>
        {RATIOS.map((item) => (
          <DeskLink key={item} label={item === ratio ? `${item} selected` : item} onPress={() => setRatio(item)} />
        ))}
      </View>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          accessibilityLabel="Generated picture"
          style={{ width: "100%", height: 280, borderRadius: 12 }}
          resizeMode="contain"
        />
      ) : null}
      <DeskNotice message={form.notice} />
      <DeskPrimary label="Make picture" onPress={() => void makeImage()} loading={generate.isPending} />
      <DeskPrimary label="Save draft" onPress={() => void form.save()} loading={form.saving} />
      <DeskLink
        label="Open Logo & Brand"
        onPress={() =>
          router.push({
            pathname: "/ai/[creatorId]",
            params: {
              creatorId: "ai-logo-brand-001",
              prompt: form.body.trim() || "Help me describe a simple logo.",
            },
          })
        }
      />
    </CreateDeskScreen>
  );
}
