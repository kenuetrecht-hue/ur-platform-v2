import { useEffect, useState } from "react";
import { useAuth } from "./use-auth";
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
 * Hook to handle daily sign-in loyalty points award
 * Automatically triggers on first app load each day
 * Returns loyalty points state and ticket info
 */
export function useDailySignIn() {
  const { user, isAuthenticated } = useAuth();
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

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    const awardDailyPoints = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        // Call backend to award daily sign-in points
        const result = await (trpc.loyalty.awardDailySignIn as any)({
          userId: user.id,
        });

        setState((prev) => ({
          ...prev,
          loading: false,
          pointsAwarded: result.pointsAwarded,
          ticketId: result.ticketId,
          alreadyEarnedToday: result.alreadyEarnedToday,
          totalPoints: result.totalPoints,
          totalSignIns: result.totalSignIns,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to award points",
        }));
      }
    };

    awardDailyPoints();
  }, [isAuthenticated, user]);

  const { ticketState, revealLoading, claimLoading, revealTicket, claimPrize } = useScratchOffTicket(state.ticketId);

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
      const result = await (trpc.loyalty.revealTicket as any)({ ticketId });
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
      await (trpc.loyalty.claimPrize as any)({ ticketId });
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
  const { user, isAuthenticated } = useAuth();
  const [summary, setSummary] = useState({
    totalPoints: 0,
    totalSignIns: 0,
    totalPointsEarned: 0,
    loading: true,
  });

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setSummary((prev) => ({ ...prev, loading: false }));
      return;
    }

    const fetchSummary = async () => {
      try {
        const result = await (trpc.loyalty.getSummary as any)({ userId: user.id });
        setSummary({
          totalPoints: result.totalPoints,
          totalSignIns: result.totalSignIns,
          totalPointsEarned: result.totalPointsEarned,
          loading: false,
        });
      } catch (error) {
        console.error("Failed to fetch loyalty summary:", error);
        setSummary((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchSummary();
  }, [isAuthenticated, user]);

  return summary;
}
