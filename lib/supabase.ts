import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveSupabasePublicConfig } from "../shared/supabase-config";
import {
  createSupabaseAuthStorage,
  isNoopSupabaseAuthStorage,
  isWebBrowserStorageAvailable,
} from "./supabase-auth-storage";

const { url: supabaseUrl, anonKey: supabaseAnonKey } = resolveSupabasePublicConfig();

let supabaseClient: SupabaseClient | null = null;
let clientUsesNoopStorage = true;

function buildSupabaseClient(): SupabaseClient {
  const storage = createSupabaseAuthStorage();
  const usingNoop = isNoopSupabaseAuthStorage(storage);

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage,
      autoRefreshToken: !usingNoop,
      persistSession: !usingNoop,
      detectSessionInUrl: isWebBrowserStorageAvailable(),
    },
  });

  clientUsesNoopStorage = usingNoop;
  return client;
}

/** Lazily create Supabase client; recreate when storage class changes (SSR noop → browser). */
export function getSupabase(): SupabaseClient {
  const usingNoop = isNoopSupabaseAuthStorage(createSupabaseAuthStorage());

  if (!supabaseClient || clientUsesNoopStorage !== usingNoop) {
    supabaseClient = buildSupabaseClient();
  }

  return supabaseClient;
}

/** Only call from client effects/handlers — never during SSR render. */
export function getSupabaseClientAsync(): Promise<SupabaseClient> {
  return Promise.resolve(getSupabase());
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabase();
    const value = Reflect.get(client as object, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
