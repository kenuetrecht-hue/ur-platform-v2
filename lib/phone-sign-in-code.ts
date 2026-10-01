import type { SupabaseClient } from "@supabase/supabase-js";

/** US 10-digit numbers become +1. A number that already starts with + is kept. */
export function toE164Phone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  throw new Error("Type a mobile number, like 317-555-0100.");
}

export function isSmsSignInCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

export async function sendPhoneSignInCode(supabase: SupabaseClient, phone: string): Promise<string> {
  const e164 = toE164Phone(phone);
  const { error } = await supabase.auth.signInWithOtp({
    phone: e164,
    options: { channel: "sms" },
  });
  if (error) throw error;
  return e164;
}

export async function verifyPhoneSignInCode(supabase: SupabaseClient, phone: string, code: string) {
  if (!isSmsSignInCode(code)) {
    throw new Error("Type the 6-digit code from the text message.");
  }
  const e164 = toE164Phone(phone);
  const { data, error } = await supabase.auth.verifyOtp({
    phone: e164,
    token: code.trim(),
    type: "sms",
  });
  if (error) throw error;
  if (!data.session?.access_token || !data.user) {
    throw new Error("That code did not sign you in. Text a new code and try again.");
  }
  return data;
}
