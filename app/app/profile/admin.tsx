import { View, Text, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

export default function AdminScreen() {
  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 py-6">
          <Text className="text-3xl font-bold text-foreground mb-2">Admin Panel</Text>
          <Text className="text-base text-muted">Biometric authentication required</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
