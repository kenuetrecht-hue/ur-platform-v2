import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Platform } from "react-native";
import { useRouter, Link, useLocalSearchParams } from "expo-router";
import { useAuth, type UserRole } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { LAUNCH_PROMOTION_SUBLINE } from "@/lib/launch-promotion-config";
import { AFFILIATE_REFERRAL_PAYOUT_RULE } from "@/lib/affiliate-referral-payout-policy";
import { CREATOR_CONTENT_PROTECTION_NOTICE } from "@/lib/creator-content-protection-copy";
import { TERMS_SIGNUP_ACKNOWLEDGMENT } from "@/lib/platform-terms-of-use";
import { ID_MUST_PASS_FIRST, SIGNUP_FIELDS, SIGNUP_PAGE_WHY, signupPrivacyBlock } from "@/lib/signup-step-copy";
import { getAgeKycPassToken, hasAgeKycPassToken } from "@/lib/age-kyc-pass-store";
import { claimStoredAgeKycPass } from "@/lib/claim-stored-age-kyc-pass";
import { hrefAfterSignIn } from "@/lib/after-sign-in";
import { SignupStepExplain } from "@/components/signup-step-explain";
import { saveLandingDemoAttributionId } from "@/lib/landing-demo-attribution-storage";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { WebLoginSubmit } from "@/components/web-login-submit";
import { showUserMessage } from "@/lib/show-user-message";
import { explainAuthFailure } from "@/lib/auth-network-error";
import { markGiveJoinEmanual } from "@/lib/join-emanual-handoff";
import { IdCheckDuringSignin } from "@/components/id-check-during-signin";

