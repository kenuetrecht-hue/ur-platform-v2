import React, {
  createContext,
  useReducer,
  useCallback,
  useEffect,
  useContext,
} from "react";
import type { Session, User as SupabaseUser, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClientAsync } from "./supabase";
import { explainAuthFailure } from "./auth-network-error";
import { isAlreadyRegisteredAuthError } from "./auth-already-registered";
import { signInWithPasswordRetryingCaptcha } from "./supabase-password-signin";
import { rememberSignedInApiDevice } from "./known-api-device";
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  setStoredUserJson,
} from "./auth-storage";

export type UserRole = "creator" | "worker" | "admin" | "3d-user" | "affiliate";

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
  login: (email: string, password: string, captchaToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    captchaToken?: string,
  ) => Promise<{ needsEmailConfirmation: boolean }>;
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
  const email = user.email || "";
  const metaRole = user.user_metadata?.role as UserRole | undefined;
  const role: UserRole =
    metaRole === "creator" ||
    metaRole === "worker" ||
    metaRole === "admin" ||
    metaRole === "3d-user" ||
    metaRole === "affiliate"
      ? metaRole
      : "creator";
  return {
    id: user.id,
    email,
    name: user.user_metadata?.name || email.split("@")[0] || "User",
    role,
    avatar: user.user_metadata?.avatar,
  };
}

async function persistSession(session: Session, user: AuthUser): Promise<void> {
  await setAccessToken(session.access_token);
  if (session.refresh_token) {
    await setRefreshToken(session.refresh_token);
  }
  await setStoredUserJson(JSON.stringify(user));
  rememberSignedInApiDevice();
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

const AUTH_SESSION_TIMEOUT_MS = 5_000;

async function persistSessionSafe(session: Session, user: AuthUser): Promise<void> {
  try {
    await withTimeout(persistSession(session, user), 3_000, "Auth storage persist");
  } catch (error) {
    console.warn("[Auth] Could not persist session locally:", error);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    let mounted = true;

    const finishLoading = () => {
      if (mounted) {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };

    const hardCap = setTimeout(finishLoading, AUTH_SESSION_TIMEOUT_MS + 500);

    const restoreSession = async () => {
      try {
        const supabase: SupabaseClient = await getSupabaseClientAsync();
        const {
          data: { session },
        } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_SESSION_TIMEOUT_MS,
          "Supabase session restore",
        );

        if (session?.user && session.access_token) {
          const authUser = mapSupabaseUser(session.user);
          await persistSessionSafe(session, authUser);
          if (mounted) {
            dispatch({
              type: "LOGIN_SUCCESS",
              payload: { user: authUser, accessToken: session.access_token },
            });
          }
          return;
        }

        const storedAccess = await withTimeout(getAccessToken(), 2_000, "Cached token read").catch(
          () => null,
        );
        const storedRefresh = await withTimeout(getRefreshToken(), 2_000, "Cached refresh read").catch(
          () => null,
        );
        if (storedAccess && storedRefresh) {
          const restored = await withTimeout(
            supabase.auth.setSession({
              access_token: storedAccess,
              refresh_token: storedRefresh,
            }),
            AUTH_SESSION_TIMEOUT_MS,
            "Supabase session resume",
          );
          const resumed = restored.data.session;
          if (resumed?.user && resumed.access_token && mounted) {
            const authUser = mapSupabaseUser(resumed.user);
            await persistSessionSafe(resumed, authUser);
            dispatch({
              type: "LOGIN_SUCCESS",
              payload: { user: authUser, accessToken: resumed.access_token },
            });
            return;
          }
        }

        if (storedAccess || storedRefresh) {
          await clearAuthStorage();
        }
      } catch (error) {
        console.error("[Auth] Session restore failed:", error);
      } finally {
        clearTimeout(hardCap);
        finishLoading();
      }
    };

    void restoreSession();

    let subscription: { unsubscribe: () => void } | null = null;

    void getSupabaseClientAsync().then((supabase) => {
      if (!mounted) return;

      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        if (event === "SIGNED_IN" && session?.user && session.access_token) {
          const authUser = mapSupabaseUser(session.user);
          await persistSessionSafe(session, authUser);
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
            await persistSessionSafe(session, authUser);
            dispatch({
              type: "LOGIN_SUCCESS",
              payload: { user: authUser, accessToken: session.access_token },
            });
          }
        }
      });

      subscription = authSubscription;
    });

    return () => {
      mounted = false;
      clearTimeout(hardCap);
      subscription?.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string, captchaToken?: string) => {
    dispatch({ type: "SET_ERROR", payload: null });

    try {
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      const supabase = await getSupabaseClientAsync();
      const { data, error } = await signInWithPasswordRetryingCaptcha(
        supabase,
        email,
        password,
        captchaToken,
        withTimeout,
      );

      if (error) {
        throw new Error(explainAuthFailure(error));
      }

      if (!data.user) {
        throw new Error("Login failed: No user returned");
      }

      if (!data.session) {
        if (!data.user.email_confirmed_at) {
          throw new Error(
            "Please confirm your email before signing in. Check your inbox for the Supabase confirmation link.",
          );
        }
        throw new Error("Login failed: No session returned. Please try again.");
      }

      const authUser = mapSupabaseUser(data.user);
      await persistSessionSafe(data.session, authUser);
      dispatch({
        type: "LOGIN_SUCCESS",
        payload: { user: authUser, accessToken: data.session.access_token },
      });
    } catch (error) {
      const msg = explainAuthFailure(error);
      dispatch({ type: "SET_ERROR", payload: msg });
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const supabase = await getSupabaseClientAsync();
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
      captchaToken?: string,
    ) => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        if (!email || !password || !name) {
          throw new Error("Email, password, and name are required");
        }

        const supabase = await getSupabaseClientAsync();
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: { name, role },
            ...(captchaToken ? { captchaToken } : {}),
          },
        });

        if (error) {
          if (isAlreadyRegisteredAuthError(error)) {
            const existing = await signInWithPasswordRetryingCaptcha(
              supabase,
              email,
              password,
              captchaToken,
              withTimeout,
            );
            if (existing.error) {
              throw new Error(explainAuthFailure(existing.error));
            }
            if (!existing.data.session?.access_token || !existing.data.user) {
              throw new Error(
                "That email is already on UR. Type the same password you used before. We will log you in.",
              );
            }
            const existingUser = mapSupabaseUser(existing.data.user);
            await persistSession(existing.data.session, existingUser);
            dispatch({
              type: "LOGIN_SUCCESS",
              payload: {
                user: existingUser,
                accessToken: existing.data.session.access_token,
              },
            });
            return { needsEmailConfirmation: false };
          }
          throw new Error(explainAuthFailure(error));
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
          return { needsEmailConfirmation: false };
        }

        await setStoredUserJson(JSON.stringify(authUser));
        dispatch({ type: "SET_LOADING", payload: false });
        return { needsEmailConfirmation: true };
      } catch (error) {
        const msg = explainAuthFailure(error);
        dispatch({ type: "SET_ERROR", payload: msg });
        throw new Error(msg);
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
