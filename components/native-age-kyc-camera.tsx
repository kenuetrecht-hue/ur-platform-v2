import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useColors } from "@/hooks/use-colors";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { guideBoxInView, type GuideBox } from "@/lib/age-kyc-camera-guide";
import { photoFromNativeCapture } from "@/lib/age-kyc-photo-picker";
import type { AgeKycPickedPhoto } from "@/lib/age-kyc-photo-picker";
import type { AgeKycSlot } from "@/components/age-kyc-photo-capture";

let stopOpenNativeCamera: (() => void) | null = null;
let openNativeSlot: AgeKycSlot | null = null;

type Props = {
  slot: AgeKycSlot;
  kind: "id" | "selfie";
  cameraLabel: string;
  onPicked: (photo: AgeKycPickedPhoto) => void;
  onError: (message: string) => void;
};

export function NativeAgeKycCamera({ slot, kind, cameraLabel, onPicked, onError }: Props) {
  const colors = useColors();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [live, setLive] = useState(false);
  const [ready, setReady] = useState(false);
  const [guide, setGuide] = useState<GuideBox | null>(null);
  const [snapping, setSnapping] = useState(false);

  const boxLabel = slot === "front" ? "ID front" : slot === "back" ? "ID back" : "Your face";

  const stopLive = () => {
    if (openNativeSlot === slot) {
      openNativeSlot = null;
      stopOpenNativeCamera = null;
    }
    setReady(false);
    setGuide(null);
    setSnapping(false);
    setLive(false);
  };

  const openLiveCamera = async () => {
    stopOpenNativeCamera?.();
    const granted = permission?.granted || (await requestPermission()).granted;
    if (!granted) {
      onError("Allow the camera so the yellow box can sit on this page.");
      return;
    }
    openNativeSlot = slot;
    stopOpenNativeCamera = stopLive;
    setReady(false);
    setLive(true);
  };

  const snap = async () => {
    if (snapping || !ready) return;
    setSnapping(true);
    try {
      const shot = await cameraRef.current?.takePictureAsync({
        quality: 0.75,
        base64: true,
      });
      if (!shot?.uri) {
        throw new Error("Could not take that picture. Try again.");
      }
      const photo = await photoFromNativeCapture(shot);
      onPicked(photo);
      stopLive();
    } catch (error) {
      setSnapping(false);
      onError(error instanceof Error ? error.message : "Could not take that picture.");
    }
  };

  if (!live) {
    return (
      <View style={{ gap: 10 }}>
        <PrimaryActionButton
          testID={`age-kyc-live-${slot}`}
          label={cameraLabel}
          onPress={() => void openLiveCamera()}
          backgroundColor={kind === "selfie" ? "#15803d" : slot === "back" ? "#b45309" : "#1d4ed8"}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <View
        testID={`age-kyc-guide-${slot}`}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          if (width >= 8 && height >= 8) {
            setGuide(guideBoxInView(width, height, kind));
          }
        }}
        style={{
          width: "100%",
          aspectRatio: kind === "id" ? 1.6 : 0.75,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: "#111",
        }}
      >
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing={kind === "selfie" ? "front" : "back"}
          onCameraReady={() => setReady(true)}
          animateShutter={false}
        />
        {guide ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: guide.left,
              top: guide.top,
              width: guide.width,
              height: guide.height,
              borderWidth: 3,
              borderColor: "#fde68a",
              borderRadius: kind === "id" ? 12 : 9999,
            }}
          />
        ) : (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: "5%",
              top: kind === "id" ? "14%" : "14%",
              width: kind === "id" ? "90%" : "72%",
              height: kind === "id" ? "72%" : "56%",
              alignSelf: "center",
              borderWidth: 3,
              borderColor: "#fde68a",
              borderRadius: kind === "id" ? 12 : 9999,
              marginLeft: kind === "selfie" ? "9%" : 0,
            }}
          />
        )}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 8,
            top: 8,
            backgroundColor: "#fde68a",
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Text style={{ color: "#111", fontWeight: "800", fontSize: 12 }}>{boxLabel}</Text>
        </View>
      </View>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15, textAlign: "center" }}>
        {kind === "id"
          ? `Fit the whole ${boxLabel.toLowerCase()} inside the yellow box. All four corners.`
          : "Put your face inside the yellow circle."}
      </Text>
      <PrimaryActionButton
        testID={`age-kyc-snap-${slot}`}
        label={ready ? (snapping ? "Saving picture…" : "Take this picture") : "Camera opening…"}
        loading={!ready || snapping}
        loadingLabel={!ready ? "Camera opening…" : "Saving picture…"}
        onPress={() => void snap()}
        backgroundColor="#15803d"
      />
      <Pressable onPress={stopLive} style={{ paddingVertical: 8 }}>
        <Text style={{ color: colors.muted, textAlign: "center", fontWeight: "700" }}>Close camera</Text>
      </Pressable>
    </View>
  );
}
