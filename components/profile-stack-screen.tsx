import { ScrollView, View, Pressable, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export type ProfileStackScreenProps = {
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
};

export function ProfileStackScreen({ title, subtitle, icon, children }: ProfileStackScreenProps) {
  const colors = useColors();
  const router = useRouter();

  return (
    <ScreenContainer className="bg-background">
      <Pressable
        onPress={() => router.back()}
        style={styles.backRow}
        accessibilityRole="button"
        accessibilityLabel="Back to profile"
      >
        <IconSymbol name="chevron.left" size={20} color={colors.primary} />
        <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 15 }}>Profile</Text>
      </Pressable>
      <TabScreenHeader title={title} subtitle={subtitle} icon={icon} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, gap: 16 }}>{children}</View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
});
