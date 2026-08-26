import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { Stack } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import {
  AGE_KYC_MIN_AGE,
  AGE_KYC_REQUIRED_MESSAGE,
  type AgeKycDocumentType,
} from "@/lib/age-kyc-policy";
import { pickAgeKycPhoto, type AgeKycPickedPhoto } from "@/lib/age-kyc-photo-picker";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { TurnstileWidget } from "@/components/turnstile-widget";

const DOCS: { id: AgeKycDocumentType; label: string }[] = [
  { id: "driver_license", label: "Driver license" },
  { id: "state_id", label: "State ID" },
  { id: "passport", label: "Passport" },
  { id: "national_id", label: "National ID" },
];

function PhotoSlot({
  title,
  hint,
  photo,
  onPick,
}: {
  title: string;
  hint: string;
  photo: AgeKycPickedPhoto | null;
  onPick: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPick}
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 12,
        backgroundColor: colors.surface,
        minHeight: 120,
        justifyContent: "center",
      }}
    >
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 14 }}>{title}</Text>
      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{hint}</Text>
      {photo ? (
        <Image
          source={{ uri: photo.previewUri }}
          style={{ width: "100%", height: 140, borderRadius: 8, marginTop: 10 }}
          resizeMode="cover"
        />
      ) : (
        <Text style={{ color: colors.primary, fontWeight: "700", marginTop: 10 }}>Tap to photograph</Text>
      )}
    </Pressable>
  );
}

export default function AgeVerifyScreen() {
  const colors = useColors();
  const { logout } = useAuth();
  const [documentType, setDocumentType] = useState<AgeKycDocumentType>("driver_license");
  const [idFront, setIdFront] = useState<AgeKycPickedPhoto | null>(null);
  const [idBack, setIdBack] = useState<AgeKycPickedPhoto | null>(null);
  const [selfie, setSelfie] = useState<AgeKycPickedPhoto | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");

  const statusQuery = trpc.ageKyc.getStatus.useQuery(undefined, { retry: 1 });
  const submit = trpc.ageKyc.submit.useMutation({
    onSuccess: (data) => {
      if (data.verified) {
        void statusQuery.refetch();
      } else {
        setLocalError(data.rejectionReason ?? AGE_KYC_REQUIRED_MESSAGE);
      }
    },
    onError: (err) => setLocalError(err.message),
  });

  const pick = async (slot: "front" | "back" | "selfie") => {
    setLocalError(null);
    try {
      const photo = await pickAgeKycPhoto(slot === "selfie" ? "selfie" : "id");
      if (!photo) return;
      if (slot === "front") setIdFront(photo);
      if (slot === "back") setIdBack(photo);
      if (slot === "selfie") setSelfie(photo);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Could not open camera.");
    }
  };

  const onSubmit = () => {
    if (!idFront || !idBack || !selfie) {
      Alert.alert("Photos required", "Photograph the ID front, ID back, and a selfie of your face.");
      return;
    }
    setLocalError(null);
    submit.mutate({
      documentType,
      idFront: { mimeType: idFront.mimeType, base64: idFront.base64 },
      idBack: { mimeType: idBack.mimeType, base64: idBack.base64 },
      selfie: { mimeType: selfie.mimeType, base64: selfie.base64 },
      turnstileToken: turnstileToken || undefined,
    });
  };

  const verified = statusQuery.data?.verified === true;
  const rejection = localError ?? statusQuery.data?.rejectionReason;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer className="bg-background">
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 14 }}>
          <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 24 }}>
            {AGE_KYC_MIN_AGE}+ identity check
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>
            {AGE_KYC_REQUIRED_MESSAGE} This is required because AI chat, social features, and
            payments can be addictive for minors.
          </Text>

          {verified ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.primary,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: "800" }}>Verified</Text>
              <Text style={{ color: colors.muted, marginTop: 6 }}>
                You are confirmed 18 or older. You can enter UR Platform.
              </Text>
            </View>
          ) : (
            <>
              <Text style={{ color: colors.foreground, fontWeight: "700", marginTop: 4 }}>
                ID type
              </Text>
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
                    <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>
                      {doc.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <PhotoSlot
                title="ID front"
                hint="Photo page with your face and date of birth."
                photo={idFront}
                onPick={() => void pick("front")}
              />
              <PhotoSlot
                title="ID back"
                hint="Barcode, magnetic stripe, or passport MRZ page."
                photo={idBack}
                onPick={() => void pick("back")}
              />
              <PhotoSlot
                title="Selfie"
                hint="Your face, live — not a photo of the ID."
                photo={selfie}
                onPick={() => void pick("selfie")}
              />

              {rejection ? (
                <Text style={{ color: "#c0392b", fontSize: 13, lineHeight: 18 }}>
                  {rejection}
                </Text>
              ) : null}

              <TurnstileWidget action="age_kyc" onToken={setTurnstileToken} />

              <PrimaryActionButton
                label="Verify and enter"
                loadingLabel="Checking…"
                loading={submit.isPending}
                onPress={onSubmit}
                backgroundColor={colors.primary}
              />
            </>
          )}

          <Pressable onPress={() => void logout()} style={{ paddingVertical: 8 }}>
            <Text style={{ color: colors.muted, textAlign: "center" }}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    </>
  );
}
