import React, { useState } from "react";
import { View, Text, TextInput, KeyboardAvoidingView, Platform, Pressable, Alert, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../lib/auth-context";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    try {
      await login(email, password);
      Alert.alert("Success", "Vault Access Granted");
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Access Denied", error.message || "Invalid login credentials");
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>UR PLATFORM</Text>
        <Text style={styles.subtitle}>SECURE ACCESS REQUIRED</Text>

        <Text style={styles.label}>EMAIL ADDRESS</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>PASSWORD</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable 
          style={[styles.button, (!email || !password || isLoading) && styles.buttonDisabled]} 
          onPress={handleLogin}
          disabled={!email || !password || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "AUTHORIZING..." : "AUTHORIZE"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center' },
  content: { padding: 24 },
  title: { fontSize: 32, fontWeight: '900', color: '#FFF', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#00E676', marginBottom: 40, fontWeight: 'bold' },
  label: { color: '#CCC', fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  input: { backgroundColor: '#1a1a1a', color: '#FFF', padding: 16, borderRadius: 8, marginBottom: 24, fontSize: 16 },
  button: { backgroundColor: '#333', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
});
