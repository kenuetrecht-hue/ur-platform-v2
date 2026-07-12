import { useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, FlatList, Image , useWindowDimensions } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { GridLayout, WebHeader } from "@/components/web-layout";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

interface Creator {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  category: string;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
  price: number;
  followers: number;
  verified: boolean;
  description: string;
  rating: number;
}

export default function CreatorsWebScreen() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [creators] = useState<Creator[]>([
    {
      id: "1",
      name: "Alex Rivera",
      handle: "@alexrivera",
      avatar: "🎨",
      category: "Art & Design",
      tier: "Gold",
      price: 9.99,
      followers: 12500,
      verified: true,
      description: "Digital artist sharing creative tutorials and behind-the-scenes",
      rating: 4.8,
    },
    {
      id: "2",
      name: "Maya Chen",
      handle: "@mayamusic",
      avatar: "🎵",
      category: "Music",
      tier: "Platinum",
      price: 14.99,
      followers: 28000,
      verified: true,
      description: "Indie musician and producer. Weekly live sessions.",
      rating: 4.9,
    },
    {
      id: "3",
      name: "Dr. Priya Patel",
      handle: "@drpriya",
      avatar: "💼",
      category: "Business",
      tier: "Gold",
      price: 12.99,
      followers: 15000,
      verified: true,
      description: "Business strategist helping entrepreneurs scale",
      rating: 4.7,
    },
    {
      id: "4",
      name: "Sasha Kim",
      handle: "@sashakim",
      avatar: "🎬",
      category: "Content Creation",
      tier: "Silver",
      price: 4.99,
      followers: 8500,
      verified: false,
      description: "Digital artist sharing original music, covers, and tutorials",
      rating: 4.6,
    },
    {
      id: "5",
      name: "Tina Rodriguez",
      handle: "@tinarod",
      avatar: "🧘",
      category: "Wellness",
      tier: "Gold",
      price: 9.99,
      followers: 11000,
      verified: true,
      description: "Holistic wellness coach. Yoga, meditation, and mindfulness.",
      rating: 4.8,
    },
    {
      id: "6",
      name: "James Wilson",
      handle: "@jameswilson",
      avatar: "⚽",
      category: "Fitness",
      tier: "Bronze",
      price: 0.99,
      followers: 5000,
      verified: false,
      description: "Personal trainer sharing fitness tips and workout routines",
      rating: 4.5,
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"followers" | "price" | "rating">("followers");

  const categories = ["All", "Art & Design", "Music", "Business", "Content Creation", "Wellness", "Fitness"];

  const filteredCreators = creators
    .filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.handle.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || c.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "followers") return b.followers - a.followers;
      if (sortBy === "price") return a.price - b.price;
      if (sortBy === "rating") return b.rating - a.rating;
      return 0;
    });

  const CreatorCard = ({ creator }: { creator: Creator }) => (
    <Pressable
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
      })}
      className={cn(
        "bg-surface rounded-lg border border-border p-4 gap-3",
        isDesktop && "hover:shadow-lg hover:border-primary transition-all"
      )}
    >
      {/* Avatar & Tier Badge */}
      <View className="relative">
        <View className="w-full aspect-square bg-primary/20 rounded-lg flex items-center justify-center">
          <Text className="text-6xl">{creator.avatar}</Text>
        </View>
        <View
          className={cn(
            "absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold",
            creator.tier === "Platinum" && "bg-yellow-500",
            creator.tier === "Gold" && "bg-yellow-400",
            creator.tier === "Silver" && "bg-gray-400",
            creator.tier === "Bronze" && "bg-orange-400"
          )}
        >
          <Text className="text-white text-xs font-bold">{creator.tier}</Text>
        </View>
      </View>

      {/* Creator Info */}
      <View className="gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-bold text-foreground flex-1">{creator.name}</Text>
          {creator.verified && <Text className="text-lg">✓</Text>}
        </View>
        <Text className="text-sm text-muted">{creator.handle}</Text>
        <Text className="text-xs text-muted">{creator.category}</Text>
      </View>

      {/* Description */}
      <Text className="text-sm text-muted line-clamp-2">{creator.description}</Text>

      {/* Stats */}
      <View className="flex-row justify-between py-2 border-t border-b border-border">
        <View className="items-center flex-1">
          <Text className="text-sm font-bold text-foreground">{(creator.followers / 1000).toFixed(1)}K</Text>
          <Text className="text-xs text-muted">Followers</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-sm font-bold text-foreground">{creator.rating}</Text>
          <Text className="text-xs text-muted">Rating</Text>
        </View>
      </View>

      {/* Subscribe Button */}
      <Pressable className="bg-primary rounded-lg py-2 items-center">
        <Text className="text-white font-bold">Subscribe ${creator.price}/mo</Text>
      </Pressable>
    </Pressable>
  );

  return (
    <ScreenContainer>
      <WebHeader title="Discover Creators" subtitle="Find creators you love" />

      <ScrollView className="flex-1 p-4 gap-4">
        {/* Search Bar */}
        <TextInput
          placeholder="Search creators..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
          placeholderTextColor={colors.muted}
        />

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
          {categories.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-full border",
                selectedCategory === cat
                  ? "bg-primary border-primary"
                  : "bg-surface border-border"
              )}
            >
              <Text
                className={cn(
                  "text-sm font-semibold",
                  selectedCategory === cat ? "text-white" : "text-foreground"
                )}
              >
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Sort Options */}
        <View className="flex-row gap-2">
          {(["followers", "price", "rating"] as const).map((sort) => (
            <Pressable
              key={sort}
              onPress={() => setSortBy(sort)}
              className={cn(
                "flex-1 py-2 rounded-lg border",
                sortBy === sort
                  ? "bg-primary border-primary"
                  : "bg-surface border-border"
              )}
            >
              <Text
                className={cn(
                  "text-xs font-semibold text-center capitalize",
                  sortBy === sort ? "text-white" : "text-foreground"
                )}
              >
                {sort === "followers" ? "Trending" : sort === "price" ? "Price" : "Top Rated"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Creators Grid */}
        <View
          className={cn(
            "gap-4",
            isDesktop && "flex-row flex-wrap"
          )}
        >
          {filteredCreators.map((creator) => (
            <View
              key={creator.id}
              className={isDesktop ? "w-[calc(33.333%-11px)]" : "w-full"}
            >
              <CreatorCard creator={creator} />
            </View>
          ))}
        </View>

        {filteredCreators.length === 0 && (
          <View className="items-center justify-center py-12">
            <Text className="text-muted text-lg">No creators found</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
