import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useSecureAuth } from '@/lib/secure-auth-context';
import { validatePasswordStrength, validateEmail, sanitizeInput } from '@/lib/security-constants';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';

export default function LoginScreen() {
  const colors = useColors();
  const { secureLogin, isLoading } = useSecureAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      // Sanitize inputs
      const cleanEmail = sanitizeInput(email);
      const cleanPassword = sanitizeInput(password);

      // Validate email
      if (!validateEmail(cleanEmail)) {
        setError('Invalid email format');
        setLoading(false);
        return;
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(cleanPassword);
      if (!passwordValidation.isValid) {
        setError(passwordValidation.errors[0]);
        setLoading(false);
        return;
      }

      // Attempt secure login
      const success = await secureLogin(cleanEmail, cleanPassword);

      if (!success) {
        setError('Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer className="p-6 justify-center">
      <View className="gap-6">
        <Text className="text-3xl font-bold text-foreground">Login</Text>

        {error && (
          <View className="bg-error/10 p-4 rounded-lg">
            <Text className="text-error text-sm">{error}</Text>
          </View>
        )}

        <View className="gap-2">
          <Text className="text-foreground font-semibold">Email</Text>
          <TextInput
            className="border border-border rounded-lg p-3 text-foreground"
            placeholder="Enter your email"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            editable={!loading}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View className="gap-2">
          <Text className="text-foreground font-semibold">Password</Text>
          <TextInput
            className="border border-border rounded-lg p-3 text-foreground"
            placeholder="Enter your password"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            secureTextEntry
          />
        </View>

        <Pressable
          onPress={handleLogin}
          disabled={loading}
          className="bg-primary p-4 rounded-lg"
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text className="text-background text-center font-bold">Login</Text>
          )}
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
