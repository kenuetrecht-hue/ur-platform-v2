import { useState } from "react";
import { Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { AgeKycPhotoCapture } from "@/components/age-kyc-photo-capture";
import { SignupKycCartoonSample } from "@/components/signup-kyc-cartoon-sample";
import { countFilledAgeKycSlots, type AgeKycPickedPhoto } from "@/lib/age-kyc-photo-picker";
import { loadAgeKycDraft, saveAgeKycDraftSlot } from "@/lib/age-kyc-draft-store";

/** Uri talks and the three cameras sit on login / signup — no extra page hop. */
export function IdCheckDuringSignin() {
  const colors = useColors();
  const initial = loadAgeKycDraft();
  const [front, setFront] = useState<AgeKycPickedPhoto | null>(initial.front);
  const [back, setBack] = useState<AgeKycPickedPhoto | null>(initial.back);
  const [selfie, setSelfie] = useState<AgeKycPickedPhoto | null>(initial.selfie);
  const [error, setError] = useState<string | null>(null);

  const recordPhoto = (slot: "front" | "back" | "selfie", photo: AgeKycPickedPhoto) => {
    setError(null);
    saveAgeKycDraftSlot(slot, photo);
    if (slot === "front") setFront(photo);
    if (slot === "back") setBack(photo);
    if (slot === "selfie") setSelfie(photo);
  };

  const filled = countFilledAgeKycSlots({ front, back, selfie });

  return (
    <View style={{ gap: 14, width: "100%" }} testID="id-check-during-signin">
      <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 20 }}>
        Hear Uri, then take the three pictures
      </Text>
      <Text style={{ color: colors.foreground, fontSize: 15, lineHeight: 22, fontWeight: "700" }}>
        Tap Hear Uri. He talks while you photograph ID front, ID back, and a selfie on this same page.
      </Text>
      <SignupKycCartoonSample />
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
      {error ? <Text style={{ color: "#c0392b", fontSize: 13 }}>{error}</Text> : null}
    </View>
  );
}
