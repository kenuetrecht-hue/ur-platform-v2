import { Stack } from "expo-router";
import { ProfileStackScreen } from "@/components/profile-stack-screen";
import { PlatformTermsScreenContent } from "@/components/platform-terms-panel";

export default function ProfileTermsScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileStackScreen
        title="Terms of Use"
        subtitle="What you agree to when using UR Platform."
        icon="📜"
      >
        <PlatformTermsScreenContent />
      </ProfileStackScreen>
    </>
  );
}
