import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";
import { sanitizeUserText } from "./input-sanitize";
import { InternalServiceError } from "./service-errors";
import { resolveSupabasePublicConfig } from "../../shared/supabase-config";
import { passwordResetRedirectUrl } from "../../lib/password-recovery-url";
import { clearAgeKycRecordsForEmail } from "./age-kyc-service";
import {
  describeOwnerSigninReset,
  isOwnerSigninResetConfirmed,
  OWNER_SIGNIN_RESET_CONFIRM,
  type OwnerSigninResetAction,
} from "../../lib/owner-signin-reset";

function normalizeEmail(email: string): string {
  return sanitizeUserText(email, 254).toLowerCase();
}

function getSupabaseAdminClient(): SupabaseClient {
  const { url } = resolveSupabasePublicConfig();
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !service || service.includes("your-supabase")) {
    throw new InternalServiceError("NOT_CONFIGURED");
  }
  return createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function findSupabaseAuthUserByEmail(
  email: string,
  client: SupabaseClient = getSupabaseAdminClient(),
): Promise<User | null> {
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) return null;

  const perPage = 200;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new InternalServiceError("UPSTREAM_FAILED");
    }
    const match = (data.users ?? []).find(
      (user) => (user.email ?? "").toLowerCase().trim() === normalized,
    );
    if (match) return match;
    if ((data.users ?? []).length < perPage) break;
  }
  return null;
}

export async function ownerResetMemberSignIn(params: {
  email: string;
  action: OwnerSigninResetAction;
  confirmPhrase: string;
}): Promise<{ found: boolean; message: string }> {
  if (!isOwnerSigninResetConfirmed(params.confirmPhrase)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Type ${OWNER_SIGNIN_RESET_CONFIRM} to confirm. Nothing is changed until you do.`,
    });
  }

  const email = normalizeEmail(params.email);
  if (!email.includes("@")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Type a real email." });
  }

  const client = getSupabaseAdminClient();
  const existing = await findSupabaseAuthUserByEmail(email, client);

  if (params.action === "send_new_password") {
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: passwordResetRedirectUrl(),
    });
    if (error) {
      throw new InternalServiceError("UPSTREAM_FAILED");
    }
    return {
      found: Boolean(existing),
      message: describeOwnerSigninReset("send_new_password", Boolean(existing)),
    };
  }

  await clearAgeKycRecordsForEmail(email);

  if (!existing) {
    return { found: false, message: describeOwnerSigninReset("clear_so_they_can_signup", false) };
  }

  const { error } = await client.auth.admin.deleteUser(existing.id);
  if (error) {
    throw new InternalServiceError("UPSTREAM_FAILED");
  }

  return { found: true, message: describeOwnerSigninReset("clear_so_they_can_signup", true) };
}
