import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { router } from "expo-router";

interface PublishedDocument {
  id: string;
  title: string;
  author: string;
  type: "book" | "poem" | "essay" | "document";
  price: number;
  sales: number;
  rating: number;
  reviews: number;
  description: string;
  wordCount: number;
  publishedDate: number;
  category: string;
}

interface PricingTier {
  name: string;
  price: number;
  description: string;
  features: string[];
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: "Starter",
    price: 0.99,
    description: "Short stories & poems",
    features: ["Up to 5,000 words", "Basic analytics", "Standard royalties (70%)"],
  },
  {
    name: "Professional",
    price: 2.99,
    description: "Novels & collections",
    features: ["Up to 100,000 words", "Advanced analytics", "Premium royalties (75%)"],
  },
  {
    name: "Premium",
    price: 4.99,
    description: "Exclusive releases",
    features: ["Unlimited words", "Full analytics", "Elite royalties (80%)", "Early access to features"],
  },
];

const MOCK_MARKETPLACE: PublishedDocument[] = [
  {
    id: "pub_001",
    title: "The Last Horizon",
    author: "Sarah Mitchell",
    type: "book",
    price: 2.99,
    sales: 1247,
    rating: 4.8,
    reviews: 342,
    description: "A gripping sci-fi adventure about discovery beyond the stars",
    wordCount: 45000,
    publishedDate: Date.now() - 2592000000,
    category: "Science Fiction",
  },
  {
    id: "pub_002",
    title: "Whispers in the Rain",
    author: "James Chen",
    type: "poem",
    price: 0.99,
    sales: 523,
    rating: 4.9,
    reviews: 156,
    description: "A collection of 50 contemporary poems exploring love and loss",
    wordCount: 2500,
    publishedDate: Date.now() - 1296000000,
    category: "Poetry",
  },
  {
    id: "pub_003",
    title: "Digital Ethics in 2026",
    author: "Dr. Emma Rodriguez",
    type: "essay",
    price: 1.99,
    sales: 892,
    rating: 4.7,
    reviews: 234,
    description: "An in-depth exploration of AI ethics and digital responsibility",
    wordCount: 12000,
    publishedDate: Date.now() - 864000000,
    category: "Non-Fiction",
  },
];

