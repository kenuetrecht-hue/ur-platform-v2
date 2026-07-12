import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, FlatList } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useLoyaltyPointsSummary } from "@/hooks/use-daily-signin";
import { cn } from "@/lib/utils";

interface RedemptionItem {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  icon: string;
  category: "premium" | "feature" | "content" | "drawing";
  value: string;
}

const MARKETPLACE_ITEMS: RedemptionItem[] = [
  {
    id: "premium-month",
    name: "Premium Membership (1 Month)",
    description: "Unlock all premium features for 30 days",
    pointsCost: 5000,
    icon: "👑",
    category: "premium",
    value: "$9.99",
  },
  {
    id: "premium-3month",
    name: "Premium Membership (3 Months)",
    description: "Unlock all premium features for 90 days",
    pointsCost: 12000,
    icon: "👑",
    category: "premium",
    value: "$24.99",
  },
  {
    id: "ad-free-month",
    name: "Ad-Free Experience (1 Month)",
    description: "Browse without ads for 30 days",
    pointsCost: 2500,
    icon: "🚫",
    category: "feature",
    value: "$4.99",
  },
  {
    id: "boost-creator",
    name: "Creator Boost (7 Days)",
    description: "Get featured on creator homepage",
    pointsCost: 3000,
    icon: "🚀",
    category: "feature",
    value: "$6.99",
  },
  {
    id: "exclusive-content",
    name: "Exclusive Content Pack",
    description: "Access 50+ exclusive creator videos",
    pointsCost: 4000,
    icon: "🎬",
    category: "content",
    value: "$7.99",
  },
  {
    id: "drawing-entries-10",
    name: "10 Drawing Entries",
    description: "10 bonus entries for weekly drawing",
    pointsCost: 1000,
    icon: "🎰",
    category: "drawing",
    value: "$1.99",
  },
  {
    id: "drawing-entries-50",
    name: "50 Drawing Entries",
    description: "50 bonus entries for weekly drawing",
    pointsCost: 4500,
    icon: "🎰",
    category: "drawing",
    value: "$8.99",
  },
  {
    id: "drawing-entries-100",
    name: "100 Drawing Entries",
    description: "100 bonus entries for weekly drawing",
    pointsCost: 8000,
    icon: "🎰",
    category: "drawing",
    value: "$14.99",
  },
];

export default function LoyaltyMarketplaceScreen() {
  const colors = useColors();
  const { totalPoints, loading } = useLoyaltyPointsSummary();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const filteredItems = selectedCategory
    ? MARKETPLACE_ITEMS.filter((item) => item.category === selectedCategory)
    : MARKETPLACE_ITEMS;

  const categories = [
    { id: null, name: "All", count: MARKETPLACE_ITEMS.length },
    { id: "premium", name: "Premium", count: MARKETPLACE_ITEMS.filter((i) => i.category === "premium").length },
    { id: "feature", name: "Features", count: MARKETPLACE_ITEMS.filter((i) => i.category === "feature").length },
    { id: "content", name: "Content", count: MARKETPLACE_ITEMS.filter((i) => i.category === "content").length },
    { id: "drawing", name: "Drawing", count: MARKETPLACE_ITEMS.filter((i) => i.category === "drawing").length },
  ];

  const handleRedeem = (item: RedemptionItem) => {
    if (totalPoints < item.pointsCost) {
      Alert.alert(
        "Insufficient Points",
        `You need ${item.pointsCost - totalPoints} more points to redeem this item.`
      );
      return;
    }

    Alert.alert(
      "Confirm Redemption",
      `Redeem "${item.name}" for ${item.pointsCost} points?`,
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Redeem",
          onPress: async () => {
            setRedeeming(item.id);
            try {
              // Simulate redemption
              await new Promise((resolve) => setTimeout(resolve, 1500));
              Alert.alert("Success!", `You've redeemed ${item.name}!`);
              setRedeeming(null);
            } catch (error) {
              Alert.alert("Error", "Failed to redeem item. Please try again.");
              setRedeeming(null);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView className="flex-1 p-4 gap-6">
        {/* Header */}
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">Loyalty Marketplace</Text>
          <Text className="text-base text-muted">Spend your points on premium features and rewards</Text>
        </View>

        {/* Points Balance */}
        <View className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl p-6 gap-2 border-2 border-purple-300">
          <Text className="text-sm font-semibold text-purple-700">Available Points</Text>
          <Text className="text-4xl font-bold text-purple-900">{loading ? "..." : totalPoints.toLocaleString()}</Text>
          <Text className="text-xs text-purple-600 mt-2">Earn 200 points daily by signing in</Text>
        </View>

        {/* Category Filter */}
        <View className="gap-3">
          <Text className="text-sm font-semibold text-foreground">Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
            {categories.map((cat) => (
              <Pressable
                key={cat.id || "all"}
                onPress={() => setSelectedCategory(cat.id as any)}
                className={cn(
                  "px-4 py-2 rounded-full border-2 flex-row items-center gap-2",
                  selectedCategory === cat.id
                    ? "bg-purple-500 border-purple-500"
                    : "bg-white border-purple-200"
                )}
              >
                <Text
                  className={cn(
                    "font-semibold text-sm",
                    selectedCategory === cat.id ? "text-white" : "text-purple-700"
                  )}
                >
                  {cat.name}
                </Text>
                <Text
                  className={cn(
                    "text-xs font-bold",
                    selectedCategory === cat.id ? "text-purple-100" : "text-purple-500"
                  )}
                >
                  {cat.count}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Marketplace Items */}
        <View className="gap-3">
          {filteredItems.map((item) => (
            <View
              key={item.id}
              className="bg-white rounded-2xl border-2 border-purple-100 p-4 gap-3 flex-row items-center"
            >
              {/* Icon */}
              <Text className="text-4xl">{item.icon}</Text>

              {/* Content */}
              <View className="flex-1 gap-1">
                <Text className="text-base font-bold text-foreground">{item.name}</Text>
                <Text className="text-xs text-muted">{item.description}</Text>
                <View className="flex-row items-center gap-2 mt-1">
                  <Text className="text-xs font-semibold text-purple-600">
                    💎 {item.pointsCost.toLocaleString()} points
                  </Text>
                  <Text className="text-xs text-gray-400">•</Text>
                  <Text className="text-xs text-gray-500">{item.value}</Text>
                </View>
              </View>

              {/* Redeem Button */}
              <Pressable
                onPress={() => handleRedeem(item)}
                disabled={redeeming === item.id || totalPoints < item.pointsCost}
                className={cn(
                  "px-4 py-2 rounded-lg items-center",
                  totalPoints >= item.pointsCost
                    ? "bg-purple-500 active:opacity-80"
                    : "bg-gray-300 opacity-50"
                )}
              >
                <Text className="text-white font-bold text-sm">
                  {redeeming === item.id ? "..." : "Redeem"}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* Info Section */}
        <View className="bg-blue-50 rounded-2xl border-2 border-blue-200 p-4 gap-2">
          <Text className="text-sm font-bold text-blue-900">💡 How to Earn More Points</Text>
          <Text className="text-xs text-blue-800">
            • Sign in daily to earn 200 points{"\n"}
            • Scratch-off tickets for bonus points{"\n"}
            • Win drawing entries for extra rewards{"\n"}
            • Complete creator challenges
          </Text>
        </View>

        {/* Footer */}
        <View className="pb-4">
          <Pressable
            onPress={() => router.back()}
            className="bg-gray-100 px-4 py-3 rounded-lg items-center"
          >
            <Text className="text-foreground font-semibold">Continue Browsing</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
