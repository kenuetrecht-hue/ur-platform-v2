import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { trpc } from "./trpc";

interface User {
  id: string;
  email: string;
  role?: string;
}

interface SecureAuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const SecureAuthContext = createContext<SecureAuthContextType | undefined>(
  undefined
);

export function SecureAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing token on mount
  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await SecureStore.getItemAsync("authToken");
        if (token) {
          // Verify token with backend
          const response = await trpc.auth.getCurrentUser.query();
          if (response) {
            setUser(response);
          }
        }
      } catch (err) {
        console.error("Token check failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    checkToken();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await trpc.auth.login.mutate({ email, password });
      if (response.token) {
        // Store token in secure storage
        await SecureStore.setItemAsync("authToken", response.token);
        setUser(response.user);
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync("authToken");
      setUser(null);
      setError(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <SecureAuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        error,
      }}
    >
      {children}
    </SecureAuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(SecureAuthContext);
  if (!context) {
    throw new Error("useAuth must be used within SecureAuthProvider");
  }
  return context;
}