export default function WritingMarketplace() {
  const colors = useColors();
  const [selectedDoc, setSelectedDoc] = useState<PublishedDocument | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [publishTitle, setPublishTitle] = useState("");
  const [publishPrice, setPublishPrice] = useState("2.99");
  const [publishDescription, setPublishDescription] = useState("");
  const [publishing, setPublishing] = useState(false);

  const categories = ["All", "Science Fiction", "Poetry", "Non-Fiction", "Romance", "Mystery"];

  const filteredDocs = MOCK_MARKETPLACE.filter((doc) => {
    const matchesCategory = !filterCategory || filterCategory === "All" || doc.category === filterCategory;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handlePublish = useCallback(async () => {
    if (!publishTitle.trim() || !publishDescription.trim()) return;

    setPublishing(true);
    setTimeout(() => {
      setShowPublishModal(false);
      setPublishing(false);
      setPublishTitle("");
      setPublishPrice("2.99");
      setPublishDescription("");
      // Show success feedback
    }, 1500);
  }, [publishTitle, publishDescription]);

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      book: "📖",
      poem: "✨",
      essay: "📝",
      document: "📄",
    };
    return icons[type] || "📄";
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  return (
    <ScreenContainer>
      {selectedDoc ? (
        // Document Detail View
        <ScrollView style={{ flex: 1 }}>
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
              onPress={() => setSelectedDoc(null)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700", flex: 1, marginLeft: 12 }} numberOfLines={1}>
              Document Details
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Content */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 16, gap: 16 }}>
            {/* Title & Author */}
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Text style={{ fontSize: 28 }}>{getTypeIcon(selectedDoc.type)}</Text>
                <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "700", flex: 1 }}>
                  {selectedDoc.title}
                </Text>
              </View>
              <Text style={{ color: colors.muted, fontSize: 14 }}>by {selectedDoc.author}</Text>
            </View>

            {/* Stats */}
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                <View>
                  <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Price</Text>
                  <Text style={{ color: colors.primary, fontSize: 18, fontWeight: "700" }}>
                    ${selectedDoc.price}
                  </Text>
                </View>
                <View>
                  <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Sales</Text>
                  <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700" }}>
                    {selectedDoc.sales}
                  </Text>
                </View>
                <View>
                  <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Rating</Text>
                  <Text style={{ color: colors.primary, fontSize: 18, fontWeight: "700" }}>
                    ⭐ {selectedDoc.rating}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Reviews</Text>
                  <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
                    {selectedDoc.reviews}
                  </Text>
                </View>
                <View>
                  <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Words</Text>
                  <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
                    {selectedDoc.wordCount.toLocaleString()}
                  </Text>
                </View>
                <View>
                  <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Published</Text>
                  <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
                    {formatDate(selectedDoc.publishedDate)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Description */}
            <View>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                Description
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20 }}>
                {selectedDoc.description}
              </Text>
            </View>

            {/* Revenue Breakdown */}
            <View>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                Revenue Breakdown
              </Text>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>Total Revenue</Text>
                  <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "700" }}>
                    ${(selectedDoc.sales * selectedDoc.price).toFixed(2)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>Your Earnings (75%)</Text>
                  <Text style={{ color: colors.success, fontSize: 14, fontWeight: "700" }}>
                    ${(selectedDoc.sales * selectedDoc.price * 0.75).toFixed(2)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>Platform Fee (25%)</Text>
                  <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "600" }}>
                    ${(selectedDoc.sales * selectedDoc.price * 0.25).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Button */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <Pressable
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                borderRadius: 10,
                paddingVertical: 14,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>
                💳 Purchase for ${selectedDoc.price}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        // Marketplace List View
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
              📚 Writing Marketplace
            </Text>
            <Pressable
              onPress={() => setShowPublishModal(true)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <IconSymbol name="plus" size={24} color={colors.primary} />
            </Pressable>
          </View>

          {/* Search */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.surface,
                borderRadius: 10,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
              <TextInput
                style={{
                  flex: 1,
                  color: colors.foreground,
                  fontSize: 14,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                }}
                placeholder="Search documents..."
                placeholderTextColor={colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Categories */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <FlatList
              scrollEnabled={true}
              data={categories}
              numColumns={3}
              columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setFilterCategory(item)}
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor:
                      filterCategory === item ? colors.primary : colors.surface,
                    borderRadius: 8,
                    paddingVertical: 8,
                    alignItems: "center",
                    opacity: pressed ? 0.8 : 1,
                    borderWidth: 1,
                    borderColor:
                      filterCategory === item ? colors.primary : colors.border,
                  })}
                >
                  <Text
                    style={{
                      color:
                        filterCategory === item ? "#FFFFFF" : colors.foreground,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {item}
                  </Text>
                </Pressable>
              )}
            />
          </View>

          {/* Documents List */}
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {filteredDocs.length === 0 ? (
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
                  No documents found
                </Text>
              </View>
            ) : (
              <FlatList
                scrollEnabled={true}
                data={filteredDocs}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => setSelectedDoc(item)}
                    style={({ pressed }) => ({
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <View
                        style={{
                          width: 60,
                          height: 80,
                          backgroundColor: colors.primary + "20",
                          borderRadius: 8,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ fontSize: 32 }}>
                          {getTypeIcon(item.type)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: colors.foreground,
                            fontSize: 14,
                            fontWeight: "700",
                            marginBottom: 4,
                          }}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={{
                            color: colors.muted,
                            fontSize: 12,
                            marginBottom: 6,
                          }}
                        >
                          by {item.author}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              gap: 8,
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                color: colors.primary,
                                fontSize: 13,
                                fontWeight: "700",
                              }}
                            >
                              ${item.price}
                            </Text>
                            <Text
                              style={{
                                color: colors.muted,
                                fontSize: 12,
                              }}
                            >
                              ⭐ {item.rating} ({item.reviews})
                            </Text>
                          </View>
                          <Text
                            style={{
                              color: colors.muted,
                              fontSize: 11,
                            }}
                          >
                            {item.sales} sales
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                )}
              />
            )}
          </View>
        </ScrollView>
      )}

      {/* Publish Modal */}
      <Modal visible={showPublishModal} transparent animationType="slide">
        <ScreenContainer>
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
              onPress={() => setShowPublishModal(false)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <IconSymbol name="xmark" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
              Publish Document
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 16 }}>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
              Title
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.surface,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 12,
                color: colors.foreground,
                fontSize: 14,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              placeholder="Document title..."
              placeholderTextColor={colors.muted}
              value={publishTitle}
              onChangeText={setPublishTitle}
            />

            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
              Price
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.surface,
                borderRadius: 10,
                paddingHorizontal: 12,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
                $
              </Text>
              <TextInput
                style={{
                  flex: 1,
                  color: colors.foreground,
                  fontSize: 14,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                }}
                placeholder="2.99"
                placeholderTextColor={colors.muted}
                value={publishPrice}
                onChangeText={setPublishPrice}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
              Description
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.surface,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 12,
                color: colors.foreground,
                fontSize: 14,
                minHeight: 120,
                borderWidth: 1,
                borderColor: colors.border,
                textAlignVertical: "top",
              }}
              placeholder="Describe your document..."
              placeholderTextColor={colors.muted}
              value={publishDescription}
              onChangeText={setPublishDescription}
              multiline
            />

            {/* Pricing Info */}
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 12,
                marginTop: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
                Earnings Breakdown
              </Text>
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>Your earnings (75%)</Text>
                  <Text style={{ color: colors.success, fontSize: 12, fontWeight: "700" }}>
                    ${(parseFloat(publishPrice) * 0.75).toFixed(2)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>Platform fee (25%)</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    ${(parseFloat(publishPrice) * 0.25).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: 16,
              paddingVertical: 12,
              gap: 8,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Pressable
              onPress={() => setShowPublishModal(false)}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
                borderWidth: 1,
                borderColor: colors.border,
              })}
            >
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={handlePublish}
              disabled={publishing || !publishTitle.trim() || !publishDescription.trim()}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: colors.primary,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              {publishing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>
                  🚀 Publish
                </Text>
              )}
            </Pressable>
          </View>
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
}
