import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AFTER_SIGN_IN_HREF } from "@/lib/after-sign-in";
import { UrBootShell } from "@/components/ur-boot-shell";

/** Website and app entry: signed-in people go to the ID photo page first. */
export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  if (!clientReady || isLoading) {
    return <UrBootShell label="Opening UR…" />;
  }

  if (isAuthenticated) {
    return <Redirect href={AFTER_SIGN_IN_HREF} />;
  }

  return <Redirect href="/welcome" />;
}
