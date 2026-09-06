import { ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { FairShowFeedPanel } from "@/components/fair-show-feed-panel";

export default function FairShowDiscoverScreen() {
  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <TabScreenHeader
          icon="📈"
          title="Fair Show"
          subtitle="Everyone gets a turn. Stay-on-video beats vanity views."
        />
        <FairShowFeedPanel />
      </ScrollView>
    </ScreenContainer>
  );
}
