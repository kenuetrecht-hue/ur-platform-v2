import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, Alert, ScrollView } from "react-native";
import { useRouter, Link, useLocalSearchParams } from "expo-router";
import { useAuth, type UserRole } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { LAUNCH_PROMOTION_SUBLINE } from "@/lib/launch-promotion-config";
import { CREATOR_CONTENT_PROTECTION_NOTICE } from "@/lib/creator-content-protection-copy";
import { TERMS_SIGNUP_ACKNOWLEDGMENT } from "@/lib/platform-terms-of-use";
import { saveLandingDemoAttributionId } from "@/lib/landing-demo-attribution-storage";
import { TurnstileWidget } from "@/components/turnstile-widget";

const ROLES: { id: UserRole; label: string; desc: string }[] = [
  { id: "creator", label: "Content creator", desc: "Host paid live classes · 85% instant payouts" },
  { id: "affiliate", label: "Affiliate", desc: "Refer creators · earn $5 each" },
  { id: "worker", label: "Worker", desc: "Find work on the platform" },
  { id: "3d-user", label: "3D / Print", desc: "3D models & printing" },
];

export default function SignUpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    ref?: string;
    role?: string;
    email?: string;
    membership?: string;
    source?: string;
    demoAttribution?: string;
    demoCreator?: string;
  }>();
  const { register } = useAuth();
  const colors = useColors();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [role, setRole] = useState<UserRole>("creator");
  const [submitting, setSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const verifyTurnstile = trpc.auth.verifyTurnstile.useMutation();
  const turnstileConfig = trpc.auth.turnstileConfig.useQuery(undefined, { staleTime: 60_000 });

  const refValidation = trpc.partnerDashboard.validateReferralCode.useQuery(
    { code: referralCode.trim() },
    { enabled: referralCode.trim().length >= 3 },
  );
  const completeEnrollment = trpc.partnerDashboard.completePartnerEnrollment.useMutation();

  useEffect(() => {
    if (typeof params.ref === "string" && params.ref) {
      setReferralCode(params.ref.toUpperCase());
    }
    if (params.role === "creator" || params.role === "affiliate") {
      setRole(params.role);
    }
    if (typeof params.email === "string" && params.email.includes("@")) {
      setEmail(params.email);
    }
    if (typeof params.demoAttribution === "string" && params.demoAttribution) {
      void saveLandingDemoAttributionId(params.demoAttribution);
    }
  }, [params.ref, params.role, params.email, params.demoAttribution]);

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter your name, email, and password");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (!acceptedTerms) {
      Alert.alert("Terms required", "Please agree to the Terms of Use to create an account.");
      return;
    }

    if (turnstileConfig.data?.required && !turnstileToken.trim()) {
      Alert.alert("Security check", "Complete the Cloudflare security check before creating an account.");
      return;
    }

    setSubmitting(true);
    try {
      await verifyTurnstile.mutateAsync({
        token: turnstileToken,
        action: "signup",
        email: email.trim(),
        displayName: name.trim(),
        honeypot,
      });
      await register(email.trim(), password.trim(), name.trim(), role, turnstileToken || undefined);
      if (role === "creator" || role === "affiliate") {
        try {
          await completeEnrollment.mutateAsync({
            role: role === "affiliate" ? "affiliate" : "creator",
            referralCode: referralCode.trim() || undefined,
          });
        } catch {
          /* enrollment can be completed from dashboard */
        }
      }
      Alert.alert(
        "Account created",
        "Welcome to UR Platform. If email confirmation is enabled, check your inbox first.",
        [{ text: "OK", onPress: () => router.replace("/age-verify") }],
      );
    } catch (err) {
      Alert.alert(
        "Sign up failed",
        err instanceof Error ? err.message : "Unknown error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const loading = submitting;

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View style={{ gap: 24 }}>
          <View style={{ alignItems: "center", gap: 8 }}>
            <Text
              style={{
                fontSize: 32,
                fontWeight: "bold",
                color: colors.foreground,
              }}
            >
              UR Platform
            </Text>
            <Text style={{ fontSize: 16, color: colors.muted }}>
              Create your account — 18+ ID check is next
            </Text>
            {params.membership === "active" ? (
              <Text
                style={{
                  fontSize: 13,
                  color: "#00d4ff",
                  fontWeight: "700",
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                PAYMENT SUCCESSFUL — Your specialist pass is active. Finish signup to log in.
              </Text>
            ) : null}
            {params.source === "landing_demo" ? (
              <Text
                style={{
                  fontSize: 13,
                  color: colors.primary,
                  fontWeight: "700",
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                You tried a free AI sample — create your account to unlock full access
              </Text>
            ) : null}
            {params.ref ? (
              <Text
                style={{
                  fontSize: 13,
                  color: colors.primary,
                  fontWeight: "700",
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                Launch promotion applies by signup order · referral {String(params.ref).toUpperCase()}
              </Text>
            ) : (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.muted,
                  textAlign: "center",
                  marginTop: 4,
                  lineHeight: 18,
                }}
              >
                {LAUNCH_PROMOTION_SUBLINE}
              </Text>
            )}
          </View>

          <View style={{ gap: 16 }}>
            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.foreground,
                  marginBottom: 8,
                }}
              >
                Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.muted}
                autoCapitalize="words"
                maxLength={80}
                editable={!loading}
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 16,
                  color: colors.foreground,
                }}
              />
            </View>

            <TextInput
              value={honeypot}
              onChangeText={setHoneypot}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              autoComplete="off"
              textContentType="none"
              maxLength={200}
              style={{ position: "absolute", left: -9999, height: 1, width: 1, opacity: 0 }}
            />

            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.foreground,
                  marginBottom: 8,
                }}
              >
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={254}
                editable={!loading}
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 16,
                  color: colors.foreground,
                }}
              />
            </View>

            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.foreground,
                  marginBottom: 8,
                }}
              >
                Password
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.muted}
                secureTextEntry
                editable={!loading}
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 16,
                  color: colors.foreground,
                }}
              />
            </View>

            {role === "creator" ? (
              <View>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.foreground,
                    marginBottom: 8,
                  }}
                >
                  Referral code (optional)
                </Text>
                <TextInput
                  value={referralCode}
                  onChangeText={setReferralCode}
                  placeholder="Affiliate code if someone referred you"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                  editable={!loading}
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 16,
                    color: colors.foreground,
                  }}
                />
                {refValidation.data?.valid ? (
                  <Text style={{ color: colors.primary, fontSize: 12, marginTop: 4 }}>
                    Referred by {refValidation.data.affiliateName}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.foreground,
                  marginBottom: 8,
                }}
              >
                I am a…
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {ROLES.map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => setRole(r.id)}
                    disabled={loading}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: role === r.id ? colors.primary : colors.border,
                      backgroundColor: role === r.id ? `${colors.primary}18` : colors.surface,
                      maxWidth: "48%",
                    }}
                  >
                    <Text
                      style={{
                        color: role === r.id ? colors.primary : colors.foreground,
                        fontWeight: "600",
                        fontSize: 13,
                      }}
                    >
                      {r.label}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>{r.desc}</Text>
                  </Pressable>
                ))}
              </View>
              {role === "creator" ? (
                <>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8, lineHeight: 18 }}>
                    After signup, connect Uphold or a USDC wallet in your Creator Dashboard to receive
                    85% of each class sale instantly on the blockchain.
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8, lineHeight: 16 }}>
                    {CREATOR_CONTENT_PROTECTION_NOTICE}
                  </Text>
                </>
              ) : null}
            </View>
          </View>

          <Pressable
            onPress={() => setAcceptedTerms((v) => !v)}
            style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: acceptedTerms ? colors.primary : colors.border,
                backgroundColor: acceptedTerms ? colors.primary : "transparent",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              {acceptedTerms ? <Text style={{ color: "#fff", fontSize: 14, fontWeight: "800" }}>✓</Text> : null}
            </View>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, flex: 1 }}>
              {TERMS_SIGNUP_ACKNOWLEDGMENT}{" "}
              <Link href="/profile/terms" style={{ color: colors.primary, fontWeight: "700" }}>
                Read full Terms
              </Link>
            </Text>
          </Pressable>

          <TurnstileWidget action="signup" onToken={setTurnstileToken} />

          <Pressable
            onPress={handleSignUp}
            disabled={loading || !acceptedTerms}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              opacity: loading || !acceptedTerms ? 0.6 : 1,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
              {loading ? "Creating account…" : "Create account"}
            </Text>
          </Pressable>

          <View style={{ alignItems: "center" }}>
            <Text style={{ color: colors.muted, fontSize: 14 }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: colors.primary, fontWeight: "700" }}>
                Sign in
              </Link>
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
