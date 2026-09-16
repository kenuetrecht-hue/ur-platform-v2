import { Text, View } from "react-native";
import { CartoonStudioPlayer } from "@/components/cartoon-studio-player";
import { TapToRead } from "@/components/tap-to-read";
import {
  SIGNUP_KYC_CARTOON_BLURB,
  SIGNUP_KYC_CARTOON_HEADLINE,
  SIGNUP_KYC_CARTOON_QUALITY_NOTE,
  SIGNUP_KYC_CARTOON_SAMPLE,
} from "@/lib/signup-kyc-cartoon-sample";

type Props = {
  compact?: boolean;
};

export function SignupKycCartoonSample({ compact = false }: Props) {
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
      testID={compact ? "uri-cartoon-compact" : "uri-cartoon-signup"}
    >
      {compact ? (
        <Text style={{ color: "#fde68a", fontWeight: "800", fontSize: 15 }}>
          Hear Uri again if you want
        </Text>
      ) : (
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18, lineHeight: 24 }}>
          {SIGNUP_KYC_CARTOON_HEADLINE}
        </Text>
      )}
      <CartoonStudioPlayer project={SIGNUP_KYC_CARTOON_SAMPLE} sample />
      {compact ? null : (
        <TapToRead title="What this cartoon is">
          {SIGNUP_KYC_CARTOON_BLURB}
          {"\n\n"}
          {SIGNUP_KYC_CARTOON_QUALITY_NOTE}
        </TapToRead>
      )}
    </View>
  );
}
