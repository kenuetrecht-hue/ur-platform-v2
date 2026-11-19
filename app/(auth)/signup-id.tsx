import { Redirect } from "expo-router";
import { JOIN_ACCOUNT_HREF } from "@/lib/after-sign-in";

/** Old ID-photo address. Joining does not use a camera. */
export default function SignupIdScreen() {
  return <Redirect href={JOIN_ACCOUNT_HREF} />;
}
