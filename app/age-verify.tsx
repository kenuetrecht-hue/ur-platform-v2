import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import { AFTER_ID_PASS_HREF, JOIN_ACCOUNT_HREF, RETURNING_LOGIN_HREF } from "@/lib/after-sign-in";
import { UrBootShell } from "@/components/ur-boot-shell";

/** Leftover address. Login if signed out. Sign up if they still need pictures. */
export default function AgeVerifyScreen() {
  const { isAuthenticated, isLoading } = useAuth();
  const statusQuery = trpc.ageKyc.getStatus.useQuery(undefined, {
    retry: 2,
    enabled: isAuthenticated,
  });
  const verified = statusQuery.data?.verified === true;

  if (isLoading && !isAuthenticated) {
    return <UrBootShell label="Opening UR…" />;
  }

  if (!isAuthenticated) {
    return <Redirect href={RETURNING_LOGIN_HREF} />;
  }

  if (statusQuery.isLoading) {
    return <UrBootShell label="Checking your pictures…" />;
  }

  if (verified) {
    return <Redirect href={AFTER_ID_PASS_HREF} />;
  }

  return <Redirect href={JOIN_ACCOUNT_HREF} />;
}
