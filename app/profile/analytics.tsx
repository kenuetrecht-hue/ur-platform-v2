import { View, Text, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function AnalyticsScreen() {
  const colors = useColors();

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 py-6">
          <Text className="text-3xl font-bold text-foreground mb-2">Analytics</Text>
          <Text className="text-base text-muted mb-6">
            Detailed performance metrics
          </Text>

          <View className="gap-4">
            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-sm text-muted mb-2">This Week</Text>
              <Text className="text-2xl font-bold text-foreground">+2,450 views</Text>
              <Text className="text-xs text-success mt-1">↑ 12% from last week</Text>
            </View>

            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-sm text-muted mb-2">Top Content</Text>
              <Text className="text-base font-semibold text-foreground">Video Title</Text>
              <Text className="text-xs text-muted mt-1">45,230 views</Text>
            </View>

            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-sm text-muted mb-2">Audience Demographics</Text>
              <Text className="text-base font-semibold text-foreground">18-24: 45%</Text>
              <Text className="text-base font-semibold text-foreground">25-34: 35%</Text>
              <Text className="text-base font-semibold text-foreground">35+: 20%</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
