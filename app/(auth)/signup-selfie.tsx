import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SignupDoorShell } from "@/components/signup-door-shell";
import { SignupSelfieCheck } from "@/components/signup-selfie-check";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { useEnterAppAfterPictures } from "@/hooks/use-enter-app-after-pictures";
import { JOIN_ID_PHOTOS_HREF } from "@/lib/after-sign-in";
import { canContinueToSelfiePage } from "@/lib/age-kyc-wizard";
import { loadAgeKycDraft } from "@/lib/age-kyc-draft-store";
import { useColors } from "@/hooks/use-colors";

/** Selfie + review + check. ID cameras are unmounted. */
export default function SignupSelfieScreen() {
  const colors = useColors();
  const router = useRouter();
  const { busy, error, status, enterAfterPictures } = useEnterAppAfterPictures();
  const [allowed] = useState(() => canContinueToSelfiePage(loadAgeKycDraft()));

  useEffect(() => {
    if (!allowed) router.replace(JOIN_ID_PHOTOS_HREF);
  }, [allowed, router]);

  if (!allowed) return null;

  return (
    <SignupDoorShell
      title="Selfie"
      lede="One live selfie to match the ID. Then review and tap Check my ID and selfie. We log you in after it passes."
      testID="signup-selfie-form"
      backHref={JOIN_ID_PHOTOS_HREF}
      backLabel="← Back to ID pictures"
    >
      <SignupSelfieCheck onPassed={() => void enterAfterPictures()} />
      {error ? (
        <Text style={{ color: "#c0392b", fontSize: 14, lineHeight: 20 }}>{error}</Text>
      ) : null}
      {status && !error ? (
        <Text style={{ color: colors.primary, fontWeight: "700" }}>{status}</Text>
      ) : null}
      <View style={{ height: 4 }} />
      <PrimaryActionButton
        label="Login now"
        loadingLabel="Logging you in…"
        loading={busy}
        onPress={() => void enterAfterPictures()}
        backgroundColor={colors.primary}
        testID="signup-selfie-login"
      />
    </SignupDoorShell>
  );
}
