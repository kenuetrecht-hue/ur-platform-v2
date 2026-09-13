import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SignupDoorShell } from "@/components/signup-door-shell";
import { SignupSelfieCheck } from "@/components/signup-selfie-check";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { useEnterAppAfterPictures } from "@/hooks/use-enter-app-after-pictures";
import { JOIN_ID_PHOTOS_HREF } from "@/lib/after-sign-in";
import { canOpenSelfieAfterIdCheck } from "@/lib/age-kyc-wizard";
import { loadAgeKycDraft } from "@/lib/age-kyc-draft-store";
import { hasAgeKycDocumentToken } from "@/lib/age-kyc-document-token-store";
import { isExistingAccountJoinError, loginHrefForExistingAccount } from "@/lib/existing-join-login";
import { loadJoinAccountDraft } from "@/lib/join-account-draft";
import { sendPasswordResetEmail } from "@/lib/send-password-reset";
import { explainAuthFailure } from "@/lib/auth-network-error";
import { useColors } from "@/hooks/use-colors";

/** Selfie + review + check. ID cameras are unmounted. */
export default function SignupSelfieScreen() {
  const colors = useColors();
  const router = useRouter();
  const { busy, error, status, setError, enterAfterPictures } = useEnterAppAfterPictures();
  const [allowed] = useState(() => {
    const draft = loadAgeKycDraft();
    return canOpenSelfieAfterIdCheck({
      front: draft.front,
      back: draft.back,
      documentChecked: hasAgeKycDocumentToken(),
    });
  });
  const existingAccount = Boolean(error && isExistingAccountJoinError(error));

  useEffect(() => {
    if (!allowed) router.replace(JOIN_ID_PHOTOS_HREF);
  }, [allowed, router]);

  if (!allowed) return null;

  return (
    <SignupDoorShell
      title="Selfie · Step 3 of 3"
      lede="The ID already passed. One live selfie. We match this face to the face on the ID."
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
        label={existingAccount ? "Back to Login" : "Login now"}
        loadingLabel="Logging you in…"
        loading={busy}
        onPress={() => {
          if (existingAccount) {
            router.replace(loginHrefForExistingAccount());
            return;
          }
          void enterAfterPictures();
        }}
        backgroundColor={colors.primary}
        testID="signup-selfie-login"
      />
      {existingAccount ? (
        <PrimaryActionButton
          label="Send a new password to this email"
          onPress={() => {
            void (async () => {
              try {
                await sendPasswordResetEmail(loadJoinAccountDraft().email);
                setError(
                  "Check your inbox. Open the link, type a new password twice, then Login. You do not take the pictures again.",
                );
              } catch (err) {
                setError(explainAuthFailure(err));
              }
            })();
          }}
          backgroundColor={colors.muted}
          testID="signup-selfie-reset-password"
        />
      ) : null}
    </SignupDoorShell>
  );
}
