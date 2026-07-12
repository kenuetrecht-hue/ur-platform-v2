import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  FlatList,
  Image,
  Modal,
  Share,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { router } from "expo-router";

interface Portfolio {
  id: string;
  title: string;
  description: string;
  type: "music" | "art" | "writing";
  thumbnail: string;
  likes: number;
  comments: number;
  shares: number;
  createdAt: number;
  featured: boolean;
  rating: number;
  downloads: number;
}

interface CreatorProfile {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  portfolios: Portfolio[];
  rating: number;
  verified: boolean;
}

const MOCK_CREATOR: CreatorProfile = {
  id: "creator_001",
  name: "Alex Rivera",
  handle: "@alexrivera",
  avatar: "🎨",
  bio: "Music composer & digital artist. Creating beautiful soundscapes and visual art.",
  followers: 12400,
  following: 342,
  rating: 4.9,
  verified: true,
  portfolios: [
    {
      id: "port_001",
      title: "Sunset Dreams",
      description: "A peaceful ambient composition perfect for meditation",
      type: "music",
      thumbnail: "🎵",
      likes: 2340,
      comments: 156,
      shares: 89,
      createdAt: Date.now() - 86400000,
      featured: true,
      rating: 4.8,
      downloads: 1203,
    },
    {
      id: "port_002",
      title: "Digital Landscape",
      description: "Modern digital art exploring nature and technology",
      type: "art",
      thumbnail: "🖼️",
      likes: 1890,
      comments: 234,
      shares: 156,
      createdAt: Date.now() - 172800000,
      featured: true,
      rating: 4.7,
      downloads: 892,
    },
    {
      id: "port_003",
      title: "The Journey Begins",
      description: "A short story about self-discovery and adventure",
      type: "writing",
      thumbnail: "📖",
      likes: 1456,
      comments: 189,
      shares: 67,
      createdAt: Date.now() - 259200000,
      featured: false,
      rating: 4.6,
      downloads: 567,
    },
    {
      id: "port_004",
      title: "Energetic Pop Mix",
      description: "Upbeat pop track with modern production",
      type: "music",
      thumbnail: "🎵",
      likes: 3120,
      comments: 412,
      shares: 234,
      createdAt: Date.now() - 345600000,
      featured: false,
      rating: 4.9,
      downloads: 2145,
    },
    {
      id: "port_005",
      title: "Abstract Expressions",
      description: "Experimental digital art pushing creative boundaries",
      type: "art",
      thumbnail: "🖼️",
      likes: 2567,
      comments: 301,
      shares: 189,
      createdAt: Date.now() - 432000000,
      featured: false,
      rating: 4.8,
      downloads: 1456,
    },
  ],
};

