import { useEffect } from "react";
import { Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { AFTER_SIGN_IN_HREF } from "@/lib/after-sign-in";

/** Big control that always opens the ID / selfie page. */
export function GoToIdPhotosButton({ label = "Open ID photo page" }: { label?: string }) {
  const colors = useColors();
  const router = useRouter();
  return (
    <View style={{ gap: 8 }}>
      <PrimaryActionButton
        testID="go-to-id-photos"
        label={label}
        onPress={() => router.push(AFTER_SIGN_IN_HREF)}
        backgroundColor={colors.primary}
      />
      <Link
        href={AFTER_SIGN_IN_HREF}
        style={{ color: colors.primary, fontWeight: "800", fontSize: 16, textAlign: "center" }}
      >
        If the button does nothing, tap this link
      </Link>
    </View>
  );
}

/** After sign-in: auto-open the photo page, and keep a button if auto-open does not fire. */
export function PostSignInAgeVerifyGate() {
  const colors = useColors();
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(AFTER_SIGN_IN_HREF);
    }, 250);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 24,
        gap: 16,
        backgroundColor: colors.background,
      }}
      testID="post-sign-in-age-verify-gate"
    >
      <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 26 }}>
        Sign-in worked
      </Text>
      <Text style={{ color: colors.foreground, fontSize: 18, lineHeight: 26, fontWeight: "700" }}>
        Next step: photograph your ID front, ID back, and a selfie.
      </Text>
      <PrimaryActionButton
        testID="go-to-id-photos-auto"
        label="Open ID photo page"
        onPress={() => router.replace(AFTER_SIGN_IN_HREF)}
        backgroundColor={colors.primary}
      />
      <Link href={AFTER_SIGN_IN_HREF} style={{ color: colors.primary, fontWeight: "800", fontSize: 16, textAlign: "center" }}>
        If nothing happened, tap here for ID photos
      </Link>
    </View>
  );
}
