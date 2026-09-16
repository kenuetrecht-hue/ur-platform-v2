import type { ReactNode } from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { PageBackButton } from "@/components/page-back-button";

export type ProfileStackScreenProps = {
  title: string;
  subtitle?: string;
  icon?: string;
  children: ReactNode;
};

export function ProfileStackScreen({ title, subtitle, icon, children }: ProfileStackScreenProps) {
  return (
    <ScreenContainer className="bg-background">
      <View style={styles.backRow}>
        <PageBackButton label="← Back" />
      </View>
      <TabScreenHeader title={title} subtitle={subtitle} icon={icon} showBack={false} />
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
