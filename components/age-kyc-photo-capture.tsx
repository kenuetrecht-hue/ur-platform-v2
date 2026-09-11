import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, Text, View, Image } from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  photoFromDataUrl,
  pickAgeKycPhoto,
  prepareAgeKycPhoto,
  type AgeKycPickedPhoto,
} from "@/lib/age-kyc-photo-picker";
import { NativeAgeKycCamera } from "@/components/native-age-kyc-camera";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { chooseAgeKycCaptureRect, guideBoxInView, ID_CARD_ASPECT, type GuideBox } from "@/lib/age-kyc-camera-guide";

export type AgeKycSlot = "front" | "back" | "selfie";

let stopOpenLiveCamera: (() => void) | null = null;
let openLiveSlot: AgeKycSlot | null = null;

const SLOTS: { id: AgeKycSlot; title: string; cameraLabel: string; kind: "id" | "selfie"; color: string }[] = [
  { id: "front", title: "1 · ID front", cameraLabel: "Live camera — ID front", kind: "id", color: "#1d4ed8" },
  { id: "back", title: "2 · ID back", cameraLabel: "Live camera — ID back", kind: "id", color: "#b45309" },
  { id: "selfie", title: "3 · Selfie", cameraLabel: "Live camera — selfie", kind: "selfie", color: "#15803d" },
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
        Tap Live camera on front, back, and selfie. A yellow box appears on each one. Fit the card inside it, then tap Take this picture once.
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
              {photo ? "Photo recorded — tap Live camera to retake" : "Not taken yet — tap Live camera"}
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
              <NativeAgeKycCamera
                slot={slot.id}
                kind={slot.kind}
                cameraLabel={photo ? `Retake — ${slot.title}` : slot.cameraLabel}
                onPicked={(next) => props.onPicked(slot.id, next)}
                onError={props.onError}
              />
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
  const [ready, setReady] = useState(false);
  const [guide, setGuide] = useState<GuideBox | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const snappingRef = useRef(false);

  const stopLive = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (openLiveSlot === slot) {
      openLiveSlot = null;
      stopOpenLiveCamera = null;
    }
    snappingRef.current = false;
    setReady(false);
    setGuide(null);
    setLive(false);
  };

  useEffect(() => () => stopLive(), []);

  useEffect(() => {
    if (!live || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    const markReady = () => {
      if (video.videoWidth >= 16) setReady(true);
    };
    video.onloadedmetadata = markReady;
    video.onplaying = markReady;
    void video.play().then(markReady).catch(() => undefined);
    return () => {
      video.onloadedmetadata = null;
      video.onplaying = null;
    };
  }, [live]);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    const measure = () => {
      const frame = frameRef.current;
      if (cancelled || !frame) return;
      if (frame.clientWidth >= 8 && frame.clientHeight >= 8) {
        setGuide(guideBoxInView(frame.clientWidth, frame.clientHeight, kind));
      }
    };
    measure();
    const raf = requestAnimationFrame(measure);
    const retry = window.setTimeout(measure, 80);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (observer && frameRef.current) observer.observe(frameRef.current);
    window.addEventListener("resize", measure);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(retry);
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [live, kind]);

  const openLiveCamera = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      await fallbackFile(kind);
      return;
    }
    stopOpenLiveCamera?.();
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
      openLiveSlot = slot;
      stopOpenLiveCamera = stopLive;
      snappingRef.current = false;
      setReady(false);
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
    if (snappingRef.current) return;
    if (!ready || !video || video.videoWidth < 16) {
      onError("Wait until the camera picture appears, then tap Take this picture once.");
      return;
    }
    snappingRef.current = true;
    try {
      const frame = frameRef.current;
      const crop = chooseAgeKycCaptureRect({
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        viewWidth: frame?.clientWidth ?? 0,
        viewHeight: frame?.clientHeight ?? 0,
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
          snappingRef.current = false;
          onError(error instanceof Error ? error.message : "Could not take that picture.");
        });
    } catch (error) {
      snappingRef.current = false;
      onError(error instanceof Error ? error.message : "Could not take that picture.");
    }
  };

  const boxLabel =
    slot === "front" ? "ID front" : slot === "back" ? "ID back" : "Your face";

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
              aspectRatio: kind === "id" ? "1.6 / 1" : "3 / 4",
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
            {guide ? (
              <div
                style={{
                  position: "absolute",
                  left: guide.left,
                  top: guide.top,
                  width: guide.width,
                  height: guide.height,
                  pointerEvents: "none",
                  border: "3px solid #fde68a",
                  borderRadius: kind === "id" ? 12 : "50%",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                }}
              />
            ) : (
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
                    aspectRatio: kind === "id" ? `${ID_CARD_ASPECT} / 1` : "1 / 1",
                    maxHeight: "78%",
                    border: "3px solid #fde68a",
                    borderRadius: kind === "id" ? 12 : "50%",
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                  }}
                />
              </div>
            )}
            <div
              style={{
                position: "absolute",
                left: 8,
                top: 8,
                background: "#fde68a",
                color: "#111",
                fontWeight: 800,
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 8,
              }}
            >
              {boxLabel}
            </div>
          </div>
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15, textAlign: "center" }}>
            {kind === "id"
              ? `Fit the whole ${boxLabel.toLowerCase()} inside the yellow box. All four corners.`
              : "Put your face inside the yellow circle."}
          </Text>
          <PrimaryActionButton
            testID={`age-kyc-snap-${slot}`}
            label={ready ? "Take this picture" : "Camera opening…"}
            loading={!ready}
            loadingLabel="Camera opening…"
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
            testID={`age-kyc-live-${slot}`}
            label={cameraLabel}
            onPress={() => void openLiveCamera()}
            backgroundColor={kind === "selfie" ? "#15803d" : slot === "back" ? "#b45309" : "#1d4ed8"}
          />
        </>
      )}
    </View>
  );
}
