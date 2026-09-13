import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { AgeKycPhotoCapture } from "@/components/age-kyc-photo-capture";
import { SignupKycCartoonSample } from "@/components/signup-kyc-cartoon-sample";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { TapToRead } from "@/components/tap-to-read";
import { JOIN_SELFIE_HREF } from "@/lib/after-sign-in";
import {
  loadAgeKycDraft,
  saveAgeKycDocumentType,
  saveAgeKycDraftSlot,
} from "@/lib/age-kyc-draft-store";
import { canContinueToSelfiePage } from "@/lib/age-kyc-wizard";
import { prepareAgeKycPhoto, type AgeKycPickedPhoto } from "@/lib/age-kyc-photo-picker";
import type { AgeKycDocumentType } from "@/lib/age-kyc-policy";

const DOCS: { id: AgeKycDocumentType; label: string }[] = [
  { id: "driver_license", label: "Driver license" },
  { id: "state_id", label: "State ID" },
  { id: "passport", label: "Passport" },
  { id: "national_id", label: "National ID" },
];

/** ID page only: front then back. No selfie camera. No account form. */
export function SignupIdPictures() {
  const colors = useColors();
  const router = useRouter();
  const initial = loadAgeKycDraft();
  const [documentType, setDocumentType] = useState<AgeKycDocumentType>(initial.documentType);
  const [front, setFront] = useState<AgeKycPickedPhoto | null>(initial.front);
  const [back, setBack] = useState<AgeKycPickedPhoto | null>(initial.back);
  const [error, setError] = useState<string | null>(null);

  const recordPhoto = (slot: "front" | "back" | "selfie", photo: AgeKycPickedPhoto) => {
    if (slot === "selfie") return;
    setError(null);
    void prepareAgeKycPhoto(photo).then((ready) => {
      saveAgeKycDraftSlot(slot, ready);
      if (slot === "front") setFront(ready);
      if (slot === "back") setBack(ready);
    });
  };

  const onPickDoc = (id: AgeKycDocumentType) => {
    setDocumentType(id);
    saveAgeKycDocumentType(id);
  };

  const onContinue = () => {
    if (!canContinueToSelfiePage({ front, back })) {
      setError("Photograph the ID front and ID back first.");
      return;
    }
    router.replace(JOIN_SELFIE_HREF);
  };

  return (
    <View style={{ gap: 14, width: "100%" }} testID="signup-id-pictures">
      <Text style={{ color: colors.foreground, fontSize: 15, lineHeight: 22 }}>
        Prove the ID says you are 18 or older. Front, then back. One live camera at a time.
      </Text>
      <TapToRead title="How to line up the yellow box">
        Fit the card in the yellow box. Wait until Take this picture turns on, then tap it once. We
        then open the other side of the ID. The selfie is the next page.
      </TapToRead>
      <TapToRead title="Hear Uri walk you through it">
        <SignupKycCartoonSample />
      </TapToRead>
      <Text style={{ color: colors.foreground, fontWeight: "700" }}>ID type</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {DOCS.map((doc) => (
          <Pressable
            key={doc.id}
            onPress={() => onPickDoc(doc.id)}
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
        phase="id"
        front={front}
        back={back}
        selfie={null}
        onPicked={recordPhoto}
        onError={setError}
      />
      {error ? <Text style={{ color: "#c0392b", fontSize: 13 }}>{error}</Text> : null}
      <PrimaryActionButton
        label="Continue to selfie"
        onPress={onContinue}
        backgroundColor={colors.primary}
        testID="signup-id-continue"
      />
    </View>
  );
}
