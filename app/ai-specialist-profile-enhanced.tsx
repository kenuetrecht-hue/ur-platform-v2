import { View, Text, ScrollView, Pressable, FlatList, Modal } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { WarningBanner } from "@/components/warning-banner";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import {
  ALL_AI_CREATORS,
  generateAIContent,
  AIContent,
  getAICreatorById,
} from "@/lib/ai-creators-system";
import { useState, useEffect } from "react";

interface BookingSession {
  id: string;
  duration: 15 | 30 | 60;
  price: number;
  description: string;
}

const BOOKING_OPTIONS: BookingSession[] = [
  {
    id: "quick",
    duration: 15,
    price: 9.99,
    description: "Quick consultation",
  },
  {
    id: "standard",
    duration: 30,
    price: 19.99,
    description: "Standard session",
  },
  {
    id: "extended",
    duration: 60,
    price: 39.99,
    description: "Extended session",
  },
];

export default function AISpecialistProfileEnhanced() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [contents, setContents] = useState<AIContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<BookingSession | null>(
    null
  );
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const creator = getAICreatorById(id || "");

  useEffect(() => {
    if (creator) {
      setTimeout(() => {
        const newContents = Array.from({ length: 5 }, () =>
          generateAIContent(creator)
        );
        setContents(newContents);
        setLoading(false);
      }, 1000);
    }
  }, [creator]);

  if (!creator) {
    return (
      <ScreenContainer>
        <WarningBanner />
        <View className="flex-1 items-center justify-center">
          <Text className="text-foreground">Creator not found</Text>
        </View>
      </ScreenContainer>
    );
  }

  const handleBookSession = (session: BookingSession) => {
    setSelectedSession(session);
    setShowBookingModal(false);
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = () => {
    // Process payment
    setShowPaymentModal(false);
    // Navigate to voice chat
    router.push(
      `/ai-creator-voice-chat?id=${id}&sessionDuration=${selectedSession?.duration}`
    );
  };

  const ratingStars = Math.round(creator.rating);
  const ratingPercentage = (creator.rating / 5) * 100;

  return (
    <ScreenContainer>
      <WarningBanner />
      <FlatList
        data={contents}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="gap-4 pb-4">
            {/* Creator Header Card */}
            <View
              className="rounded-lg p-6 gap-4"
              style={{ backgroundColor: colors.surface }}
            >
              <View className="items-center gap-3">
                <Text className="text-6xl">{creator.avatar}</Text>
                <View className="items-center gap-1">
                  <Text className="text-2xl font-bold text-foreground">
                    {creator.name}
                  </Text>
                  <Text className="text-sm text-muted">@{creator.handle}</Text>
                </View>
                <Text className="text-sm text-center text-muted max-w-xs">
                  {creator.bio}
                </Text>
              </View>

              {/* Rating Section */}
              <View className="gap-2 py-3 border-t border-b" style={{ borderColor: colors.border }}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-lg font-bold text-foreground">
                      {creator.rating.toFixed(1)}
                    </Text>
                    <Text className="text-yellow-500">
                      {"★".repeat(ratingStars)}
                      {"☆".repeat(5 - ratingStars)}
                    </Text>
                  </View>
                  <Text className="text-xs text-muted">
                    {Math.round(ratingPercentage)}% positive
                  </Text>
                </View>
                <View
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: colors.border }}
                >
                  <View
                    className="h-full"
                    style={{
                      width: `${ratingPercentage}%`,
                      backgroundColor: colors.primary,
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Stats Grid */}
            <View className="flex-row gap-3">
              <View
                className="flex-1 rounded-lg p-4 items-center"
                style={{ backgroundColor: colors.surface }}
              >
                <Text className="text-2xl font-bold text-primary">
                  {(creator.followers / 1000).toFixed(1)}K
                </Text>
                <Text className="text-xs text-muted mt-1">Followers</Text>
              </View>

              <View
                className="flex-1 rounded-lg p-4 items-center"
                style={{ backgroundColor: colors.surface }}
              >
                <Text className="text-2xl font-bold text-primary">
                  ${creator.price}
                </Text>
                <Text className="text-xs text-muted mt-1">Per Session</Text>
              </View>

              <View
                className="flex-1 rounded-lg p-4 items-center"
                style={{ backgroundColor: colors.surface }}
              >
                <Text className="text-2xl font-bold text-primary">
                  {creator.category}
                </Text>
                <Text className="text-xs text-muted mt-1">Category</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="gap-3">
              <Pressable
                onPress={() => setShowBookingModal(true)}
                className="rounded-lg p-4 items-center"
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="text-white font-bold text-center">
                  📞 Book Session
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setIsSubscribed(!isSubscribed)}
                className="rounded-lg p-4 items-center border"
                style={{
                  backgroundColor: isSubscribed ? colors.primary : "transparent",
                  borderColor: colors.primary,
                }}
              >
                <Text
                  className="font-bold text-center"
                  style={{ color: isSubscribed ? "white" : colors.primary }}
                >
                  {isSubscribed ? "✓ Subscribed" : "Subscribe"}
                </Text>
              </Pressable>
            </View>

            {/* About Section */}
            <View
              className="rounded-lg p-4 gap-2"
              style={{ backgroundColor: colors.surface }}
            >
              <Text className="text-sm font-bold text-foreground">
                About This AI
              </Text>
              <Text className="text-xs text-muted leading-relaxed">
                {creator.bio}
              </Text>
            </View>

            {/* Topics Section */}
            {creator.topics && creator.topics.length > 0 && (
              <View
                className="rounded-lg p-4 gap-2"
                style={{ backgroundColor: colors.surface }}
              >
                <Text className="text-sm font-bold text-foreground">
                  Specialties
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {creator.topics.map((topic, idx) => (
                    <View
                      key={idx}
                      className="px-3 py-1 rounded-full"
                      style={{ backgroundColor: colors.primary + "20" }}
                    >
                      <Text className="text-xs text-primary font-semibold">
                        {topic}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Disclaimer */}
            {creator.disclaimer && (
              <View
                className="rounded-lg p-3 border"
                style={{
                  backgroundColor: colors.error + "10",
                  borderColor: colors.error,
                }}
              >
                <Text className="text-xs text-muted">
                  ⚠️ {creator.disclaimer}
                </Text>
              </View>
            )}

            {/* Content Section Header */}
            <Text className="text-lg font-bold text-foreground mt-2">
              Recent Content
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            className="rounded-lg p-4 mb-3 gap-2"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-sm font-semibold text-foreground">
              {item.title}
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              {item.content}
            </Text>
            <Text className="text-xs text-muted mt-1">
              {new Date(item.timestamp).toLocaleDateString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center py-8">
              <Text className="text-muted">No content yet</Text>
            </View>
          ) : null
        }
        scrollEnabled={true}
      />

      {/* Booking Modal */}
      <Modal
        visible={showBookingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <View
            className="rounded-t-2xl p-6 gap-4"
            style={{ backgroundColor: colors.background }}
          >
            <View className="items-center gap-2 mb-4">
              <Text className="text-2xl font-bold text-foreground">
                Book a Session
              </Text>
              <Text className="text-sm text-muted">
                Choose your session duration
              </Text>
            </View>

            {BOOKING_OPTIONS.map((session) => (
              <Pressable
                key={session.id}
                onPress={() => handleBookSession(session)}
                className="rounded-lg p-4 border flex-row items-center justify-between"
                style={{ borderColor: colors.border }}
              >
                <View className="gap-1">
                  <Text className="font-bold text-foreground">
                    {session.duration} minutes
                  </Text>
                  <Text className="text-xs text-muted">
                    {session.description}
                  </Text>
                </View>
                <Text className="text-lg font-bold text-primary">
                  ${session.price}
                </Text>
              </Pressable>
            ))}

            <Pressable
              onPress={() => setShowBookingModal(false)}
              className="rounded-lg p-3 items-center"
              style={{ backgroundColor: colors.surface }}
            >
              <Text className="text-foreground font-semibold">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <View
            className="rounded-t-2xl p-6 gap-4"
            style={{ backgroundColor: colors.background }}
          >
            <View className="items-center gap-2 mb-4">
              <Text className="text-2xl font-bold text-foreground">
                Confirm Booking
              </Text>
              {selectedSession && (
                <View className="items-center gap-1">
                  <Text className="text-lg font-bold text-primary">
                    ${selectedSession.price}
                  </Text>
                  <Text className="text-sm text-muted">
                    {selectedSession.duration} minute session with {creator.name}
                  </Text>
                </View>
              )}
            </View>

            <View
              className="rounded-lg p-4 gap-2"
              style={{ backgroundColor: colors.surface }}
            >
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Session Duration</Text>
                <Text className="text-sm font-bold text-foreground">
                  {selectedSession?.duration} min
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">AI Specialist</Text>
                <Text className="text-sm font-bold text-foreground">
                  {creator.name}
                </Text>
              </View>
              <View className="flex-row justify-between border-t pt-2" style={{ borderColor: colors.border }}>
                <Text className="text-sm font-bold text-foreground">Total</Text>
                <Text className="text-lg font-bold text-primary">
                  ${selectedSession?.price}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleConfirmPayment}
              className="rounded-lg p-4 items-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-white font-bold text-center">
                💳 Pay & Start Session
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowPaymentModal(false)}
              className="rounded-lg p-3 items-center"
              style={{ backgroundColor: colors.surface }}
            >
              <Text className="text-foreground font-semibold">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
