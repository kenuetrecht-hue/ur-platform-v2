import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { CreateDeskScreen, DeskLink, WashCopy } from "@/components/create-desk-screen";
import { LETTERING_ON_COLOR } from "@/lib/gold-lettering";
import { CREATE_TEMPLATES } from "@/lib/create-desk";

export default function CreateTemplatesScreen() {
  const router = useRouter();

  return (
    <CreateDeskScreen
      icon="📋"
      title="Templates"
      subtitle="Start from a ready shape. Each one opens the page that does that job."
    >
      <WashCopy>Pick one. Video, text, and picture templates open with the starter already filled in.</WashCopy>
      {CREATE_TEMPLATES.map((template) => (
        <View key={template.id} style={{ gap: 6 }}>
          <Text style={{ color: LETTERING_ON_COLOR, fontWeight: "800", fontSize: 16 }}>{template.label}</Text>
          <Text style={{ color: LETTERING_ON_COLOR, fontSize: 13, lineHeight: 18 }}>{template.detail}</Text>
          <DeskLink
            label={`Open ${template.label}`}
            onPress={() =>
              router.push({
                pathname: template.route,
                params: template.kind ? { template: template.id } : {},
              })
            }
          />
        </View>
      ))}
    </CreateDeskScreen>
  );
}
