import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { consolidatedNavigation } from "@/lib/consolidated-navigation";

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const subMenu = consolidatedNavigation.getSubMenu("profile");

  const handleSubMenuPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 py-6">
          <Text className="text-3xl font-bold text-foreground mb-2">Profile</Text>
          <Text className="text-base text-muted mb-6">
            Manage your account and settings
          </Text>

          <View className="gap-3">
            {subMenu.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleSubMenuPress(item.route)}
                className="bg-surface rounded-lg p-4 border border-border flex-row items-center justify-between active:opacity-70"
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="w-12 h-12 rounded-lg bg-primary/10 items-center justify-center">
                    <IconSymbol
                      name={item.icon as any || "person.fill"}
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">
                      {item.label}
                    </Text>
                  </View>
                </View>
                <IconSymbol
                  name="chevron.right"
                  size={20}
                  color={colors.muted}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
