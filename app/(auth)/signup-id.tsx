import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { SignupDoorShell } from "@/components/signup-door-shell";
import { SignupIdPictures } from "@/components/signup-id-pictures";
import { JOIN_ACCOUNT_HREF } from "@/lib/after-sign-in";
import { canContinueToIdPictures, loadJoinAccountDraft } from "@/lib/join-account-draft";

/** ID pictures only. Account form is unmounted. Selfie is the next page. */
export default function SignupIdScreen() {
  const router = useRouter();
  const [allowed] = useState(() => canContinueToIdPictures(loadJoinAccountDraft()));

  useEffect(() => {
    if (!allowed) router.replace(JOIN_ACCOUNT_HREF);
  }, [allowed, router]);

  if (!allowed) return null;

  return (
    <SignupDoorShell
      title="ID pictures · Step 2 of 3"
      lede="Photograph the front of your ID, then the back. One live camera. Then continue to the selfie page."
      testID="signup-id-form"
      backHref={JOIN_ACCOUNT_HREF}
      backLabel="← Back to Sign up"
    >
      <SignupIdPictures />
    </SignupDoorShell>
  );
}
