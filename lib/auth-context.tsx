import React, {
  createContext,
  useReducer,
  useCallback,
  useEffect,
  useContext,
} from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import {
  clearAuthStorage,
  getAccessToken,
  getStoredUserJson,
  setAccessToken,
  setStoredUserJson,
} from "./auth-storage";

export type UserRole = "creator" | "worker" | "admin" | "3d-user";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  accessToken: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
  ) => Promise<void>;
  clearError: () => void;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  accessToken: null,
};

type AuthAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "LOGIN_SUCCESS"; payload: { user: AuthUser; accessToken: string } }
  | { type: "LOGOUT" }
  | { type: "SET_USER"; payload: AuthUser };

function mapSupabaseUser(user: SupabaseUser): AuthUser {
  return {
    id: user.id,
    email: user.email || "",
    name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
    role: user.user_metadata?.role || "creator",
    avatar: user.user_metadata?.avatar,
  };
}

async function persistSession(session: Session, user: AuthUser): Promise<void> {
  await setAccessToken(session.access_token);
  await setStoredUserJson(JSON.stringify(user));
}

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "LOGIN_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        accessToken: action.payload.accessToken,
        error: null,
        isLoading: false,
      };
    case "LOGOUT":
      return { ...initialState, isLoading: false };
    case "SET_USER":
      return { ...state, user: action.payload };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user && session.access_token) {
          const authUser = mapSupabaseUser(session.user);
          await persistSession(session, authUser);
          if (mounted) {
            dispatch({
              type: "LOGIN_SUCCESS",
              payload: { user: authUser, accessToken: session.access_token },
            });
          }
          return;
        }

        // Fallback: read cached credentials if Supabase session is unavailable
        const cachedUserJson = await getStoredUserJson();
        const token = await getAccessToken();

        if (cachedUserJson && token && mounted) {
          const user = JSON.parse(cachedUserJson) as AuthUser;
          dispatch({
            type: "LOGIN_SUCCESS",
            payload: { user, accessToken: token },
          });
        }
      } catch (error) {
        console.error("[Auth] Session restore failed:", error);
      } finally {
        if (mounted) {
          dispatch({ type: "SET_LOADING", payload: false });
        }
      }
    };

    restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" && session?.user && session.access_token) {
        const authUser = mapSupabaseUser(session.user);
        await persistSession(session, authUser);
        dispatch({
          type: "LOGIN_SUCCESS",
          payload: { user: authUser, accessToken: session.access_token },
        });
        return;
      }

      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        if (event === "SIGNED_OUT") {
          await clearAuthStorage();
          dispatch({ type: "LOGOUT" });
          return;
        }

        if (session?.user && session.access_token) {
          const authUser = mapSupabaseUser(session.user);
          await persistSession(session, authUser);
          dispatch({
            type: "LOGIN_SUCCESS",
            payload: { user: authUser, accessToken: session.access_token },
          });
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });

    try {
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user || !data.session) {
        throw new Error("Login failed: No user or session returned");
      }

      const authUser = mapSupabaseUser(data.user);
      await persistSession(data.session, authUser);
      dispatch({
        type: "LOGIN_SUCCESS",
        payload: { user: authUser, accessToken: data.session.access_token },
      });
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Login failed. Please try again.";
      dispatch({ type: "SET_ERROR", payload: msg });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("[Auth] Supabase signOut error:", error);
    } finally {
      await clearAuthStorage();
      dispatch({ type: "LOGOUT" });
    }
  }, []);

  const register = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      role: UserRole,
    ) => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        if (!email || !password || !name) {
          throw new Error("Email, password, and name are required");
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: { name, role },
          },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (!data.user) {
          throw new Error("Registration failed: No user returned");
        }

        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || "",
          name,
          role,
        };

        if (data.session?.access_token) {
          await persistSession(data.session, authUser);
          dispatch({
            type: "LOGIN_SUCCESS",
            payload: {
              user: authUser,
              accessToken: data.session.access_token,
            },
          });
        } else {
          await setStoredUserJson(JSON.stringify(authUser));
          dispatch({ type: "SET_LOADING", payload: false });
        }
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "Registration failed. Please try again.";
        dispatch({ type: "SET_ERROR", payload: msg });
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [],
  );

  const clearError = useCallback(() => {
    dispatch({ type: "SET_ERROR", payload: null });
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    register,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
