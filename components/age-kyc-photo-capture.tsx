import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, Text, View, Image } from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  ageKycWebCapture,
  photoFromDataUrl,
  pickAgeKycLibraryPhoto,
  pickAgeKycPhoto,
  prepareAgeKycPhoto,
  readFileAsPhoto,
  type AgeKycPickedPhoto,
} from "@/lib/age-kyc-photo-picker";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { videoCropForCoverGuide } from "@/lib/age-kyc-camera-guide";

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
        Tap Live camera. Fit the ID inside the yellow box so all four corners show. Then tap Take this picture.
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
  const frameRef = useRef<HTMLDivElement | null>(null);
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
        video: {
          facingMode: kind === "selfie" ? "user" : { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
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
      const frame = frameRef.current;
      const crop = videoCropForCoverGuide({
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        viewWidth: frame?.clientWidth || video.clientWidth || video.videoWidth,
        viewHeight: frame?.clientHeight || video.clientHeight || video.videoHeight,
        kind,
      });
      const canvas = document.createElement("canvas");
      canvas.width = crop.sw;
      canvas.height = crop.sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not capture that frame.");
      ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.sw, crop.sh);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      void prepareAgeKycPhoto(photoFromDataUrl(dataUrl))
        .then((photo) => {
          onPicked(photo);
          stopLive();
        })
        .catch((error) => {
          onError(error instanceof Error ? error.message : "Could not take that picture.");
        });
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not take that picture.");
    }
  };

  return (
    <View style={{ gap: 10 }}>
      {live ? (
        <View style={{ gap: 10 }}>
          <div
            ref={frameRef}
            data-testid={`age-kyc-guide-${slot}`}
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: kind === "id" ? "1.4 / 1" : "3 / 4",
              borderRadius: 12,
              overflow: "hidden",
              background: "#111",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: kind === "selfie" ? "scaleX(-1)" : undefined,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: kind === "id" ? "90%" : "72%",
                  aspectRatio: kind === "id" ? "1.586 / 1" : "1 / 1",
                  border: "3px solid #fde68a",
                  borderRadius: kind === "id" ? 12 : "50%",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                }}
              />
            </div>
          </div>
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15, textAlign: "center" }}>
            {kind === "id"
              ? "Put the whole card inside the yellow box. All four corners must show."
              : "Put your face inside the yellow circle."}
          </Text>
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
          <WebCameraFileButton
            testID={`age-kyc-take-${slot}`}
            label={cameraLabel}
            capture={ageKycWebCapture(kind)}
            backgroundColor={kind === "selfie" ? "#15803d" : slot === "back" ? "#b45309" : "#1d4ed8"}
            textColor="#fff"
            onPicked={onPicked}
            onError={onError}
          />
          <PrimaryActionButton
            testID={`age-kyc-live-${slot}`}
            label="Live camera on this page"
            onPress={() => void openLiveCamera()}
            backgroundColor="#0f172a"
          />
          <WebCameraFileButton
            testID={`age-kyc-library-${slot}`}
            label="Upload a photo already on this phone"
            capture={null}
            backgroundColor={colors.background}
            textColor={colors.foreground}
            onPicked={onPicked}
            onError={onError}
          />
        </>
      )}
    </View>
  );
}

/** Real file input — phones open the camera when capture is set. Pressable + hidden click often does nothing. */
function WebCameraFileButton({
  testID,
  label,
  capture,
  backgroundColor,
  textColor,
  onPicked,
  onError,
}: {
  testID: string;
  label: string;
  capture: "user" | "environment" | null;
  backgroundColor: string;
  textColor: string;
  onPicked: (photo: AgeKycPickedPhoto) => void;
  onError: (message: string) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        position: "relative",
        minHeight: 58,
        borderRadius: 12,
        backgroundColor,
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontWeight: 800,
        fontSize: 16,
        color: textColor,
        textAlign: "center",
        padding: 16,
        overflow: "hidden",
      }}
    >
      {label}
      <input
        type="file"
        accept="image/*"
        {...(capture ? { capture } : {})}
        data-testid={testID}
        aria-label={label}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file) return;
          void readFileAsPhoto(file)
            .then(onPicked)
            .catch((error) => {
              onError(error instanceof Error ? error.message : "Could not read photo.");
            });
        }}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          fontSize: 20,
          cursor: "pointer",
        }}
      />
    </label>
  );
}
