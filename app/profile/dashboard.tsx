import { View, Text, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function DashboardScreen() {
  const colors = useColors();

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 py-6">
          <Text className="text-3xl font-bold text-foreground mb-2">Dashboard</Text>
          <Text className="text-base text-muted mb-6">
            Your creator statistics and overview
          </Text>

          <View className="gap-4">
            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-sm text-muted mb-2">Total Followers</Text>
              <Text className="text-3xl font-bold text-foreground">12,450</Text>
            </View>

            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-sm text-muted mb-2">Total Views</Text>
              <Text className="text-3xl font-bold text-foreground">245,680</Text>
            </View>

            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-sm text-muted mb-2">Engagement Rate</Text>
              <Text className="text-3xl font-bold text-primary">8.5%</Text>
            </View>

            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-sm text-muted mb-2">Content Posted</Text>
              <Text className="text-3xl font-bold text-foreground">156</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
