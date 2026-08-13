import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, Alert, ScrollView } from "react-native";
import { useRouter, Link, useLocalSearchParams } from "expo-router";
import { useAuth, type UserRole } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { LAUNCH_PROMOTION_SUBLINE } from "@/lib/launch-promotion-config";

const ROLES: { id: UserRole; label: string; desc: string }[] = [
  { id: "creator", label: "Content creator", desc: "Host paid live classes · 85% instant payouts" },
  { id: "affiliate", label: "Affiliate", desc: "Refer creators · earn $5 each" },
  { id: "worker", label: "Worker", desc: "Find work on the platform" },
  { id: "3d-user", label: "3D / Print", desc: "3D models & printing" },
];

export default function SignUpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ref?: string; role?: string; email?: string; membership?: string }>();
  const { register } = useAuth();
  const colors = useColors();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [role, setRole] = useState<UserRole>("creator");
  const [submitting, setSubmitting] = useState(false);

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
  }, [params.ref, params.role, params.email]);

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter your name, email, and password");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      await register(email.trim(), password.trim(), name.trim(), role);
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
        [{ text: "OK", onPress: () => router.replace("/(tabs)") }],
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
              Create your account
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
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
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
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8, lineHeight: 18 }}>
                  After signup, connect Uphold or a USDC wallet in your Creator Dashboard to receive
                  85% of each class sale instantly on the blockchain.
                </Text>
              ) : null}
            </View>
          </View>

          <Pressable
            onPress={handleSignUp}
            disabled={loading}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              opacity: loading ? 0.6 : 1,
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
