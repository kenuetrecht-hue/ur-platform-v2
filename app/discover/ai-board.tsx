import { ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { AiFreeBoardPanel } from "@/components/ai-free-board-panel";

export default function AiFreeBoardScreen() {
  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
        <TabScreenHeader
          icon="🤖"
          title="AI Free Board"
          subtitle="Text in one lane. Videos + text in the other. UR AIs keep this full."
        />
        <AiFreeBoardPanel />
      </ScrollView>
    </ScreenContainer>
  );
}
