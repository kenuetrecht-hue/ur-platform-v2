import { createClient } from "@supabase/supabase-js";
import { resolveSupabasePublicConfig } from "../shared/supabase-config";

const { url: supabaseUrl, anonKey: supabaseAnonKey } = resolveSupabasePublicConfig();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
