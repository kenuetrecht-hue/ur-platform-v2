import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

export default function HelpScreen() {
  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 py-6">
          <Text className="text-3xl font-bold text-foreground mb-2">Help & Support</Text>
          <Text className="text-base text-muted mb-6">Get help and support</Text>

          <View className="gap-3">
            <TouchableOpacity className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-base font-semibold text-foreground">FAQ</Text>
              <Text className="text-sm text-muted mt-1">Frequently asked questions</Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-base font-semibold text-foreground">Contact Support</Text>
              <Text className="text-sm text-muted mt-1">Email: support@urplatform.com</Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-base font-semibold text-foreground">Documentation</Text>
              <Text className="text-sm text-muted mt-1">View creator guidelines</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
