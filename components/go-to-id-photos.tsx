import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { AFTER_ID_PASS_HREF, JOIN_ACCOUNT_HREF } from "@/lib/after-sign-in";
import { trpc } from "@/lib/trpc";
import { explainAuthFailure } from "@/lib/auth-network-error";
import { hasAgeKycPassToken } from "@/lib/age-kyc-pass-store";
import { claimStoredAgeKycPass } from "@/lib/claim-stored-age-kyc-pass";
import { PICTURES_PASSED_SIGN_IN_NEXT } from "@/lib/signup-step-copy";

/** Big control that always opens the ID / selfie page. */
export function GoToIdPhotosButton({ label = "Open ID photo page" }: { label?: string }) {
  const colors = useColors();
  const router = useRouter();
  return (
    <View style={{ gap: 8 }}>
      <PrimaryActionButton
        testID="go-to-id-photos"
        label={label}
        onPress={() => router.push(JOIN_ACCOUNT_HREF)}
        backgroundColor={colors.primary}
      />
      <Link
        href={JOIN_ACCOUNT_HREF}
        style={{ color: colors.primary, fontWeight: "800", fontSize: 16, textAlign: "center" }}
      >
        If the button does nothing, tap this link
      </Link>
    </View>
  );
}

/** After sign-in: attach an already-passed photo check, or open the photo page. */
export function PostSignInAgeVerifyGate() {
  const colors = useColors();
  const router = useRouter();
  const claimPass = trpc.ageKyc.claimPass.useMutation();
  const [hint, setHint] = useState<string | null>(null);
  const started = useRef(false);
  const picturesAlreadyPassed = hasAgeKycPassToken();

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (picturesAlreadyPassed) {
      void claimStoredAgeKycPass((input) => claimPass.mutateAsync(input))
        .then((claimed) => {
          router.replace(claimed ? AFTER_ID_PASS_HREF : JOIN_ACCOUNT_HREF);
        })
        .catch((err) => {
          setHint(explainAuthFailure(err));
          router.replace(JOIN_ACCOUNT_HREF);
        });
      return;
    }

    const timer = setTimeout(() => {
      router.replace(JOIN_ACCOUNT_HREF);
    }, 250);
    return () => clearTimeout(timer);
  }, [claimPass, picturesAlreadyPassed, router]);

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
        Login worked
      </Text>
      <Text style={{ color: colors.foreground, fontSize: 18, lineHeight: 26, fontWeight: "700" }}>
        {picturesAlreadyPassed
          ? PICTURES_PASSED_SIGN_IN_NEXT
          : "Next step: photograph your ID front, ID back, and a selfie."}
      </Text>
      {hint ? (
        <Text style={{ color: "#c0392b", fontSize: 14, lineHeight: 20 }}>{hint}</Text>
      ) : null}
      <PrimaryActionButton
        testID="go-to-id-photos-auto"
        label={picturesAlreadyPassed ? "Open the app" : "Open ID photo page"}
        onPress={() => router.replace(picturesAlreadyPassed ? AFTER_ID_PASS_HREF : JOIN_ACCOUNT_HREF)}
        backgroundColor={colors.primary}
      />
      <Link
        href={picturesAlreadyPassed ? AFTER_ID_PASS_HREF : JOIN_ACCOUNT_HREF}
        style={{ color: colors.primary, fontWeight: "800", fontSize: 16, textAlign: "center" }}
      >
        If nothing happened, tap here
      </Link>
    </View>
  );
}
