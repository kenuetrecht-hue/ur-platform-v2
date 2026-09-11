import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, Text, View, Image } from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  photoFromDataUrl,
  pickAgeKycLibraryPhoto,
  pickAgeKycPhoto,
  type AgeKycPickedPhoto,
} from "@/lib/age-kyc-photo-picker";
import { PrimaryActionButton } from "@/components/primary-action-button";

export type AgeKycSlot = "front" | "back" | "selfie";

const SLOTS: { id: AgeKycSlot; title: string; cameraLabel: string; kind: "id" | "selfie"; color: string }[] = [
  { id: "front", title: "1 · ID front", cameraLabel: "Open camera — ID front", kind: "id", color: "#1d4ed8" },
  { id: "back", title: "2 · ID back", cameraLabel: "Open camera — ID back", kind: "id", color: "#b45309" },
  { id: "selfie", title: "3 · Selfie", cameraLabel: "Open camera — selfie", kind: "selfie", color: "#15803d" },
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

  return (
    <View style={{ gap: 12 }} testID="age-kyc-photo-capture">
      <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 22 }}>
        Take the three pictures now
      </Text>
      <Text style={{ color: colors.foreground, fontSize: 16, lineHeight: 22, fontWeight: "700" }}>
        Tap a green Open camera button. The phone camera opens. You can do this while Uri is talking.
      </Text>

      {SLOTS.map((slot) => {
        const photo = photoFor(slot.id, props);
        return (
          <View
            key={slot.id}
            testID={`age-kyc-slot-${slot.id}`}
            style={{
              borderWidth: 3,
              borderColor: photo ? "#22c55e" : slot.color,
              borderRadius: 16,
              padding: 14,
              backgroundColor: colors.surface,
              gap: 10,
            }}
          >
            <Text style={{ color: slot.color, fontWeight: "900", fontSize: 20 }}>{slot.title}</Text>
            <Text
              style={{
                color: photo ? "#16a34a" : colors.foreground,
                fontWeight: "800",
                fontSize: 15,
              }}
            >
              {photo ? "Photo recorded — tap below to retake" : "Not taken yet — tap Open camera"}
            </Text>

            {photo ? (
              <Image
                source={{ uri: photo.previewUri }}
                style={{ width: "100%", height: 160, borderRadius: 10 }}
                resizeMode="cover"
                accessibilityLabel={`${slot.title} preview`}
              />
            ) : null}

            {Platform.OS === "web" ? (
              <WebCameraCard
                slot={slot.id}
                kind={slot.kind}
                cameraLabel={photo ? `Retake — ${slot.title}` : slot.cameraLabel}
                onPicked={(next) => props.onPicked(slot.id, next)}
                onError={props.onError}
              />
            ) : (
              <View style={{ gap: 10 }}>
                <PrimaryActionButton
                  testID={`age-kyc-take-${slot.id}`}
                  label={photo ? `Retake — ${slot.title}` : slot.cameraLabel}
                  onPress={() => {
                    void pickAgeKycPhoto(slot.kind)
                      .then((next) => {
                        if (next) props.onPicked(slot.id, next);
                      })
                      .catch((error) => {
                        props.onError(error instanceof Error ? error.message : "Could not open camera.");
                      });
                  }}
                  backgroundColor={slot.color}
                />
                <PrimaryActionButton
                  testID={`age-kyc-library-${slot.id}`}
                  label="Upload a photo already on this phone"
                  onPress={() => {
                    void pickAgeKycLibraryPhoto()
                      .then((next) => {
                        if (next) props.onPicked(slot.id, next);
                      })
                      .catch((error) => {
                        props.onError(error instanceof Error ? error.message : "Could not open photos.");
                      });
                  }}
                  backgroundColor={colors.background}
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

function WebCameraCard({
  slot,
  kind,
  cameraLabel,
  onPicked,
  onError,
}: {
  slot: AgeKycSlot;
  kind: "id" | "selfie";
  cameraLabel: string;
  onPicked: (photo: AgeKycPickedPhoto) => void;
  onError: (message: string) => void;
}) {
  const colors = useColors();
  const [live, setLive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopLive = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setLive(false);
  };

  useEffect(() => () => stopLive(), []);

  useEffect(() => {
    if (!live || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => undefined);
  }, [live]);

  const openLiveCamera = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      await fallbackFile(kind);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: kind === "selfie" ? "user" : { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setLive(true);
    } catch {
      try {
        const photo = await pickAgeKycPhoto(kind);
        if (photo) onPicked(photo);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Could not open camera.");
      }
    }
  };

  const fallbackFile = async (mode: "id" | "selfie" | "library") => {
    try {
      const photo = mode === "library" ? await pickAgeKycLibraryPhoto() : await pickAgeKycPhoto(mode);
      if (photo) onPicked(photo);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not open photos.");
    }
  };

  const snap = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth < 2) {
      onError("Camera is not ready yet. Wait one second, then tap Take this picture.");
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not capture that frame.");
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      onPicked(photoFromDataUrl(dataUrl));
      stopLive();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not take that picture.");
    }
  };

  return (
    <View style={{ gap: 10 }}>
      {live ? (
        <View style={{ gap: 10 }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", maxHeight: 280, borderRadius: 12, background: "#111", objectFit: "cover" }}
          />
          <PrimaryActionButton
            testID={`age-kyc-snap-${slot}`}
            label="Take this picture"
            onPress={snap}
            backgroundColor="#15803d"
          />
          <Pressable onPress={stopLive} style={{ paddingVertical: 8 }}>
            <Text style={{ color: colors.muted, textAlign: "center", fontWeight: "700" }}>Close camera</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <PrimaryActionButton
            testID={`age-kyc-take-${slot}`}
            label={cameraLabel}
            onPress={() => void openLiveCamera()}
            backgroundColor={kind === "selfie" ? "#15803d" : kind === "id" && slot === "back" ? "#b45309" : "#1d4ed8"}
          />
          <PrimaryActionButton
            testID={`age-kyc-library-${slot}`}
            label="Upload a photo already on this phone"
            onPress={() => void fallbackFile("library")}
            backgroundColor={colors.background}
            textColor={colors.foreground}
          />
        </>
      )}
    </View>
  );
}
