import { ReturningAccountLogin } from "@/components/returning-account-login";

/** Email and password on the homepage so a saved browser login has a place to land. */
export function HomepageSignIn() {
  return <ReturningAccountLogin variant="homepage" />;
}
