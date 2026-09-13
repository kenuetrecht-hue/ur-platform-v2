import { useEffect, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { JOIN_ID_PHOTOS_HREF } from "@/lib/after-sign-in";
import { ID_MUST_PASS_FIRST, signupPrivacyBlock } from "@/lib/signup-step-copy";
import { TERMS_SIGNUP_ACKNOWLEDGMENT } from "@/lib/platform-terms-of-use";
import { TapToRead } from "@/components/tap-to-read";
import {
  canContinueToIdPictures,
  loadJoinAccountDraft,
  saveJoinAccountDraft,
} from "@/lib/join-account-draft";
import { getStayLoggedIn, setStayLoggedIn } from "@/lib/stay-logged-in";

/** Sign up page 1: name, email, password, terms. No cameras. */
export function FinishAccountAfterIdPass() {
  const colors = useColors();
  const router = useRouter();
  const saved = loadJoinAccountDraft();
  const [name, setName] = useState(saved.name);
  const [email, setEmail] = useState(saved.email);
  const [password, setPassword] = useState(saved.password);
  const [acceptedTerms, setAcceptedTerms] = useState(saved.acceptedTerms);
  const [turnstileToken, setTurnstileToken] = useState(saved.turnstileToken);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedInBox] = useState(() => getStayLoggedIn());

  useEffect(() => {
    saveJoinAccountDraft({ name, email, password, acceptedTerms, turnstileToken });
  }, [name, email, password, acceptedTerms, turnstileToken]);

  const onContinueToId = () => {
    const draft = { name, email, password, acceptedTerms, turnstileToken };
    saveJoinAccountDraft(draft);
    if (!canContinueToIdPictures(draft)) {
      if (!name.trim() || !email.trim() || !password.trim()) {
        setError("Type your name, email, and password first.");
        return;
      }
      if (password.trim().length < 6) {
        setError("Password needs at least 6 characters.");
        return;
      }
      setError("Check the box that you agree to the Terms.");
      return;
    }
    setError(null);
    router.replace(JOIN_ID_PHOTOS_HREF);
  };

  const inputStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.foreground,
    width: "100%" as const,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  };

  return (
    <View style={{ gap: 12, width: "100%" }} testID="finish-account-after-id-pass">
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>
        Name, email, and password
      </Text>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
        Fill these in first. Pictures are on the next pages. After they pass, we log you in.
      </Text>

      <Text style={{ color: colors.foreground, fontWeight: "600" }}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={colors.muted}
        autoCapitalize="words"
        style={inputStyle}
        testID="finish-account-name"
      />

      <Text style={{ color: colors.foreground, fontWeight: "600" }}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={colors.muted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="username"
        textContentType="username"
        autoCorrect={false}
        nativeID="login-email"
        style={inputStyle}
        testID="login-email"
      />

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: colors.foreground, fontWeight: "600" }}>Password</Text>
        <Pressable
          onPress={() => setShowPassword((value) => !value)}
          hitSlop={10}
          testID="show-password"
          accessibilityRole="button"
          style={{ paddingVertical: 6, paddingHorizontal: 8 }}
        >
          <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 14 }}>
            {showPassword ? "Hide password" : "Show password"}
          </Text>
        </Pressable>
      </View>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="At least 6 characters"
        placeholderTextColor={colors.muted}
        secureTextEntry={!showPassword}
        autoComplete="current-password"
        textContentType="password"
        nativeID="login-password"
        style={inputStyle}
        testID="login-password"
      />

      <Pressable
        onPress={() => setAcceptedTerms((value) => !value)}
        style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 4 }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: acceptedTerms ? colors.primary : colors.border,
            backgroundColor: acceptedTerms ? colors.primary : "transparent",
            marginTop: 2,
          }}
        />
        <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20, flex: 1 }}>
          I am 18 or older and I agree to the Terms. Check this box here — you do not leave this
          page.
        </Text>
      </Pressable>
      <Pressable
        onPress={() => {
          setStayLoggedInBox((value) => {
            const next = !value;
            setStayLoggedIn(next);
            return next;
          });
        }}
        style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 4 }}
        testID="stay-logged-in"
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: stayLoggedIn ? colors.primary : colors.border,
            backgroundColor: stayLoggedIn ? colors.primary : "transparent",
            marginTop: 2,
          }}
        />
        <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20, flex: 1 }}>
          Stay logged in. Next time you open the app, you will already be signed in.
        </Text>
      </Pressable>
      <TapToRead title="Read the Terms (stay on this page)" testID="join-terms-tab">
        {TERMS_SIGNUP_ACKNOWLEDGMENT}
      </TapToRead>
      <TapToRead title="Why we ask and what we keep" testID="join-why-tab">
        {ID_MUST_PASS_FIRST}
        {"\n\n"}
        {signupPrivacyBlock()}
      </TapToRead>

      <TurnstileWidget action="signup" onToken={setTurnstileToken} />

      {error ? (
        <Text style={{ color: "#c0392b", fontSize: 14, lineHeight: 20 }}>{error}</Text>
      ) : null}

      <PrimaryActionButton
        label="Continue to ID pictures"
        onPress={onContinueToId}
        backgroundColor={colors.primary}
        testID="finish-account-create"
      />
    </View>
  );
}
