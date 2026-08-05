import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://nqwxefkhidmreilwirro.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "sb_publishable_fkKZZ1mwk4qbr9puiyaMWw_0Mbh9mla";

function resolveSupabaseConfig(): { url: string; anonKey: string } {
  const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

  const looksPlaceholder =
    !url ||
    !anonKey ||
    url.includes("placeholder") ||
    url.includes("your-project") ||
    anonKey.includes("your-supabase") ||
    anonKey === "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";

  if (looksPlaceholder) {
    return { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
  }

  return { url, anonKey };
}

const { url: supabaseUrl, anonKey: supabaseAnonKey } = resolveSupabaseConfig();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
