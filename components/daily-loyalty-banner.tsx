import { View, Text, Pressable, Alert } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

export interface DailyLoyaltyBannerProps {
  totalPoints?: number;
  pointsEarnedToday?: number;
  totalSignIns?: number;
  hasNewTicket?: boolean;
  onClaimReward?: () => void;
  onViewTicket?: () => void;
}

/**
 * Daily Loyalty Points Banner
 * Shows when user signs in - displays points earned and scratch-off ticket
 */
export function DailyLoyaltyBanner({
  totalPoints = 0,
  pointsEarnedToday = 0,
  totalSignIns = 0,
  hasNewTicket = false,
  onClaimReward,
  onViewTicket,
}: DailyLoyaltyBannerProps) {
  const colors = useColors();

  if (pointsEarnedToday === 0) {
    // Already earned today
    return (
      <View className="bg-blue-50 border-b-2 border-blue-300 px-4 py-3">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-1">
            <Text className="text-sm font-bold text-blue-900">
              ✓ Daily Login Bonus Already Claimed
            </Text>
            <Text className="text-xs text-blue-700 mt-1">
              Come back tomorrow for 200 more loyalty points!
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-green-50 border-b-2 border-green-400 px-4 py-3 gap-3">
      {/* Main reward info */}
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1">
          <Text className="text-sm font-bold text-green-900">
            🎉 +{pointsEarnedToday} Loyalty Points Earned!
          </Text>
          <Text className="text-xs text-green-700 mt-1">
            Total: {totalPoints} points • Sign-ins: {totalSignIns}
          </Text>
        </View>
      </View>

      {/* Scratch-off ticket section */}
      {hasNewTicket && (
        <View className="bg-white rounded-lg border-2 border-dashed border-green-400 p-3 gap-2">
          <Text className="text-xs font-bold text-green-800 text-center">
            🎟️ You Have a New Scratch-Off Ticket!
          </Text>
          <Text className="text-xs text-green-700 text-center">
            Scratch to reveal your prize: Loyalty Points or Weekly Drawing Entry
          </Text>
          {onViewTicket && (
            <Pressable
              onPress={onViewTicket}
              className="bg-green-500 rounded-lg py-2 items-center mt-1"
            >
              <Text className="text-white font-bold text-sm">Scratch Now</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

/**
 * Scratch-Off Ticket Component
 * Interactive scratch-off ticket UI
 */
export interface ScratchOffTicketProps {
  ticketId: number;
  ticketNumber: string;
  status: "unrevealed" | "revealed" | "claimed";
  prizeType?: "loyalty_points" | "drawing_entry";
  loyaltyPointsReward?: number;
  drawingEntryCount?: number;
  onReveal?: () => void;
  onClaim?: () => void;
}

export function ScratchOffTicket({
  ticketId,
  ticketNumber,
  status,
  prizeType,
  loyaltyPointsReward,
  drawingEntryCount,
  onReveal,
  onClaim,
}: ScratchOffTicketProps) {
  const colors = useColors();

  return (
    <View className="bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-2xl border-4 border-yellow-400 p-6 gap-4 items-center shadow-lg">
      {/* Ticket Header */}
      <View className="w-full items-center gap-1">
        <Text className="text-2xl font-bold text-yellow-800">🎟️ SCRATCH-OFF</Text>
        <Text className="text-xs text-yellow-700 font-mono">{ticketNumber}</Text>
      </View>

      {/* Unrevealed State */}
      {status === "unrevealed" && (
        <View className="w-full gap-3 items-center">
          <View className="w-full bg-yellow-600 rounded-xl p-8 items-center gap-2">
            <Text className="text-6xl">🤔</Text>
            <Text className="text-sm font-bold text-white text-center">
              What Will You Win?
            </Text>
          </View>
          <Text className="text-xs text-yellow-700 text-center">
            Tap below to scratch and reveal your prize!
          </Text>
          {onReveal && (
            <Pressable
              onPress={onReveal}
              className="bg-yellow-500 rounded-lg px-8 py-3 w-full items-center active:opacity-80"
            >
              <Text className="text-white font-bold text-lg">Scratch Ticket</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Revealed State */}
      {status === "revealed" && (
        <View className="w-full gap-3 items-center">
          <View className="w-full bg-gradient-to-b from-green-400 to-green-500 rounded-xl p-8 items-center gap-3">
            {prizeType === "loyalty_points" ? (
              <>
                <Text className="text-6xl">💰</Text>
                <Text className="text-2xl font-bold text-white">
                  +{loyaltyPointsReward}
                </Text>
                <Text className="text-sm font-bold text-white">Loyalty Points!</Text>
              </>
            ) : (
              <>
                <Text className="text-6xl">🎰</Text>
                <Text className="text-2xl font-bold text-white">
                  +{drawingEntryCount}
                </Text>
                <Text className="text-sm font-bold text-white">Drawing Entries!</Text>
              </>
            )}
          </View>
          <Text className="text-xs text-yellow-700 text-center">
            Congratulations! Tap below to claim your prize.
          </Text>
          {onClaim && (
            <Pressable
              onPress={onClaim}
              className="bg-green-500 rounded-lg px-8 py-3 w-full items-center active:opacity-80"
            >
              <Text className="text-white font-bold text-lg">Claim Prize</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Claimed State */}
      {status === "claimed" && (
        <View className="w-full gap-3 items-center">
          <View className="w-full bg-gradient-to-b from-blue-400 to-blue-500 rounded-xl p-8 items-center gap-2">
            <Text className="text-6xl">✅</Text>
            <Text className="text-sm font-bold text-white text-center">
              Prize Claimed!
            </Text>
          </View>
          {prizeType === "loyalty_points" ? (
            <Text className="text-xs text-yellow-700 text-center">
              {loyaltyPointsReward} loyalty points have been added to your account.
            </Text>
          ) : (
            <Text className="text-xs text-yellow-700 text-center">
              {drawingEntryCount} drawing entries have been added to this week&apos;s drawing.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

/**
 * Loyalty Points Summary Card
 * Shows user's total points and stats
 */
export interface LoyaltyPointsSummaryProps {
  totalPoints?: number;
  totalSignIns?: number;
  totalPointsEarned?: number;
  nextMilestone?: number;
}

export function LoyaltyPointsSummary({
  totalPoints = 0,
  totalSignIns = 0,
  totalPointsEarned = 0,
  nextMilestone = 5000,
}: LoyaltyPointsSummaryProps) {
  const progressPercent = Math.min((totalPoints / nextMilestone) * 100, 100);

  return (
    <View className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border-2 border-purple-200 p-6 gap-4">
      {/* Header */}
      <View className="gap-1">
        <Text className="text-2xl font-bold text-purple-900">💎 Loyalty Points</Text>
        <Text className="text-3xl font-bold text-purple-700">{totalPoints}</Text>
      </View>

      {/* Progress Bar */}
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-semibold text-purple-700">
            Progress to {nextMilestone}
          </Text>
          <Text className="text-xs font-semibold text-purple-700">
            {Math.round(progressPercent)}%
          </Text>
        </View>
        <View className="w-full h-3 bg-purple-200 rounded-full overflow-hidden">
          <View
            className="h-full bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </View>
      </View>

      {/* Stats */}
      <View className="flex-row gap-4 pt-2">
        <View className="flex-1 gap-1">
          <Text className="text-xs text-purple-600">Sign-Ins</Text>
          <Text className="text-lg font-bold text-purple-900">{totalSignIns}</Text>
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-xs text-purple-600">Total Earned</Text>
          <Text className="text-lg font-bold text-purple-900">{totalPointsEarned}</Text>
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-xs text-purple-600">Avg per Sign-In</Text>
          <Text className="text-lg font-bold text-purple-900">
            {totalSignIns > 0 ? Math.round(totalPointsEarned / totalSignIns) : 0}
          </Text>
        </View>
      </View>
    </View>
  );
}
