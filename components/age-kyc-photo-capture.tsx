import { useState } from "react";
import { Platform, Pressable, Text, View, Image } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { AGE_VERIFY_PHOTO_HINTS } from "@/lib/signup-step-copy";
import {
  pickAgeKycLibraryPhoto,
  pickAgeKycPhoto,
  readFileAsPhoto,
  type AgeKycPickedPhoto,
} from "@/lib/age-kyc-photo-picker";
import { PrimaryActionButton } from "@/components/primary-action-button";

export type AgeKycSlot = "front" | "back" | "selfie";

const SLOTS: { id: AgeKycSlot; title: string; kind: "id" | "selfie" }[] = [
  { id: "front", title: "ID front", kind: "id" },
  { id: "back", title: "ID back", kind: "id" },
  { id: "selfie", title: "Selfie", kind: "selfie" },
];

type Props = {
  front: AgeKycPickedPhoto | null;
  back: AgeKycPickedPhoto | null;
  selfie: AgeKycPickedPhoto | null;
  onPicked: (slot: AgeKycSlot, photo: AgeKycPickedPhoto) => void;
  onError: (message: string) => void;
};

function photoFor(slot: AgeKycSlot, props: Props): AgeKycPickedPhoto | null {
  if (slot === "front") return props.front;
  if (slot === "back") return props.back;
  return props.selfie;
}

export function AgeKycPhotoCapture(props: Props) {
  const colors = useColors();
  const [active, setActive] = useState<AgeKycSlot>("front");

  const takeNative = async (slot: AgeKycSlot, kind: "id" | "selfie") => {
    try {
      const photo = await pickAgeKycPhoto(kind);
      if (photo) props.onPicked(slot, photo);
    } catch (error) {
      props.onError(error instanceof Error ? error.message : "Could not open camera.");
    }
  };

  const pickLibrary = async (slot: AgeKycSlot) => {
    try {
      const photo = await pickAgeKycLibraryPhoto();
      if (photo) props.onPicked(slot, photo);
    } catch (error) {
      props.onError(error instanceof Error ? error.message : "Could not open photos.");
    }
  };

  return (
    <View style={{ gap: 12 }} testID="age-kyc-photo-capture">
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>
        Take the three pictures
      </Text>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
        Tap a tab, then tap the green button. Your phone will ask to use the camera. The
        picture stays on this page until you tap Verify and enter.
      </Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {SLOTS.map((slot) => {
          const photo = photoFor(slot.id, props);
          const selected = active === slot.id;
          return (
            <Pressable
              key={slot.id}
              accessibilityRole="tab"
              testID={`age-kyc-tab-${slot.id}`}
              onPress={() => setActive(slot.id)}
              style={{
                flex: 1,
                minHeight: 52,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primary : colors.surface,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 4,
                ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
              }}
            >
              <Text
                style={{
                  color: selected ? "#fff" : colors.foreground,
                  fontWeight: "800",
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                {slot.title}
              </Text>
              <Text style={{ color: selected ? "#fff" : colors.muted, fontSize: 11, fontWeight: "700" }}>
                {photo ? "Recorded" : "Tap here"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {SLOTS.filter((slot) => slot.id === active).map((slot) => {
        const photo = photoFor(slot.id, props);
        return (
          <View
            key={slot.id}
            testID={`age-kyc-slot-${slot.id}`}
            style={{
              borderWidth: 2,
              borderColor: photo ? colors.primary : colors.border,
              borderRadius: 14,
              padding: 14,
              backgroundColor: colors.surface,
              gap: 10,
            }}
          >
            <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
              {slot.title}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
              {AGE_VERIFY_PHOTO_HINTS[slot.id]}
            </Text>
            <Text
              style={{
                color: photo ? colors.primary : colors.muted,
                fontWeight: "800",
                fontSize: 14,
              }}
            >
              {photo ? "Photo recorded on this page" : "Not taken yet"}
            </Text>

            {photo ? (
              <Image
                source={{ uri: photo.previewUri }}
                style={{ width: "100%", height: 180, borderRadius: 10 }}
                resizeMode="cover"
                accessibilityLabel={`${slot.title} preview`}
              />
            ) : null}

            {Platform.OS === "web" ? (
              <WebCaptureButtons
                slot={slot.id}
                kind={slot.kind}
                hasPhoto={Boolean(photo)}
                onPicked={(next) => props.onPicked(slot.id, next)}
                onError={props.onError}
              />
            ) : (
              <View style={{ gap: 10 }}>
                <PrimaryActionButton
                  testID={`age-kyc-take-${slot.id}`}
                  label={photo ? `Retake ${slot.title} with camera` : `Take ${slot.title} with camera`}
                  onPress={() => void takeNative(slot.id, slot.kind)}
                  backgroundColor={colors.primary}
                />
                <PrimaryActionButton
                  testID={`age-kyc-library-${slot.id}`}
                  label="Use a photo already on this phone"
                  onPress={() => void pickLibrary(slot.id)}
                  backgroundColor={colors.surface}
                  textColor={colors.foreground}
                />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function WebCaptureButtons({
  slot,
  kind,
  hasPhoto,
  onPicked,
  onError,
}: {
  slot: AgeKycSlot;
  kind: "id" | "selfie";
  hasPhoto: boolean;
  onPicked: (photo: AgeKycPickedPhoto) => void;
  onError: (message: string) => void;
}) {
  const colors = useColors();
  const applyFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      onPicked(await readFileAsPhoto(file));
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not read photo.");
    }
  };

  const cameraLabel = kind === "selfie"
    ? hasPhoto
      ? "Retake selfie with camera"
      : "Take selfie with camera"
    : hasPhoto
      ? `Retake ${slot === "front" ? "ID front" : "ID back"} with camera`
      : `Take ${slot === "front" ? "ID front" : "ID back"} with camera`;

  return (
    <View style={{ gap: 10 }}>
      <WebFileHitTarget
        testID={`age-kyc-file-camera-${slot}`}
        label={cameraLabel}
        capture={kind === "selfie" ? "user" : "environment"}
        backgroundColor={colors.primary}
        textColor="#fff"
        onFile={(file) => void applyFile(file)}
      />
      <WebFileHitTarget
        testID={`age-kyc-file-upload-${slot}`}
        label="Use a photo already on this phone"
        capture={null}
        backgroundColor={colors.background}
        textColor={colors.foreground}
        onFile={(file) => void applyFile(file)}
      />
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
        First button opens the camera. Second button opens photos already on this device.
      </Text>
    </View>
  );
}

/** Full-size tap target — the file input sits on top so phones actually open the camera. */
function WebFileHitTarget({
  testID,
  label,
  capture,
  backgroundColor,
  textColor,
  onFile,
}: {
  testID: string;
  label: string;
  capture: "user" | "environment" | null;
  backgroundColor: string;
  textColor: string;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <View
      style={{
        position: "relative",
        minHeight: 56,
        borderRadius: 12,
        backgroundColor,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <Text
        pointerEvents="none"
        style={{ color: textColor, fontWeight: "800", fontSize: 16, padding: 16, textAlign: "center" }}
      >
        {label}
      </Text>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        {...(capture ? { capture } : {})}
        data-testid={testID}
        aria-label={label}
        onChange={(event) => {
          onFile(event.currentTarget.files?.[0]);
          event.currentTarget.value = "";
        }}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          opacity: 0.02,
          fontSize: 48,
          cursor: "pointer",
          zIndex: 20,
        }}
      />
    </View>
  );
}
