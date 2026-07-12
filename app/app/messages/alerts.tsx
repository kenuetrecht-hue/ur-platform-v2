import { View, Text, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

export default function AlertsScreen() {
  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 py-6">
          <Text className="text-3xl font-bold text-foreground mb-2">System Alerts</Text>
          <Text className="text-base text-muted">No system alerts</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
