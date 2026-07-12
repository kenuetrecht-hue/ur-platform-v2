import { View, Text, Pressable } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

export interface LaunchPromotionBannerProps {
  tier?: "tier_1" | "tier_2" | "tier_3" | null;
  discount?: number; // Discount percentage (e.g., 50, 60)
  durationDays?: number; // Duration in days (e.g., 180, 90, 30)
  lifetimeEntries?: number; // For Tier 1 only
  onLearnMore?: () => void;
}

/**
 * 30-Day Launch Promotion Banner
 * Displays directly under the AI warning banner on every page
 * Shows personalized promotional offer based on user's tier
 */
export function LaunchPromotionBanner({
  tier,
  discount = 0,
  durationDays = 0,
  lifetimeEntries = 0,
  onLearnMore,
}: LaunchPromotionBannerProps) {
  const colors = useColors();

  // Determine promotion message based on tier
  let promotionMessage = "";
  let promotionColor = "#10b981"; // Default green

  if (tier === "tier_1") {
    promotionMessage = `🎉 Exclusive Tier 1: ${discount}% OFF for ${durationDays} days + 2 Lifetime Drawing Entries!`;
    promotionColor = "#f59e0b"; // Gold for Tier 1
  } else if (tier === "tier_2") {
    promotionMessage = `🚀 Tier 2 Launch Offer: ${discount}% OFF for ${durationDays} days!`;
    promotionColor = "#8b5cf6"; // Purple for Tier 2
  } else if (tier === "tier_3") {
    promotionMessage = `⭐ Tier 3 Launch Offer: ${discount}% OFF for ${durationDays} days!`;
    promotionColor = "#06b6d4"; // Cyan for Tier 3
  } else {
    // No tier assigned (user beyond 300 or not in launch window)
    promotionMessage = "🎊 Join UR during launch and unlock exclusive promotions!";
    promotionColor = "#10b981"; // Green
  }

  return (
    <View className="bg-green-50 border-b-2 border-green-400 px-4 py-3">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1">
          <Text className="text-sm font-bold text-green-900">{promotionMessage}</Text>
          <Text className="text-xs text-green-700 mt-1">
            {tier === "tier_1"
              ? "First 100 users: Instant 24-hour zero-tax window + 6-month discount"
              : tier === "tier_2"
              ? "Users 101-200: Instant 24-hour zero-tax window + 3-month discount"
              : tier === "tier_3"
              ? "Users 201-300: Instant 24-hour zero-tax window + 1-month discount"
              : "Limited time offer - First 300 users only!"}
          </Text>
        </View>
        {onLearnMore && (
          <Pressable
            onPress={onLearnMore}
            className="bg-green-500 rounded-lg px-3 py-2 flex-shrink-0"
          >
            <Text className="text-white font-bold text-xs">Learn More</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/**
 * Compact Launch Promotion Banner
 * For use in limited space scenarios
 */
export function CompactLaunchPromotionBanner({
  tier,
  discount = 0,
}: LaunchPromotionBannerProps) {
  return (
    <View className="bg-green-100 border-b border-green-300 px-4 py-2">
      <Text className="text-xs font-bold text-green-800 text-center">
        {tier === "tier_1"
          ? `🎉 ${discount}% OFF + Lifetime Entries`
          : tier === "tier_2"
          ? `🚀 ${discount}% OFF Launch Offer`
          : tier === "tier_3"
          ? `⭐ ${discount}% OFF Launch Offer`
          : "🎊 Launch Promotion Active"}
      </Text>
    </View>
  );
}

/**
 * Genesis Clock Timer Banner
 * Shows when user is in their 24-hour zero-tax window
 */
export function GenesisClock24HourBanner({
  endTime,
  onLearnMore,
}: {
  endTime?: Date;
  onLearnMore?: () => void;
}) {
  if (!endTime) return null;

  const now = new Date();
  const timeRemaining = endTime.getTime() - now.getTime();
  const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));

  if (hoursRemaining <= 0) return null;

  return (
    <View className="bg-blue-50 border-b-2 border-blue-400 px-4 py-3">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1">
          <Text className="text-sm font-bold text-blue-900">
            ⏰ Genesis Clock Active: 0% Platform Fee for {hoursRemaining} more hours!
          </Text>
          <Text className="text-xs text-blue-700 mt-1">
            Your exclusive 24-hour zero-tax window is active. Earn 100% on all transactions during this period.
          </Text>
        </View>
        {onLearnMore && (
          <Pressable
            onPress={onLearnMore}
            className="bg-blue-500 rounded-lg px-3 py-2 flex-shrink-0"
          >
            <Text className="text-white font-bold text-xs">Details</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/**
 * Free Day of Service Banner
 * Shows when user has active free day credit
 */
export function FreeDayOfServiceBanner({
  expiresAt,
  onRedeem,
}: {
  expiresAt?: Date;
  onRedeem?: () => void;
}) {
  if (!expiresAt) return null;

  const now = new Date();
  const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) return null;

  return (
    <View className="bg-purple-50 border-b-2 border-purple-400 px-4 py-3">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1">
          <Text className="text-sm font-bold text-purple-900">
            🎁 Free Day of Service Available - Expires in {daysRemaining} days!
          </Text>
          <Text className="text-xs text-purple-700 mt-1">
            Use your complimentary premium access credit before it expires.
          </Text>
        </View>
        {onRedeem && (
          <Pressable
            onPress={onRedeem}
            className="bg-purple-500 rounded-lg px-3 py-2 flex-shrink-0"
          >
            <Text className="text-white font-bold text-xs">Redeem</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
