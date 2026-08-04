import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  "https://nqwxefkhidmreilwirro.supabase.co";

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_fkKZZ1mwk4qbr9puiyaMWw_0Mbh9mla";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
