import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { router, useSegments } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";

interface AuthUser {
  id: string;
  email: string;
  username?: string;
  photo?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (accessToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const AUTH_SESSION_KEY = "supabase.session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();

  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessionStr = await SecureStore.getItemAsync(AUTH_SESSION_KEY);
        if (sessionStr) {
          const session: Session = JSON.parse(sessionStr);
          if (session.user) {
            setUser({
              id: session.user.id,
              email: session.user.email || "",
              username: session.user.user_metadata?.username,
              photo: session.user.user_metadata?.photo,
            });
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error("Failed to load session from SecureStore", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          await SecureStore.setItemAsync(AUTH_SESSION_KEY, JSON.stringify(session));
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            username: session.user.user_metadata?.username,
            photo: session.user.user_metadata?.photo,
          });
          setIsAuthenticated(true);
        } else if (event === "SIGNED_OUT") {
          await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
          setUser(null);
          setIsAuthenticated(false);
        }
        setIsLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (accessToken: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.setSession({ access_token: accessToken });
    if (error) {
      console.error("Error setting session:", error);
      setIsAuthenticated(false);
      setUser(null);
    } else if (data.session) {
      await SecureStore.setItemAsync(AUTH_SESSION_KEY, JSON.stringify(data.session));
      setUser({
        id: data.session.user.id,
        email: data.session.user.email || "",
        username: data.session.user.user_metadata?.username,
        photo: data.session.user.user_metadata?.photo,
      });
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    } else {
      await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
      setUser(null);
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  }, []);

  // This effect redirects the user based on authentication state
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && segments[0] !== "(tabs)") {
        router.replace("/(tabs)");
      } else if (!isAuthenticated && segments[0] !== "login") {
        router.replace("/login");
      }
    }
  }, [isAuthenticated, isLoading, segments]);

  const value = React.useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      signIn,
      signOut,
    }),
    [user, isAuthenticated, isLoading, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
