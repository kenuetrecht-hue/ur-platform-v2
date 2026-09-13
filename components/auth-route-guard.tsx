import { useAuth } from "@/lib/auth-context";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { UrBootShell } from "@/components/ur-boot-shell";
import { ConductAgreementGate } from "@/components/conduct-agreement-gate";
import { SecurityIncidentGate } from "@/components/security-incident-gate";
import { WorldReviewHoldGate } from "@/components/world-review-hold-gate";
import { shouldGiveJoinEmanual } from "@/lib/join-emanual-handoff";
import { isPublicLegalRoute } from "@/lib/public-legal-routes";
import {
  AFTER_ID_PASS_HREF,
  AFTER_SIGN_IN_HREF,
  JOIN_ACCOUNT_HREF,
  hrefForSignedOutUser,
  shouldEnterAppFromAgeVerify,
  shouldKeepCredentialFormVisible,
  shouldOpenAgeVerifyPage,
  shouldSendSignedOutUserToLoginFromAgeVerify,
} from "@/lib/after-sign-in";
import { hasAgeKycPassToken } from "@/lib/age-kyc-pass-store";

function isAuthRoute(segments: string[]): boolean {
  const root = segments[0];
  return root === "(auth)" || root === "login" || root === "signup" || root === "signin";
}

function isPublicMarketing(segments: string[]): boolean {
  const root = segments[0];
  return root === "welcome" || root === "handoff" || root === "link" || root === undefined;
}

function isDownloadRoute(segments: string[]): boolean {
  return segments[0] === "download";
}

function isEmanualRoute(segments: string[]): boolean {
  return segments[0] === "e-manual";
}

function isAgeVerifyRoute(segments: string[]): boolean {
  return segments[0] === "age-verify";
}

function isPublicRoute(segments: string[]): boolean {
  return (
    isAuthRoute(segments) ||
    isPublicMarketing(segments) ||
    isAgeVerifyRoute(segments) ||
    isDownloadRoute(segments) ||
    isEmanualRoute(segments) ||
    isPublicLegalRoute(segments)
  );
}

/**
 * Redirects users based on auth + 18+ KYC:
 * - Unauthenticated users cannot access the product
 * - Authenticated users cannot enter until ID front/back + selfie pass
 */
export function AuthRouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { canAccessAdminDashboard } = usePlatformOwner();
  const segments = useSegments();
  const router = useRouter();
  const [clientReady, setClientReady] = useState(false);

  const kycQuery = trpc.ageKyc.getStatus.useQuery(undefined, {
    enabled: clientReady && isAuthenticated,
    retry: 1,
    staleTime: 45_000,
  });
  const conductQuery = trpc.conduct.status.useQuery(undefined, {
    enabled: clientReady && isAuthenticated,
    retry: 1,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const securityQuery = trpc.conduct.securityNotice.useQuery(undefined, {
    enabled: clientReady && isAuthenticated,
    retry: 1,
    staleTime: 30_000,
    refetchInterval: 45_000,
  });

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady || (isLoading && !isAuthenticated)) return;

    const inAuthRoute = isAuthRoute(segments);
    const inPublicMarketing = isPublicMarketing(segments);
    const inDownload = isDownloadRoute(segments);
    const inAgeVerify = isAgeVerifyRoute(segments);
    const inProtectedRoute =
      segments[0] === "(tabs)" ||
      segments[0] === "profile" ||
      segments[0] === "jobsite" ||
      segments[0] === "owner-ops" ||
      segments[0] === "3d-workspace" ||
      segments[0] === "playroom" ||
      segments[0] === "world";

    if (
      !isAuthenticated &&
      (inProtectedRoute || (inAgeVerify && shouldSendSignedOutUserToLoginFromAgeVerify()))
    ) {
      router.replace(hrefForSignedOutUser());
      return;
    }

    const kycVerified = kycQuery.data?.verified === true;
    const hasPhotoPass = hasAgeKycPassToken();

    if (isAuthenticated && inAuthRoute) {
      const onJoinPictures = segments.join("/").includes("signup");
      if (onJoinPictures && shouldKeepCredentialFormVisible({ hasPhotoPass, kycVerified })) {
        return;
      }
      if (kycQuery.isLoading) {
        return;
      }
      if (kycVerified !== true) {
        if (!onJoinPictures) {
          router.replace(JOIN_ACCOUNT_HREF);
        }
        return;
      }
      router.replace(AFTER_ID_PASS_HREF);
      return;
    }

    if (
      !kycQuery.isLoading &&
      shouldOpenAgeVerifyPage({ isAuthenticated, kycVerified, hasPhotoPass }) &&
      !inAgeVerify &&
      !inDownload &&
      !inAuthRoute
    ) {
      router.replace(AFTER_SIGN_IN_HREF);
      return;
    }

    if (shouldEnterAppFromAgeVerify({ isAuthenticated, kycVerified }) && inAgeVerify) {
      router.replace(AFTER_ID_PASS_HREF);
      return;
    }

    if (isAuthenticated && kycVerified && shouldGiveJoinEmanual() && !isEmanualRoute(segments)) {
      router.replace("/e-manual?joined=1");
      return;
    }

    if (
      isAuthenticated &&
      kycVerified &&
      inPublicMarketing &&
      !inDownload &&
      !isEmanualRoute(segments)
    ) {
      router.replace(canAccessAdminDashboard ? "/(tabs)/admin" : "/(tabs)");
    }
  }, [
    clientReady,
    isAuthenticated,
    isLoading,
    segments,
    router,
    kycQuery.data?.verified,
    kycQuery.isLoading,
    canAccessAdminDashboard,
  ]);

  if (clientReady && isLoading && !isPublicRoute(segments)) {
    return <UrBootShell label="Checking your sign-in…" />;
  }

  if (
    clientReady &&
    isAuthenticated &&
    kycQuery.isLoading &&
    !isAgeVerifyRoute(segments) &&
    !isAuthRoute(segments) &&
    !isDownloadRoute(segments) &&
    !isPublicLegalRoute(segments)
  ) {
    return <UrBootShell label="Checking your pictures…" />;
  }

  const kycVerified = kycQuery.data?.verified === true;
  if (
    isAuthenticated &&
    !kycQuery.isLoading &&
    kycVerified !== true &&
    !isAgeVerifyRoute(segments) &&
    !isAuthRoute(segments) &&
    !isDownloadRoute(segments) &&
    !isPublicLegalRoute(segments) &&
    !isPublicMarketing(segments) &&
    !isEmanualRoute(segments)
  ) {
    return <UrBootShell label="Checking your pictures…" />;
  }

  const inProduct =
    isAuthenticated &&
    kycVerified &&
    !isAgeVerifyRoute(segments) &&
    !isAuthRoute(segments) &&
    !isPublicLegalRoute(segments);

  if (inProduct && conductQuery.isLoading) {
    return <UrBootShell label="Opening UR…" />;
  }

  if (inProduct && conductQuery.data?.required === true && conductQuery.data?.accepted === false) {
    return <ConductAgreementGate />;
  }

  if (inProduct && securityQuery.data?.required === true) {
    return <SecurityIncidentGate />;
  }

  if (inProduct && conductQuery.data?.reviewHold) {
    return (
      <WorldReviewHoldGate
        status={conductQuery.data.reviewHold.status}
        memberWarning={conductQuery.data.reviewHold.memberWarning}
      />
    );
  }

  return <>{children}</>;
}
