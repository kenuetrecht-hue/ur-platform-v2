import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { AgeKycPhotoCapture } from "@/components/age-kyc-photo-capture";
import { SignupKycCartoonSample } from "@/components/signup-kyc-cartoon-sample";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { countFilledAgeKycSlots, type AgeKycPickedPhoto } from "@/lib/age-kyc-photo-picker";
import { loadAgeKycDraft, saveAgeKycDraftSlot } from "@/lib/age-kyc-draft-store";
import { clearAgeKycPassToken, getAgeKycPassToken, setAgeKycPassToken } from "@/lib/age-kyc-pass-store";
import { ID_MUST_PASS_FIRST } from "@/lib/signup-step-copy";
import { trpc } from "@/lib/trpc";
import type { AgeKycDocumentType } from "@/lib/age-kyc-policy";

const DOCS: { id: AgeKycDocumentType; label: string }[] = [
  { id: "driver_license", label: "Driver license" },
  { id: "state_id", label: "State ID" },
  { id: "passport", label: "Passport" },
  { id: "national_id", label: "National ID" },
];

type Props = {
  onPassed: (passToken: string) => void;
  onReset?: () => void;
};

/** Uri talks and the three cameras sit on login / signup — check first, then unlock the form. */
export function IdCheckDuringSignin({ onPassed, onReset }: Props) {
  const colors = useColors();
  const initial = loadAgeKycDraft();
  const [documentType, setDocumentType] = useState<AgeKycDocumentType>("driver_license");
  const [front, setFront] = useState<AgeKycPickedPhoto | null>(initial.front);
  const [back, setBack] = useState<AgeKycPickedPhoto | null>(initial.back);
  const [selfie, setSelfie] = useState<AgeKycPickedPhoto | null>(initial.selfie);
  const [error, setError] = useState<string | null>(null);
  const [passed, setPassed] = useState(() => Boolean(getAgeKycPassToken()));
  const [turnstileToken, setTurnstileToken] = useState("");

  const precheck = trpc.ageKyc.precheck.useMutation({
    onSuccess: (data) => {
      if (data.verified && data.passToken) {
        setAgeKycPassToken(data.passToken);
        setPassed(true);
        setError(null);
        onPassed(data.passToken);
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
      setError(err.message);
    },
  });

  useEffect(() => {
    const existing = getAgeKycPassToken();
    if (existing) onPassed(existing);
  }, [onPassed]);

  const recordPhoto = (slot: "front" | "back" | "selfie", photo: AgeKycPickedPhoto) => {
    setError(null);
    if (passed) {
      setPassed(false);
      clearAgeKycPassToken();
      onReset?.();
    }
    saveAgeKycDraftSlot(slot, photo);
    if (slot === "front") setFront(photo);
    if (slot === "back") setBack(photo);
    if (slot === "selfie") setSelfie(photo);
  };

  const filled = countFilledAgeKycSlots({ front, back, selfie });

  const onCheck = () => {
    if (!front || !back || !selfie) {
      setError("Photograph the ID front, ID back, and a selfie first.");
      return;
    }
    setError(null);
    precheck.mutate({
      documentType,
      idFront: { mimeType: front.mimeType, base64: front.base64 },
      idBack: { mimeType: back.mimeType, base64: back.base64 },
      selfie: { mimeType: selfie.mimeType, base64: selfie.base64 },
      turnstileToken: turnstileToken || undefined,
    });
  };

  return (
    <View style={{ gap: 14, width: "100%" }} testID="id-check-during-signin">
      <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 20 }}>
        Hear Uri, then take the three pictures
      </Text>
      <Text style={{ color: colors.foreground, fontSize: 15, lineHeight: 22, fontWeight: "700" }}>
        Tap Hear Uri. He talks while you photograph ID front, ID back, and a selfie on this same page.
      </Text>
      <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20 }}>{ID_MUST_PASS_FIRST}</Text>
      <SignupKycCartoonSample />
      <Text style={{ color: colors.foreground, fontWeight: "700" }}>ID type</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {DOCS.map((doc) => (
          <Pressable
            key={doc.id}
            onPress={() => setDocumentType(doc.id)}
            style={{
              borderWidth: 1,
              borderColor: documentType === doc.id ? colors.primary : colors.border,
              backgroundColor: colors.surface,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>{doc.label}</Text>
          </Pressable>
        ))}
      </View>
      <AgeKycPhotoCapture
        front={front}
        back={back}
        selfie={selfie}
        onPicked={recordPhoto}
        onError={setError}
      />
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
        {filled} of 3 pictures recorded
      </Text>
      <TurnstileWidget action="age_kyc" onToken={setTurnstileToken} />
      <PrimaryActionButton
        label="Check my three pictures"
        loadingLabel="Checking pictures…"
        loading={precheck.isPending}
        onPress={onCheck}
        backgroundColor={colors.primary}
        testID="id-check-submit"
      />
      {passed ? (
        <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 15 }} testID="id-check-passed">
          Pictures passed. You can create the account or sign in now.
        </Text>
      ) : null}
      {error ? <Text style={{ color: "#c0392b", fontSize: 13 }}>{error}</Text> : null}
    </View>
  );
}
