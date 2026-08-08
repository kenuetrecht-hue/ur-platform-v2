import { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Platform,
  useWindowDimensions,
} from "react-native";
import { LANDING_THEME as T } from "@/lib/landing-theme";

type Props = {
  visible: boolean;
  handoffUrl: string;
};

export function LandingPaymentSuccessModal({ visible, handoffUrl }: Props) {
  const { width } = useWindowDimensions();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const glow = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (!visible || !handoffUrl) return;

    let cancelled = false;
    void import("qrcode").then((QRCode) =>
      QRCode.toDataURL(handoffUrl, {
        width: 512,
        margin: 1,
        color: { dark: "#00d4ff", light: "#07080dff" },
        errorCorrectionLevel: "M",
      }).then((url) => {
        if (!cancelled) setQrDataUrl(url);
      }),
    );

    scale.setValue(0.92);
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1400, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1400, useNativeDriver: false }),
      ]),
    );
    pulse.start();

    return () => {
      cancelled = true;
      pulse.stop();
    };
  }, [visible, handoffUrl, glow, scale]);

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });

  const glowRadius = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 42],
  });

  const qrSize = Math.min(width - 80, 340);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <Text style={styles.successTag}>◈</Text>
          <Text style={styles.title}>PAYMENT SUCCESSFUL</Text>
          <Text style={styles.sub}>
            Scan this code with your phone&apos;s camera to download the mobile app and log in
            instantly.
          </Text>

          <View style={[styles.qrWrap, { width: qrSize + 32, height: qrSize + 32 }]}>
            <Animated.View
              style={[
                styles.qrGlow,
                {
                  width: qrSize + 32,
                  height: qrSize + 32,
                  shadowOpacity: glowOpacity,
                  shadowRadius: glowRadius,
                },
              ]}
            />
            <View style={[styles.qrFrame, { width: qrSize, height: qrSize }]}>
              {qrDataUrl ? (
                <Image
                  source={{ uri: qrDataUrl }}
                  style={{ width: qrSize - 16, height: qrSize - 16 }}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <Text style={styles.qrPlaceholderText}>Generating QR…</Text>
                </View>
              )}
            </View>
          </View>

          {Platform.OS === "web" ? (
            <Text style={styles.hint}>Point your phone camera at the glowing code above.</Text>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 6, 12, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: T.electric,
    backgroundColor: T.bgElevated,
    padding: 28,
    alignItems: "center",
  },
  successTag: {
    color: T.electric,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 3,
    marginBottom: 12,
    textAlign: "center",
  },
  title: {
    color: T.text,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 10,
    textAlign: "center",
  },
  sub: {
    color: T.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  qrWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  qrGlow: {
    position: "absolute",
    borderRadius: 24,
    shadowColor: T.electric,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  qrFrame: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: T.electric,
    backgroundColor: "#07080d",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  qrPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  qrPlaceholderText: {
    color: T.muted,
    fontSize: 13,
  },
  hint: {
    color: T.muted,
    fontSize: 12,
    textAlign: "center",
  },
});
