import { ScrollView } from "react-native";
import { Stack } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { FaceFilterStage } from "@/components/face-filter-stage";

export default function FaceFiltersScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer>
        <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 12 }}>
          <TabScreenHeader icon="📸" title="Face filters" subtitle="A look on your face, then a picture." />
          <FaceFilterStage />
        </ScrollView>
      </ScreenContainer>
    </>
  );
}