const ROLES: { id: UserRole; label: string; desc: string }[] = [
  { id: "creator", label: "Content creator", desc: "Host paid live classes · 85% instant payouts" },
  { id: "affiliate", label: "Affiliate", desc: "Refer creators · $5 after their free 24h, then 5 sales" },
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
  const [formError, setFormError] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [idPassed, setIdPassed] = useState(() => hasAgeKycPassToken());
  const onIdPassed = useCallback(() => setIdPassed(true), []);
  const onIdReset = useCallback(() => setIdPassed(false), []);
  const onTurnstileToken = useCallback((token: string) => setTurnstileToken(token), []);
  const verifyTurnstile = trpc.auth.verifyTurnstile.useMutation();
  const turnstileConfig = trpc.auth.turnstileConfig.useQuery(undefined, { staleTime: 60_000 });

  const refValidation = trpc.partnerDashboard.validateReferralCode.useQuery(
    { code: referralCode.trim() },
    { enabled: referralCode.trim().length >= 3 },
  );
  const completeEnrollment = trpc.partnerDashboard.completePartnerEnrollment.useMutation();
  const claimPass = trpc.ageKyc.claimPass.useMutation();

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
    setFormError(null);

    if (!idPassed || !getAgeKycPassToken()) {
      const msg = ID_MUST_PASS_FIRST;
      setFormError(msg);
      showUserMessage("Pictures first", msg);
      return;
    }

    if (!name.trim() || !email.trim() || !password.trim()) {
      const msg = "Please enter your name, email, and password.";
      setFormError(msg);
      showUserMessage("Error", msg);
      return;
    }

    if (password.length < 6) {
      const msg = "Password must be at least 6 characters.";
      setFormError(msg);
      showUserMessage("Error", msg);
      return;
    }

    if (!acceptedTerms) {
      const msg = "Please agree to the Terms of Use to create an account.";
      setFormError(msg);
      showUserMessage("Terms required", msg);
      return;
    }

    if (turnstileConfig.data?.required && !turnstileToken.trim()) {
      const msg = "Complete the Cloudflare security check before creating an account.";
      setFormError(msg);
      showUserMessage("Security check", msg);
      return;
    }

    setSubmitting(true);
    setStatusLine("Creating account…");
    try {
      await verifyTurnstile.mutateAsync({
        token: turnstileToken,
        action: "signup",
        email: email.trim(),
        displayName: name.trim(),
        honeypot,
      });
      const result = await register(
        email.trim(),
        password.trim(),
        name.trim(),
        role,
        turnstileToken || undefined,
      );
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
      markGiveJoinEmanual();
      if (result.needsEmailConfirmation) {
        const msg =
          "Account created. Confirm your email in the inbox, then sign in. You will receive the free join e-manual after you sign in. In the Supabase dashboard you can turn off Confirm email for local testing.";
        setFormError(msg);
        setStatusLine(null);
        showUserMessage("Confirm your email", msg);
        router.replace("/login");
        return;
      }
      let claimed = false;
      try {
        claimed = await claimStoredAgeKycPass((input) => claimPass.mutateAsync(input));
      } catch (claimErr) {
        const claimMsg = explainAuthFailure(claimErr);
        setFormError(claimMsg);
        showUserMessage("Pictures passed — sign-in next", claimMsg);
      }
      setStatusLine(claimed ? "Success — opening the app…" : "Success — finishing the ID check…");
      router.replace(hrefAfterSignIn(claimed));
    } catch (err) {
      const msg = explainAuthFailure(err);
      setFormError(msg);
      setStatusLine(null);
      showUserMessage("Sign up failed", msg);
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
            <Link href="/welcome" style={{ color: colors.muted, fontSize: 13 }}>
              ← Back to homepage
            </Link>
            <Link href="/download" style={{ color: colors.primary, fontSize: 13, fontWeight: "700" }}>
              Download the app from this website
            </Link>
            <Link href="/e-manual" style={{ color: colors.primary, fontSize: 13, fontWeight: "700" }}>
              Free join e-manual (print and sell your own)
            </Link>
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
            <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center", lineHeight: 19 }}>
              {SIGNUP_PAGE_WHY}
            </Text>
            <IdCheckDuringSignin onPassed={onIdPassed} onReset={onIdReset} />
            {idPassed ? (
            <Text style={{ fontSize: 16, color: colors.foreground, textAlign: "center", fontWeight: "800", marginTop: 8 }}>
              Then create the account below
            </Text>
            ) : (
            <Text
              style={{ fontSize: 16, color: colors.foreground, textAlign: "center", fontWeight: "800", marginTop: 8 }}
              testID="id-check-gate"
            >
              {ID_MUST_PASS_FIRST}
            </Text>
            )}
            {idPassed ? (
            <>
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
                {"\n\n"}Every new member receives a free step-by-step e-manual after they join — how to print it and sell their own on this website.
              </Text>
            )}
            </>
            ) : null}
          </View>

          {idPassed ? (
          <>
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
              <SignupStepExplain doThis={SIGNUP_FIELDS[0].doThis} why={SIGNUP_FIELDS[0].why} />
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
              <SignupStepExplain doThis={SIGNUP_FIELDS[1].doThis} why={SIGNUP_FIELDS[1].why} />
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
              <SignupStepExplain doThis={SIGNUP_FIELDS[2].doThis} why={SIGNUP_FIELDS[2].why} />
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
                <SignupStepExplain doThis={SIGNUP_FIELDS[3].doThis} why={SIGNUP_FIELDS[3].why} />
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
              <SignupStepExplain doThis={SIGNUP_FIELDS[4].doThis} why={SIGNUP_FIELDS[4].why} />
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
              {role === "creator" || role === "affiliate" ? (
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8, lineHeight: 18 }}>
                  {AFFILIATE_REFERRAL_PAYOUT_RULE}
                </Text>
              ) : null}
            </View>
          </View>

          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 12,
              gap: 8,
            }}
          >
            <SignupStepExplain doThis={SIGNUP_FIELDS[5].doThis} why={SIGNUP_FIELDS[5].why} />
            <SignupStepExplain doThis={SIGNUP_FIELDS[6].doThis} why={SIGNUP_FIELDS[6].why} />
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
              {signupPrivacyBlock()}
            </Text>
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
              <Link href="/terms" style={{ color: colors.primary, fontWeight: "700" }}>
                Read full Terms
              </Link>
            </Text>
          </Pressable>

          <TurnstileWidget action="signup" onToken={onTurnstileToken} />

          {formError ? (
            <Text style={{ color: "#ef4444", fontSize: 14, textAlign: "center", lineHeight: 20 }}>
              {formError}
            </Text>
          ) : null}
          {statusLine ? (
            <Text style={{ color: colors.primary, fontSize: 14, textAlign: "center", fontWeight: "600" }}>
              {statusLine}
            </Text>
          ) : null}

          {Platform.OS === "web" ? (
            <WebLoginSubmit
              label="Create account"
              loadingLabel="Creating account…"
              loading={loading}
              backgroundColor={colors.primary}
              onPress={handleSignUp}
              mountId="web-signup-submit-mount"
              buttonId="web-signup-submit-button"
              testID="signup-submit"
            />
          ) : (
            <PrimaryActionButton
              label="Create account"
              loadingLabel="Creating account…"
              loading={loading}
              onPress={handleSignUp}
              backgroundColor={colors.primary}
              testID="signup-submit"
            />
          )}
          </>
          ) : null}

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
