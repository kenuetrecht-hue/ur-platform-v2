import { getAccessToken, setAccessToken, setRefreshToken } from "./auth-storage";
import { getSupabaseClientAsync } from "./supabase";

/** Copy a fresh sign-in into the token the chat request sends. */
export async function refreshChatAccessToken(): Promise<boolean> {
  try {
    const supabase = await getSupabaseClientAsync();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      await setAccessToken(token);
      if (data.session?.refresh_token) {
        await setRefreshToken(data.session.refresh_token);
      }
      return true;
    }
  } catch {
    /* The stored token is still worth trying. */
  }
  return Boolean(await getAccessToken());
}
