import { View, Text, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

export default function DirectMessagesScreen() {
  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 py-6">
          <Text className="text-3xl font-bold text-foreground mb-2">Direct Messages</Text>
          <Text className="text-base text-muted">No messages yet</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
