import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import {
  OWNER_SIGNIN_RESET_CONFIRM,
  type OwnerSigninResetAction,
} from "@/lib/owner-signin-reset";

/** Owner-only: send a new-password email or clear sign-in so they can Sign up again. */
export function OwnerSigninResetPanel() {
  const colors = useColors();
  const [email, setEmail] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const reset = trpc.platformOps.resetMemberSignIn.useMutation({
    onSuccess: (data) => {
      setResult(data.message);
      setConfirmPhrase("");
    },
    onError: (error) => {
      setResult(error.message);
    },
  });

  const run = (action: OwnerSigninResetAction) => {
    setResult(null);
    reset.mutate({
      email: email.trim(),
      action,
      confirmPhrase,
    });
  };

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
        Unlock a stuck login
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        Only you can do this. Type the member email, type {OWNER_SIGNIN_RESET_CONFIRM}, then send a
        new-password email or clear sign-in so they can Sign up again.
      </Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        maxLength={254}
        placeholder="member@email.com"
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
        testID="owner-signin-reset-email"
      />
      <TextInput
        value={confirmPhrase}
        onChangeText={setConfirmPhrase}
        autoCapitalize="characters"
        maxLength={40}
        placeholder={OWNER_SIGNIN_RESET_CONFIRM}
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
        testID="owner-signin-reset-confirm"
      />
      <Pressable
        onPress={() => run("send_new_password")}
        disabled={reset.isPending}
        style={[styles.btn, { backgroundColor: colors.primary }]}
        testID="owner-send-new-password"
      >
        {reset.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "800" }}>Send a new password email</Text>
        )}
      </Pressable>
      <Pressable
        onPress={() => run("clear_so_they_can_signup")}
        disabled={reset.isPending}
        style={[styles.btn, { backgroundColor: "#8a1c1c" }]}
        testID="owner-clear-signin"
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>Clear sign-in so they can Sign up</Text>
      </Pressable>
      {result ? (
        <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 18 }}>{result}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 13 },
  btn: { borderRadius: 10, padding: 12, alignItems: "center" },
});