export default function CreatorPortfolio() {
  const colors = useColors();
  const [creator] = useState<CreatorProfile>(MOCK_CREATOR);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [filterType, setFilterType] = useState<"all" | "music" | "art" | "writing">("all");
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "rating">("recent");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  const filteredPortfolios = creator.portfolios
    .filter((p) => filterType === "all" || p.type === filterType)
    .sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return b.likes - a.likes;
        case "rating":
          return b.rating - a.rating;
        case "recent":
        default:
          return b.createdAt - a.createdAt;
      }
    });

  const handleShare = async (portfolio: Portfolio) => {
    try {
      await Share.share({
        message: `Check out "${portfolio.title}" by ${creator.name}!`,
        url: `https://urplatform.com/portfolio/${portfolio.id}`,
        title: portfolio.title,
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      music: "🎵",
      art: "🖼️",
      writing: "📖",
    };
    return icons[type] || "📁";
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const formatDate = (timestamp: number) => {
    const days = Math.floor((Date.now() - timestamp) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700" }}>
            Portfolio
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <IconSymbol name="gear" size={24} color={colors.muted} />
          </Pressable>
        </View>

        {/* Creator Profile Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            marginHorizontal: 16,
            marginVertical: 16,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: colors.primary,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 32 }}>{creator.avatar}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
                  {creator.name}
                </Text>
                {creator.verified && (
                  <IconSymbol name="checkmark.circle.fill" size={16} color={colors.primary} />
                )}
              </View>
              <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
                {creator.handle}
              </Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View>
                  <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "700" }}>
                    {formatNumber(creator.followers)}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 10 }}>Followers</Text>
                </View>
                <View>
                  <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "700" }}>
                    {creator.rating}⭐
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 10 }}>Rating</Text>
                </View>
              </View>
            </View>
          </View>
          <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 18, marginBottom: 12 }}>
            {creator.bio}
          </Text>
          <Pressable
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>
              Follow Creator
            </Text>
          </Pressable>
        </View>

        {/* Filter & Sort */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 8,
          }}
        >
          <Pressable
            onPress={() => setShowFilterModal(true)}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 10,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <IconSymbol name="line.horizontal.3.decrease" size={16} color={colors.foreground} />
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>
              Filter
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setShowSortModal(true)}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 10,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <IconSymbol name="arrow.up.arrow.down" size={16} color={colors.foreground} />
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>
              Sort
            </Text>
          </Pressable>
        </View>

        {/* Portfolio Grid */}
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {filteredPortfolios.length === 0 ? (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 32,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center" }}>
                No portfolios found
              </Text>
            </View>
          ) : (
            <FlatList
              scrollEnabled={true}
              data={filteredPortfolios}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setSelectedPortfolio(item)}
                  style={({ pressed }) => ({
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <View
                    style={{
                      backgroundColor: colors.primary + "20",
                      height: 160,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 48 }}>{getTypeIcon(item.type)}</Text>
                    {item.featured && (
                      <View
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          backgroundColor: colors.primary,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "700" }}>
                          ⭐ Featured
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={{ paddingHorizontal: 12, paddingVertical: 12, gap: 8 }}>
                    <View>
                      <Text
                        style={{
                          color: colors.foreground,
                          fontSize: 14,
                          fontWeight: "700",
                        }}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={{
                          color: colors.muted,
                          fontSize: 12,
                          marginTop: 2,
                        }}
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        <View style={{ alignItems: "center" }}>
                          <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "700" }}>
                            {formatNumber(item.likes)}
                          </Text>
                          <Text style={{ color: colors.muted, fontSize: 10 }}>👍</Text>
                        </View>
                        <View style={{ alignItems: "center" }}>
                          <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "700" }}>
                            {formatNumber(item.downloads)}
                          </Text>
                          <Text style={{ color: colors.muted, fontSize: 10 }}>⬇️</Text>
                        </View>
                      </View>
                      <View
                        style={{
                          backgroundColor: colors.primary + "20",
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>
                          {item.rating}⭐
                        </Text>
                      </View>
                    </View>

                    <Text style={{ color: colors.muted, fontSize: 11 }}>
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      </ScrollView>

      {/* Portfolio Detail Modal */}
      <Modal
        visible={selectedPortfolio !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPortfolio(null)}
      >
        {selectedPortfolio && (
          <ScreenContainer>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Pressable
                  onPress={() => setSelectedPortfolio(null)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <IconSymbol name="xmark" size={24} color={colors.foreground} />
                </Pressable>
                <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
                  Details
                </Text>
                <Pressable
                  onPress={() => handleShare(selectedPortfolio)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <IconSymbol name="square.and.arrow.up" size={24} color={colors.primary} />
                </Pressable>
              </View>

              {/* Content */}
              <View
                style={{
                  backgroundColor: colors.primary + "20",
                  height: 240,
                  justifyContent: "center",
                  alignItems: "center",
                  marginVertical: 16,
                }}
              >
                <Text style={{ fontSize: 64 }}>{getTypeIcon(selectedPortfolio.type)}</Text>
              </View>

              <View style={{ paddingHorizontal: 16, gap: 16 }}>
                <View>
                  <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "700" }}>
                    {selectedPortfolio.title}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>
                    {selectedPortfolio.description}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-around",
                      gap: 12,
                    }}
                  >
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
                        {formatNumber(selectedPortfolio.likes)}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                        Likes
                      </Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
                        {formatNumber(selectedPortfolio.comments)}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                        Comments
                      </Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
                        {formatNumber(selectedPortfolio.downloads)}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                        Downloads
                      </Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
                        {selectedPortfolio.rating}⭐
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                        Rating
                      </Text>
                    </View>
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => ({
                    backgroundColor: colors.primary,
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: "center",
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
                    ⬇️ Download
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </ScreenContainer>
        )}
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 20,
              paddingVertical: 20,
              gap: 12,
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700" }}>
              Filter by Type
            </Text>

            {["all", "music", "art", "writing"].map((type) => (
              <Pressable
                key={type}
                onPress={() => {
                  setFilterType(type as any);
                  setShowFilterModal(false);
                }}
                style={({ pressed }) => ({
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderWidth: 2,
                  borderColor: filterType === type ? colors.primary : colors.border,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text
                  style={{
                    color: filterType === type ? colors.primary : colors.foreground,
                    fontSize: 14,
                    fontWeight: filterType === type ? "700" : "500",
                  }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal visible={showSortModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 20,
              paddingVertical: 20,
              gap: 12,
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700" }}>
              Sort by
            </Text>

            {["recent", "popular", "rating"].map((sort) => (
              <Pressable
                key={sort}
                onPress={() => {
                  setSortBy(sort as any);
                  setShowSortModal(false);
                }}
                style={({ pressed }) => ({
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderWidth: 2,
                  borderColor: sortBy === sort ? colors.primary : colors.border,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text
                  style={{
                    color: sortBy === sort ? colors.primary : colors.foreground,
                    fontSize: 14,
                    fontWeight: sortBy === sort ? "700" : "500",
                  }}
                >
                  {sort.charAt(0).toUpperCase() + sort.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
