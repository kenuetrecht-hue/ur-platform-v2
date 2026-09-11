import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { Link, Stack, useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import {
  AGE_KYC_MIN_AGE,
  AGE_KYC_REQUIRED_MESSAGE,
  type AgeKycDocumentType,
} from "@/lib/age-kyc-policy";
import {
  AGE_VERIFY_TITLE,
  AGE_VERIFY_WHAT_TO_DO,
  AGE_VERIFY_WHY,
  PICTURES_PASSED_SIGN_IN_NEXT,
  signupPrivacyBlock,
} from "@/lib/signup-step-copy";
import { countFilledAgeKycSlots, type AgeKycPickedPhoto } from "@/lib/age-kyc-photo-picker";
import { loadAgeKycDraft, saveAgeKycDraftSlot } from "@/lib/age-kyc-draft-store";
import { AgeKycPhotoCapture } from "@/components/age-kyc-photo-capture";
import { SignupKycCartoonSample } from "@/components/signup-kyc-cartoon-sample";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { explainAuthFailure } from "@/lib/auth-network-error";
import { AFTER_ID_PASS_HREF } from "@/lib/after-sign-in";
import { getAgeKycPassToken, hasAgeKycPassToken } from "@/lib/age-kyc-pass-store";
import { claimStoredAgeKycPass } from "@/lib/claim-stored-age-kyc-pass";

const DOCS: { id: AgeKycDocumentType; label: string }[] = [
  { id: "driver_license", label: "Driver license" },
  { id: "state_id", label: "State ID" },
  { id: "passport", label: "Passport" },
  { id: "national_id", label: "National ID" },
];

export default function AgeVerifyScreen() {
  const colors = useColors();
  const router = useRouter();
  const { logout, isAuthenticated } = useAuth();
  const draft = loadAgeKycDraft();
  const [documentType, setDocumentType] = useState<AgeKycDocumentType>("driver_license");
  const [idFront, setIdFront] = useState<AgeKycPickedPhoto | null>(draft.front);
  const [idBack, setIdBack] = useState<AgeKycPickedPhoto | null>(draft.back);
  const [selfie, setSelfie] = useState<AgeKycPickedPhoto | null>(draft.selfie);
  const [localError, setLocalError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const picturesAlreadyPassed = hasAgeKycPassToken();
  const claimAttempted = useRef(false);

  const statusQuery = trpc.ageKyc.getStatus.useQuery(undefined, {
    retry: 1,
    enabled: isAuthenticated,
  });
  const claimPass = trpc.ageKyc.claimPass.useMutation();
  const submit = trpc.ageKyc.submit.useMutation({
    onSuccess: (data) => {
      if (data.verified) {
        void statusQuery.refetch();
      } else {
        setLocalError(data.rejectionReason ?? AGE_KYC_REQUIRED_MESSAGE);
      }
    },
    onError: (err) => setLocalError(explainAuthFailure(err)),
  });

  useEffect(() => {
    if (statusQuery.error) {
      setLocalError(explainAuthFailure(statusQuery.error));
    }
  }, [statusQuery.error]);

  useEffect(() => {
    if (!isAuthenticated || !getAgeKycPassToken() || claimAttempted.current) return;
    claimAttempted.current = true;
    void claimStoredAgeKycPass((input) => claimPass.mutateAsync(input))
      .then((claimed) => {
        if (claimed) {
          void statusQuery.refetch();
          router.replace(AFTER_ID_PASS_HREF);
        }
      })
      .catch((err) => setLocalError(explainAuthFailure(err)));
  }, [isAuthenticated, claimPass, router, statusQuery]);

  const recordPhoto = (slot: "front" | "back" | "selfie", photo: AgeKycPickedPhoto) => {
    setLocalError(null);
    saveAgeKycDraftSlot(slot, photo);
    if (slot === "front") setIdFront(photo);
    if (slot === "back") setIdBack(photo);
    if (slot === "selfie") setSelfie(photo);
  };

  const filled = countFilledAgeKycSlots({ front: idFront, back: idBack, selfie });

  const onSubmit = () => {
    if (!isAuthenticated) {
      Alert.alert("Sign in next", PICTURES_PASSED_SIGN_IN_NEXT);
      router.push(picturesAlreadyPassed ? "/login" : "/login");
      return;
    }
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
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 64, gap: 14, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 24 }}>
            {AGE_KYC_MIN_AGE}+ identity check
          </Text>
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>{AGE_VERIFY_TITLE}</Text>

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
              <View style={{ marginTop: 12 }}>
                <PrimaryActionButton
                  label="Enter the app"
                  onPress={() => router.replace(AFTER_ID_PASS_HREF)}
                  backgroundColor={colors.primary}
                />
              </View>
            </View>
          ) : picturesAlreadyPassed && !isAuthenticated ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.primary,
                borderRadius: 12,
                padding: 16,
                gap: 12,
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>
                Pictures passed
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 15, lineHeight: 22 }}>
                {PICTURES_PASSED_SIGN_IN_NEXT}
              </Text>
              <PrimaryActionButton
                label="Sign in"
                onPress={() => router.replace("/login")}
                backgroundColor={colors.primary}
              />
              <Link href="/signup" style={{ color: colors.primary, fontWeight: "800", fontSize: 16, textAlign: "center" }}>
                Create an account
              </Link>
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

              <AgeKycPhotoCapture
                front={idFront}
                back={idBack}
                selfie={selfie}
                onPicked={recordPhoto}
                onError={setLocalError}
              />

              <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>
                {filled} of 3 pictures recorded
              </Text>

              <SignupKycCartoonSample />

              {rejection ? (
                <Text style={{ color: "#c0392b", fontSize: 13, lineHeight: 18 }}>
                  {rejection}
                </Text>
              ) : null}

              <TurnstileWidget action="age_kyc" onToken={setTurnstileToken} />

              <PrimaryActionButton
                label={isAuthenticated ? "Verify and enter" : "Sign in to finish"}
                loadingLabel="Checking…"
                loading={submit.isPending || claimPass.isPending}
                onPress={isAuthenticated ? onSubmit : () => router.replace("/login")}
                backgroundColor={colors.primary}
              />

              <PrivacyDetails />
            </>
          )}

          {rejection && (verified || (picturesAlreadyPassed && !isAuthenticated)) ? (
            <Text style={{ color: "#c0392b", fontSize: 13, lineHeight: 18 }}>
              {rejection}
            </Text>
          ) : null}

          <Pressable onPress={() => void logout()} style={{ paddingVertical: 8 }}>
            <Text style={{ color: colors.muted, textAlign: "center" }}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

function PrivacyDetails() {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Pressable onPress={() => setOpen((value) => !value)} style={{ paddingVertical: 8 }}>
        <Text style={{ color: colors.primary, fontWeight: "800", textAlign: "center" }}>
          {open ? "Hide why we ask" : "Why we ask (optional to read — Uri also says this)"}
        </Text>
      </Pressable>
      {open ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>{AGE_VERIFY_WHAT_TO_DO}</Text>
          {AGE_VERIFY_WHY.map((line) => (
            <Text key={line.slice(0, 40)} style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>
              {line}
            </Text>
          ))}
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>{signupPrivacyBlock()}</Text>
        </View>
      ) : null}
    </View>
  );
}
