import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import type { PlatformSectionId } from "@/lib/platform-section-flags";

export function usePlatformSection(sectionId: PlatformSectionId) {
  const flags = trpc.platformOps.getPublicSectionFlags.useQuery(undefined, {
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return useMemo(() => {
    const row = flags.data?.sections.find((s) => s.id === sectionId);
    return {
      isLoading: flags.isLoading,
      enabled: row?.enabled ?? true,
      maintenanceMessage: row?.maintenanceMessage ?? "",
    };
  }, [flags.data, flags.isLoading, sectionId]);
}
