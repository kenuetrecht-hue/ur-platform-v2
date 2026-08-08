import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ScrollView } from "react-native";
import { useRouter, Link } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading: authLoading } = useAuth();
  const colors = useColors();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password.trim());
      router.replace("/(tabs)");
    } catch (err) {
      Alert.alert(
        "Login Failed",
        err instanceof Error ? err.message : "Unknown error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const loading = submitting || authLoading;

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
              Sign in to your account
            </Text>
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
                placeholder="Your password"
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
          </View>

          <Pressable
            onPress={handleLogin}
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
              {loading ? "Signing in..." : "Sign In"}
            </Text>
          </Pressable>

          <View style={{ alignItems: "center" }}>
            <Text style={{ color: colors.muted, fontSize: 14 }}>
              Don&apos;t have an account?{" "}
              <Link href="/signup" style={{ color: colors.primary, fontWeight: "700" }}>
                Sign up
              </Link>
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
