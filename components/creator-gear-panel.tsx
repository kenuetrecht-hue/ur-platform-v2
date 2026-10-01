import { useState } from "react";
import { Platform, Text, View } from "react-native";
import { AppPressable } from "@/components/app-pressable";
import { LETTERING_ON_WHITE } from "@/lib/gold-lettering";
import { CreatorSupplyLinks } from "@/components/creator-supply-links";

type GearState = "unknown" | "ready" | "blocked";

async function allowDevice(kind: "camera" | "microphone"): Promise<GearState> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return "blocked";
  const stream = await navigator.mediaDevices.getUserMedia(
    kind === "camera" ? { video: true, audio: false } : { audio: true, video: false },
  );
  stream.getTracks().forEach((track) => track.stop());
  return "ready";
}

export function CreatorGearPanel() {
  const [camera, setCamera] = useState<GearState>("unknown");
  const [microphone, setMicrophone] = useState<GearState>("unknown");
  const [hint, setHint] = useState<string | null>(null);

  const allow = (kind: "camera" | "microphone") => {
    void allowDevice(kind)
      .then((state) => {
        if (kind === "camera") setCamera(state);
        else setMicrophone(state);
        setHint(
          state === "ready"
            ? kind === "camera"
              ? "Camera is on for this browser. Live class, Cartoon Studio, and calls on the website and the app can use it."
              : "Microphone is on for this browser. Live class, music, and calls on the website and the app can use it."
            : "Allow the camera and microphone in this browser, or when the app asks during a class or call.",
        );
      })
      .catch(() => {
        if (kind === "camera") setCamera("blocked");
        else setMicrophone("blocked");
        setHint("The browser blocked that device. Allow it in the site settings, then try again.");
      });
  };

  const label = (state: GearState, name: string) =>
    state === "ready" ? `${name} ready` : state === "blocked" ? `${name} blocked` : `Allow ${name}`;

  return (
    <View
      testID="creator-gear-panel"
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E0E7FF",
        backgroundColor: "#FFFFFF",
        padding: 14,
        gap: 8,
      }}
    >
      <Text style={{ color: LETTERING_ON_WHITE, fontWeight: "800", fontSize: 15 }}>
        Camera, microphone, and sound
      </Text>
      <Text style={{ color: LETTERING_ON_WHITE, fontSize: 13, lineHeight: 18 }}>
        Turn these on once. The website and the installed app then use them for live class, Cartoon Studio, music, and video calls.
      </Text>
      <AppPressable
        testID="creator-allow-camera"
        onPress={() => allow("camera")}
        style={{ borderRadius: 10, borderWidth: 1, borderColor: "#4F46E5", paddingVertical: 10, alignItems: "center" }}
      >
        <Text pointerEvents="none" style={{ color: LETTERING_ON_WHITE, fontWeight: "800" }}>
          {label(camera, "camera")}
        </Text>
      </AppPressable>
      <AppPressable
        testID="creator-allow-microphone"
        onPress={() => allow("microphone")}
        style={{ borderRadius: 10, borderWidth: 1, borderColor: "#4F46E5", paddingVertical: 10, alignItems: "center" }}
      >
        <Text pointerEvents="none" style={{ color: LETTERING_ON_WHITE, fontWeight: "800" }}>
          {label(microphone, "microphone")}
        </Text>
      </AppPressable>
      {Platform.OS !== "web" ? (
        <Text style={{ color: LETTERING_ON_WHITE, fontSize: 12, lineHeight: 18 }}>
          On the app, allow the camera and microphone when a class or call asks. That is the same permission as the website.
        </Text>
      ) : null}
      {hint ? <Text style={{ color: LETTERING_ON_WHITE, fontSize: 12, lineHeight: 18 }}>{hint}</Text> : null}
      <CreatorSupplyLinks />
    </View>
  );
}
