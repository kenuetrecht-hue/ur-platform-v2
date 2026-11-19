import { Redirect } from "expo-router";
import { JOIN_ACCOUNT_HREF } from "@/lib/after-sign-in";

/** Old selfie address. Joining does not use a camera. */
export default function SignupSelfieScreen() {
  return <Redirect href={JOIN_ACCOUNT_HREF} />;
}
