/**
 * Wipe one email so they can Sign up and take ID pictures again.
 * Never prints keys or passwords.
 *
 *   pnpm exec tsx scripts/scrap-member-start-over.ts you@email.com
 */
import "./load-env.js";
import { ownerResetMemberSignIn } from "../server/_core/owner-signin-reset-service";

const email = process.argv[2]?.trim() ?? "";
if (!email || !email.includes("@")) {
  console.error("Type the email to scrap. Example: pnpm exec tsx scripts/scrap-member-start-over.ts you@email.com");
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
  .catch(() => {
    console.error(
      "Could not scrap that email from here. In supabase.com → Authentication → Users, delete the email. ID hashes clear on the next owner RESET after this code is live.",
    );
    process.exit(1);
  });
