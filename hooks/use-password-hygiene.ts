import { useEffect, useState } from "react";
import { getSupabaseClientAsync } from "@/lib/supabase";
import {
  isPasswordChangeDue,
  normalizePasswordRemindDays,
  PASSWORD_CHANGED_AT_KEY,
  PASSWORD_REMIND_DAYS_KEY,
  type PasswordRemindDays,
} from "@/lib/password-hygiene";

export function usePasswordHygiene() {
  const [remindDays, setRemindDays] = useState<PasswordRemindDays>(0);
  const [changedAt, setChangedAt] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = await getSupabaseClientAsync();
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        const meta = data.user?.user_metadata ?? {};
        setRemindDays(normalizePasswordRemindDays(meta[PASSWORD_REMIND_DAYS_KEY]));
        const raw = meta[PASSWORD_CHANGED_AT_KEY];
        setChangedAt(typeof raw === "string" ? raw : null);
      } catch {
        if (!cancelled) {
          setRemindDays(0);
          setChangedAt(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ready,
    remindDays,
    changedAt,
    due: isPasswordChangeDue({ changedAt, remindDays }),
  };
}
