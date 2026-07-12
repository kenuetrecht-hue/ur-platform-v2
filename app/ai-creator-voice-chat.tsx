import React, { useState, useCallback, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { VoiceChat } from "@/components/voice-chat";
import {
  getAICreatorVoiceProfile,
  checkVoiceChatAccess,
  getVoiceChatAccessMessage,
  getVoiceChatBenefits,
  type SubscriberVoiceChatAccess,
} from "@/lib/ai-creator-voice-profiles";

interface AICreatorVoiceChatProps {
  aiId: string;
  subscriberId: string;
  subscriptionStatus: SubscriberVoiceChatAccess;
}

export default function AICreatorVoiceChat({
  aiId,
  subscriberId,
  subscriptionStatus,
}: AICreatorVoiceChatProps) {
  const colors = useColors();
  const [showChat, setShowChat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const profile = getAICreatorVoiceProfile(aiId);
  const accessCheck = checkVoiceChatAccess(subscriberId, aiId, subscriptionStatus);
  const benefits = getVoiceChatBenefits(subscriptionStatus.subscriptionTier);

  if (!profile) {
    return (
      <ScreenContainer className="bg-background items-center justify-center">
        <Text style={{ color: colors.foreground, fontSize: 16 }}>
          AI creator not found
        </Text>
      </ScreenContainer>
    );
  }

  if (showChat && accessCheck.hasAccess) {
    return (
      <VoiceChat
        creatorId={aiId}
        aiName={profile.aiName}
        onClose={() => setShowChat(false)}
      />
    );
  }

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 16, gap: 12 }}>
          <View style={{ alignItems: "center", gap: 12 }}>
            <Text style={{ fontSize: 64 }}>🤖</Text>
            <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "800" }}>
              {profile.aiName}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center" }}>
              {profile.personality}
            </Text>
          </View>

          {/* Expertise */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "700" }}>
              Expertise
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {profile.expertise.map((skill) => (
                <View
                  key={skill}
                  style={{
                    backgroundColor: colors.primary + "20",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                  }}
                >
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {skill}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Subscription Status */}
        <View
          style={{
            marginHorizontal: 20,
            marginBottom: 20,
            padding: 14,
            backgroundColor: colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 8,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>
              Subscription Status
            </Text>
            <View
              style={{
                backgroundColor: subscriptionStatus.isSubscribed
                  ? colors.success + "20"
                  : colors.error + "20",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
              }}
            >
              <Text
                style={{
                  color: subscriptionStatus.isSubscribed
                    ? colors.success
                    : colors.error,
                  fontSize: 11,
                  fontWeight: "700",
                }}
              >
                {subscriptionStatus.isSubscribed ? "ACTIVE" : "INACTIVE"}
              </Text>
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.muted, fontSize: 12 }}>Tier</Text>
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 12,
                  fontWeight: "600",
                  textTransform: "capitalize",
                }}
              >
                {subscriptionStatus.subscriptionTier}
              </Text>
            </View>

            {subscriptionStatus.isSubscribed && (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    Voice Chat Minutes
                  </Text>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {accessCheck.remainingMinutes} / {benefits.monthlyMinutes}
                  </Text>
                </View>

                <View
                  style={{
                    height: 6,
                    backgroundColor: colors.border,
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      backgroundColor: colors.primary,
                      width: `${(accessCheck.remainingMinutes / benefits.monthlyMinutes) * 100}%`,
                    }}
                  />
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    Expires
                  </Text>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {subscriptionStatus.subscriptionEndDate.toLocaleDateString()}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Access Status */}
        {!accessCheck.hasAccess && (
          <View
            style={{
              marginHorizontal: 20,
              marginBottom: 20,
              padding: 14,
              backgroundColor: colors.error + "15",
              borderRadius: 12,
              borderLeftWidth: 4,
              borderLeftColor: colors.error,
              gap: 8,
            }}
          >
            <Text style={{ color: colors.error, fontSize: 13, fontWeight: "600" }}>
              ⚠️ No Access
            </Text>
            <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}>
              {accessCheck.reason}
            </Text>
          </View>
        )}

        {/* Subscription Benefits */}
        <View style={{ paddingHorizontal: 20, gap: 12, marginBottom: 20 }}>
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>
            {subscriptionStatus.subscriptionTier.toUpperCase()} Benefits
          </Text>

          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              gap: 10,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 20, marginTop: 2 }}>🎤</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.foreground,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  Voice Chat
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                  {benefits.monthlyMinutes} minutes per month
                </Text>
              </View>
            </View>

            {benefits.priority && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <Text style={{ fontSize: 20, marginTop: 2 }}>⭐</Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    Priority Access
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                    Faster response times
                  </Text>
                </View>
              </View>
            )}

            {benefits.customVoice && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <Text style={{ fontSize: 20, marginTop: 2 }}>🎵</Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    Custom Voice Options
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                    Choose your preferred voice
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Disclaimers */}
        <View style={{ paddingHorizontal: 20, gap: 8, marginBottom: 20 }}>
          <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "700" }}>
            Important Disclaimers
          </Text>
          <View
            style={{
              backgroundColor: colors.primary + "10",
              borderRadius: 8,
              padding: 10,
              gap: 6,
            }}
          >
            {profile.disclaimers.map((disclaimer, index) => (
              <Text
                key={index}
                style={{
                  color: colors.muted,
                  fontSize: 11,
                  lineHeight: 16,
                }}
              >
                • {disclaimer}
              </Text>
            ))}
          </View>
        </View>

        {/* Start Chat Button */}
        {accessCheck.hasAccess ? (
          <Pressable
            onPress={() => setShowChat(true)}
            disabled={isLoading}
            style={({ pressed }) => ({
              marginHorizontal: 20,
              backgroundColor: colors.primary,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
              gap: 8,
              opacity: pressed || isLoading ? 0.7 : 1,
            })}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={{ fontSize: 20 }}>🎤</Text>
                <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>
                  Start Voice Chat
                </Text>
              </>
            )}
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => ({
              marginHorizontal: 20,
              backgroundColor: colors.surface,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
              gap: 8,
              borderWidth: 2,
              borderColor: colors.primary,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 20 }}>💳</Text>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "700" }}>
              Subscribe to Access
            </Text>
          </Pressable>
        )}

        {/* Info Box */}
        <View
          style={{
            marginHorizontal: 20,
            marginTop: 16,
            padding: 12,
            backgroundColor: colors.primary + "10",
            borderRadius: 8,
            gap: 6,
          }}
        >
          <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: "600" }}>
            💡 How Voice Chat Works
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
            Speak naturally to {profile.aiName}. Your voice is transcribed to text, the AI responds, and you hear the response in real-time. All conversations are private and secure.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
