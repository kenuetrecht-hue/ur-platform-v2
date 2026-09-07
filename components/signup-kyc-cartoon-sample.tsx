import { Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { CartoonStudioPlayer } from "@/components/cartoon-studio-player";
import {
  SIGNUP_KYC_CARTOON_BLURB,
  SIGNUP_KYC_CARTOON_HEADLINE,
  SIGNUP_KYC_CARTOON_QUALITY_NOTE,
  SIGNUP_KYC_CARTOON_SAMPLE,
} from "@/lib/signup-kyc-cartoon-sample";

export function SignupKycCartoonSample() {
  const colors = useColors();
  return (
    <View
      style={{
        gap: 10,
        borderWidth: 2,
        borderColor: "#f59e0b",
        borderRadius: 18,
        padding: 16,
        backgroundColor: "#070b14",
      }}
    >
      <Text style={{ color: "#fde68a", fontWeight: "800", fontSize: 12, letterSpacing: 1 }}>
        PREMIERE-STYLE SAMPLE · CARTOON STUDIO
      </Text>
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 20, lineHeight: 26 }}>
        {SIGNUP_KYC_CARTOON_HEADLINE}
      </Text>
      <Text style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 21 }}>{SIGNUP_KYC_CARTOON_BLURB}</Text>
      <CartoonStudioPlayer project={SIGNUP_KYC_CARTOON_SAMPLE} sample />
      <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
        {SIGNUP_KYC_CARTOON_QUALITY_NOTE}
      </Text>
    </View>
  );
}
