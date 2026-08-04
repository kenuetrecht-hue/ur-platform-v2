import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

export interface DailySignInState {
  loading: boolean;
  pointsAwarded: number;
  ticketId: number | null;
  alreadyEarnedToday: boolean;
  totalPoints: number;
  totalSignIns: number;
  error: string | null;
  revealTicket?: () => Promise<void>;
  claimTicket?: () => Promise<void>;
  showModal?: boolean;
  setShowModal?: (show: boolean) => void;
}

/**
 * Hook to handle daily sign-in loyalty points award.
 * Uses the authenticated server user from the Supabase bearer token.
 */
export function useDailySignIn() {
  const { isAuthenticated } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [state, setState] = useState<DailySignInState>({
    loading: true,
    pointsAwarded: 0,
    ticketId: null,
    alreadyEarnedToday: false,
    totalPoints: 0,
    totalSignIns: 0,
    error: null,
    showModal,
    setShowModal,
  });

  const awardMutation = trpc.loyalty.awardDailySignIn.useMutation();

  useEffect(() => {
    if (!isAuthenticated) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    awardMutation.mutate(undefined, {
      onSuccess: (result) => {
        setState((prev) => ({
          ...prev,
          loading: false,
          pointsAwarded: result.pointsAwarded,
          ticketId: result.ticketId,
          alreadyEarnedToday: result.alreadyEarnedToday,
          totalPoints: result.totalPoints,
          totalSignIns: result.totalSignIns,
          error: null,
        }));
      },
      onError: (error) => {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error.message || "Failed to award points",
        }));
      },
    });
    // Only run when auth state becomes true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const { ticketState, revealLoading, claimLoading, revealTicket, claimPrize } =
    useScratchOffTicket(state.ticketId);

  return {
    ...state,
    revealTicket,
    claimTicket: claimPrize,
    showModal,
    setShowModal,
    ticketState,
  };
}

/**
 * Hook to handle scratch-off ticket reveal and claim
 */
export function useScratchOffTicket(ticketId: number | null) {
  const revealMutation = trpc.loyalty.revealTicket.useMutation();
  const claimMutation = trpc.loyalty.claimPrize.useMutation();
  const [revealLoading, setRevealLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [ticketState, setTicketState] = useState<{
    status: "unrevealed" | "revealed" | "claimed";
    prizeType?: "loyalty_points" | "drawing_entry";
    prizeValue?: number;
  }>({
    status: "unrevealed",
  });

  const revealTicket = async () => {
    if (!ticketId) return;

    try {
      setRevealLoading(true);
      const result = await revealMutation.mutateAsync({ ticketId });
      setTicketState({
        status: "revealed",
        prizeType: result.prizeType,
        prizeValue:
          result.prizeType === "loyalty_points"
            ? result.loyaltyPointsReward
            : result.drawingEntryCount,
      });
    } catch (error) {
      console.error("Failed to reveal ticket:", error);
    } finally {
      setRevealLoading(false);
    }
  };

  const claimPrize = async () => {
    if (!ticketId) return;

    try {
      setClaimLoading(true);
      await claimMutation.mutateAsync({ ticketId });
      setTicketState((prev) => ({ ...prev, status: "claimed" }));
    } catch (error) {
      console.error("Failed to claim prize:", error);
    } finally {
      setClaimLoading(false);
    }
  };

  return {
    ticketState,
    revealLoading,
    claimLoading,
    revealTicket,
    claimPrize,
  };
}

/**
 * Hook to get user's loyalty points summary
 */
export function useLoyaltyPointsSummary() {
  const { isAuthenticated } = useAuth();
  const summaryQuery = trpc.loyalty.getSummary.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  return {
    totalPoints: summaryQuery.data?.totalPoints ?? 0,
    totalSignIns: summaryQuery.data?.totalSignIns ?? 0,
    totalPointsEarned: summaryQuery.data?.totalPointsEarned ?? 0,
    loading: summaryQuery.isLoading,
  };
}
