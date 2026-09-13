import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { AgeKycPhotoCapture } from "@/components/age-kyc-photo-capture";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { TapToRead } from "@/components/tap-to-read";
import { JOIN_ID_PHOTOS_HREF } from "@/lib/after-sign-in";
import { countFilledAgeKycSlots, prepareAgeKycPhoto, type AgeKycPickedPhoto } from "@/lib/age-kyc-photo-picker";
import { fastPrecheckAgeKyc } from "@/lib/age-kyc-fast-precheck";
import { explainAuthFailure } from "@/lib/auth-network-error";
import { loadAgeKycDraft, saveAgeKycDraftSlot } from "@/lib/age-kyc-draft-store";
import { clearAgeKycPassToken, getAgeKycPassToken, setAgeKycPassToken } from "@/lib/age-kyc-pass-store";
import { trpc } from "@/lib/trpc";

type Props = {
  onPassed: (passToken: string) => void;
  onReset?: () => void;
};

/** Selfie page: one front camera, then review + one check. No ID cameras. */
export function SignupSelfieCheck({ onPassed, onReset }: Props) {
  const colors = useColors();
  const router = useRouter();
  const initial = loadAgeKycDraft();
  const [front, setFront] = useState<AgeKycPickedPhoto | null>(initial.front);
  const [back, setBack] = useState<AgeKycPickedPhoto | null>(initial.back);
  const [selfie, setSelfie] = useState<AgeKycPickedPhoto | null>(initial.selfie);
  const [error, setError] = useState<string | null>(null);
  const [passed, setPassed] = useState(() => Boolean(getAgeKycPassToken()));
  const [turnstileToken, setTurnstileToken] = useState("");
  const [checking, setChecking] = useState(false);
  const notifiedPassRef = useRef(false);

  const precheck = trpc.ageKyc.precheck.useMutation({
    onSuccess: (data) => {
      if (data.verified && data.passToken) {
        setAgeKycPassToken(data.passToken);
        setPassed(true);
        setError(null);
        if (!notifiedPassRef.current) {
          notifiedPassRef.current = true;
          onPassed(data.passToken);
        }
        return;
      }
      clearAgeKycPassToken();
      setPassed(false);
      onReset?.();
      setError(data.rejectionReason ?? "The pictures did not pass. Try again with a clearer ID and selfie.");
    },
    onError: (err) => {
      setPassed(false);
      onReset?.();
      setError(explainAuthFailure(err));
    },
  });

  useEffect(() => {
    const existing = getAgeKycPassToken();
    if (existing && !notifiedPassRef.current) {
      notifiedPassRef.current = true;
      onPassed(existing);
    }
    // Only once on open — a changing onPassed must not re-fire Login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recordPhoto = (slot: "front" | "back" | "selfie", photo: AgeKycPickedPhoto) => {
    if (slot !== "selfie") return;
    setError(null);
    if (passed) {
      setPassed(false);
      clearAgeKycPassToken();
      onReset?.();
    }
    void prepareAgeKycPhoto(photo).then((ready) => {
      saveAgeKycDraftSlot("selfie", ready);
      setSelfie(ready);
    });
  };

  const filled = countFilledAgeKycSlots({ front, back, selfie });

  const onCheck = () => {
    if (!front || !back || !selfie) {
      setError("Photograph the ID front, ID back, and a selfie first.");
      return;
    }
    setError(null);
    setChecking(true);
    void (async () => {
      try {
        const result = await fastPrecheckAgeKyc({
          documentType: loadAgeKycDraft().documentType,
          idFront: front,
          idBack: back,
          selfie,
          turnstileToken: turnstileToken || undefined,
        });
        if (result.verified && result.passToken) {
          setAgeKycPassToken(result.passToken);
          setPassed(true);
          setError(null);
          if (!notifiedPassRef.current) {
            notifiedPassRef.current = true;
            onPassed(result.passToken);
          }
          return;
        }
        clearAgeKycPassToken();
        setPassed(false);
        onReset?.();
        setError(result.rejectionReason ?? "The pictures did not pass. Try again with a clearer ID and selfie.");
      } catch (err) {
        const msg = explainAuthFailure(err);
        const lower = msg.toLowerCase();
        if (
          lower.includes("did not finish") ||
          lower.includes("timed out") ||
          lower.includes("timeout")
        ) {
          setError(msg);
          return;
        }
        precheck.mutate({
          documentType: loadAgeKycDraft().documentType,
          idFront: { mimeType: front.mimeType, base64: front.base64 },
          idBack: { mimeType: back.mimeType, base64: back.base64 },
          selfie: { mimeType: selfie.mimeType, base64: selfie.base64 },
          turnstileToken: turnstileToken || undefined,
        });
      } finally {
        setChecking(false);
      }
    })();
  };

  return (
    <View style={{ gap: 14, width: "100%" }} testID="signup-selfie-check">
      <Text style={{ color: colors.foreground, fontSize: 15, lineHeight: 22 }}>
        This selfie must match the person on the ID. Then tap Check my ID and selfie.
      </Text>
      <TapToRead title="How to line up the yellow box">
        Put your face in the yellow circle. Wait until Take this picture turns on, then tap it
        once. Review the three pictures, then check them.
      </TapToRead>
      {passed ? null : (
        <AgeKycPhotoCapture
          phase="selfie"
          front={front}
          back={back}
          selfie={selfie}
          onPicked={recordPhoto}
          onError={setError}
          onRetakeId={() => router.replace(JOIN_ID_PHOTOS_HREF)}
        />
      )}
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
        {filled} of 3 pictures recorded
      </Text>
      <TurnstileWidget action="age_kyc" onToken={setTurnstileToken} />
      <PrimaryActionButton
        label="Check my ID and selfie"
        loadingLabel="Checking pictures…"
        loading={checking || precheck.isPending}
        onPress={onCheck}
        backgroundColor={colors.primary}
        testID="id-check-submit"
      />
      {passed ? (
        <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 15 }} testID="id-check-passed">
          Pictures passed. Logging you in with the email and password you typed on Sign up…
        </Text>
      ) : null}
      {error ? <Text style={{ color: "#c0392b", fontSize: 13 }}>{error}</Text> : null}
    </View>
  );
}
