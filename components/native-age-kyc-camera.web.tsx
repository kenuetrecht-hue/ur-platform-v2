import type { AgeKycPickedPhoto } from "@/lib/age-kyc-photo-picker";
import type { AgeKycSlot } from "@/components/age-kyc-photo-capture";

type Props = {
  slot: AgeKycSlot;
  kind: "id" | "selfie";
  cameraLabel: string;
  onPicked: (photo: AgeKycPickedPhoto) => void;
  onError: (message: string) => void;
};

/** Website uses the on-page live camera in age-kyc-photo-capture — not expo-camera. */
export function NativeAgeKycCamera(_props: Props) {
  return null;
}
