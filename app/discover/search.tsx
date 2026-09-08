import { ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { PlatformSearchPanel } from "@/components/platform-search-panel";

export default function PlatformSearchScreen() {
  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TabScreenHeader
          icon="🔍"
          title="Search UR"
          subtitle="Find specialists, creators, videos, posts, and shop items — inside this platform only."
        />
        <PlatformSearchPanel />
      </ScrollView>
    </ScreenContainer>
  );
}
