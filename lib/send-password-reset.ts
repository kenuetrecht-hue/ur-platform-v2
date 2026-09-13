import { getSupabaseClientAsync } from "@/lib/supabase";
import { passwordResetRedirectUrl } from "@/lib/supabase-password-signin";

/** Emails a link so the person can set a new password. Does not say whether the email exists. */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const trimmed = email.trim();
  if (!trimmed) {
    throw new Error("Type your email, then tap Send a new password.");
  }
  const supabase = await getSupabaseClientAsync();
  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: passwordResetRedirectUrl(),
  });
  if (error) {
    throw error;
  }
}
