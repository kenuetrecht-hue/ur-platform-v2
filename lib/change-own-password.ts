import { getSupabaseClientAsync } from "@/lib/supabase";
import { passwordsMatch } from "@/lib/join-account-draft";
import {
  PASSWORD_CHANGED_AT_KEY,
  PASSWORD_REMIND_DAYS_KEY,
  type PasswordRemindDays,
} from "@/lib/password-hygiene";

export async function changeOwnPassword(params: {
  currentPassword: string;
  nextPassword: string;
  confirmPassword: string;
  remindDays: PasswordRemindDays;
}): Promise<void> {
  if (!passwordsMatch(params.nextPassword, params.confirmPassword)) {
    throw new Error("Type the new password twice. Both lines must match and have at least 6 characters.");
  }
  if (params.currentPassword.trim() === params.nextPassword.trim()) {
    throw new Error("Pick a new password. It must be different from the one you use now.");
  }

  const supabase = await getSupabaseClientAsync();
  const { data: sessionData } = await supabase.auth.getUser();
  const email = sessionData.user?.email?.trim();
  if (!email) {
    throw new Error("Login first, then change your password in Settings.");
  }

  const { error: currentError } = await supabase.auth.signInWithPassword({
    email,
    password: params.currentPassword.trim(),
  });
  if (currentError) {
    throw new Error("That is not your current password.");
  }

  const nextMeta = {
    ...(sessionData.user?.user_metadata ?? {}),
    [PASSWORD_CHANGED_AT_KEY]: new Date().toISOString(),
    [PASSWORD_REMIND_DAYS_KEY]: params.remindDays,
  };
  const { error } = await supabase.auth.updateUser({
    password: params.nextPassword.trim(),
    data: nextMeta,
  });
  if (error) throw error;
}

export async function savePasswordRemindDays(remindDays: PasswordRemindDays): Promise<void> {
  const supabase = await getSupabaseClientAsync();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    throw new Error("Login first, then choose a reminder in Settings.");
  }
  const { error } = await supabase.auth.updateUser({
    data: {
      ...(data.user.user_metadata ?? {}),
      [PASSWORD_REMIND_DAYS_KEY]: remindDays,
      [PASSWORD_CHANGED_AT_KEY]:
        data.user.user_metadata?.[PASSWORD_CHANGED_AT_KEY] ?? new Date().toISOString(),
    },
  });
  if (error) throw error;
}
