/**
 * app/index.tsx
 * 
 * THE FRONT DOOR - Routes based on authentication state
 * This is the entry point when the app loads
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/use-colors';

// Import useAuth with error handling
let useAuthHook: any = null;
try {
  const authModule = require('@/lib/auth-context');
  useAuthHook = authModule.useAuth;
} catch (e) {
  console.log('Auth not ready yet');
}

export default function Index() {
  const router = useRouter();
  const colors = useColors();

  // Safely call useAuth if it's available
  let authState = { isAuthenticated: false, isLoading: true };
  try {
    if (useAuthHook) {
      authState = useAuthHook();
    }
  } catch (error) {
    console.log('Auth context not ready, showing loading...');
  }

  const { isAuthenticated, isLoading } = authState;

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      router.replace('/(tabs)');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
