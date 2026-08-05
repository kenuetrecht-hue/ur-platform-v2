import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

export interface DailySignInState {
  loading: boolean;
  pointsAwardedToday: number;
  welcomeBonusAwarded: number;
  alreadyClaimedToday: boolean;
  totalPoints: number;
  totalSignIns: number;
  currentStreakDays: number;
  longestStreakDays: number;
  milestoneUnlocked: { day: number; freeTextMessages: number; label: string } | null;
  nextMilestone: { day: number; freeTextMessages: number; label: string } | null;
  error: string | null;
}

/**
 * Claims daily sign-in loyalty points + streak on authenticated home visit.
 */
export function useDailySignIn() {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<DailySignInState>({
    loading: true,
    pointsAwardedToday: 0,
    welcomeBonusAwarded: 0,
    alreadyClaimedToday: false,
    totalPoints: 0,
    totalSignIns: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
    milestoneUnlocked: null,
    nextMilestone: null,
    error: null,
  });

  const claimMutation = trpc.loyalty.claimDailySignIn.useMutation();

  useEffect(() => {
    if (!isAuthenticated) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    claimMutation.mutate(undefined, {
      onSuccess: (result) => {
        setState({
          loading: false,
          pointsAwardedToday: result.pointsAwardedToday,
          welcomeBonusAwarded: result.welcomeBonusAwarded,
          alreadyClaimedToday: result.alreadyClaimedToday,
          totalPoints: result.totalPoints,
          totalSignIns: result.totalSignIns,
          currentStreakDays: result.currentStreakDays,
          longestStreakDays: result.longestStreakDays,
          milestoneUnlocked: result.milestoneUnlocked,
          nextMilestone: result.nextMilestone,
          error: null,
        });
      },
      onError: (error) => {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error.message || "Failed to claim daily reward",
        }));
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return state;
}

export function useLoyaltyPointsSummary() {
  const { isAuthenticated } = useAuth();
  const statusQuery = trpc.loyalty.getStatus.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  return {
    totalPoints: statusQuery.data?.totalPoints ?? 0,
    totalSignIns: statusQuery.data?.totalSignIns ?? 0,
    totalPointsEarned: statusQuery.data?.totalPointsEarned ?? 0,
    currentStreakDays: statusQuery.data?.currentStreakDays ?? 0,
    pointsPerTextMessage: statusQuery.data?.pointsPerTextMessage ?? 500,
    loading: statusQuery.isLoading,
  };
}
