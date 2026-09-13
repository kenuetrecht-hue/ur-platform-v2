/**
 * Owner emergency: clear one email on the sign-in service so they can Sign up again.
 * Never prints keys or passwords.
 *
 *   pnpm exec tsx scripts/hard-reset-signin.ts you@email.com
 */
import "./load-env.js";
import { ownerResetMemberSignIn } from "../server/_core/owner-signin-reset-service";

const email = process.argv[2]?.trim() ?? "";
if (!email || !email.includes("@")) {
  console.error("Type the email to clear. Example: pnpm exec tsx scripts/hard-reset-signin.ts you@email.com");
  process.exit(1);
}

ownerResetMemberSignIn({
  email,
  action: "clear_so_they_can_signup",
  confirmPhrase: "RESET",
})
  .then((result) => {
    console.log(result.message);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Could not clear sign-in.";
    if (/NOT_CONFIGURED|not available/i.test(message)) {
      console.error(
        "The sign-in admin key is not on this computer. In supabase.com → Authentication → Users, delete that email, then Sign up again on the Railway Login.",
      );
      process.exit(1);
    }
    console.error("Could not clear sign-in. Try Authentication → Users in supabase.com and delete that email.");
    process.exit(1);
  });
