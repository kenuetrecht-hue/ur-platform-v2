import type { SupabaseClient } from "@supabase/supabase-js";
import { isAlreadyRegisteredAuthError } from "@/lib/auth-already-registered";

export type PersistJoinPasswordResult =
  | { status: "ready" }
  | { status: "needs_confirm" }
  | { status: "wrong_password" };

function sameEmail(left: string | null | undefined, right: string): boolean {
  return (left ?? "").trim().toLowerCase() === right.trim().toLowerCase();
}

/**
 * Write the Sign up email + password onto the sign-in service.
 * Do not skip this just because a leftover session is still open.
 * Never send a Turnstile token to Supabase.
 */
export async function persistJoinPassword(params: {
  supabase: SupabaseClient;
  email: string;
  password: string;
  name: string;
}): Promise<PersistJoinPasswordResult> {
  const email = params.email.trim();
  const password = params.password.trim();
  const name = params.name.trim();
  if (!email || !password || !name) {
    throw new Error("Type your name, email, and password on Sign up.");
  }

  const { data: current } = await params.supabase.auth.getUser();
  if (current.user && sameEmail(current.user.email, email)) {
    const { error } = await params.supabase.auth.updateUser({
      password,
      data: { name },
    });
    if (!error) return { status: "ready" };
    /* Stale or deleted leftover session — create the account instead of skipping. */
    await params.supabase.auth.signOut();
  } else if (current.user) {
    await params.supabase.auth.signOut();
  }

  const { data, error } = await params.supabase.auth.signUp({
    email,
    password,
    options: { data: { name, role: "creator" } },
  });
  if (!error && data.session) return { status: "ready" };
  if (!error && data.user && !data.session) return { status: "needs_confirm" };

  if (error && !isAlreadyRegisteredAuthError(error)) {
    throw error;
  }

  const existing = await params.supabase.auth.signInWithPassword({ email, password });
  if (existing.error || !existing.data.session) {
    return { status: "wrong_password" };
  }
  return { status: "ready" };
}
