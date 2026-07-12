import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import { Scene3D } from "@/components/3d-scene";
import { getAllAI3DModels } from "@/lib/3d-environment-builder";

/**
 * 3D Workspace Screen
 * 
 * Main screen for 3D interactions with AI specialists
 * Features:
 * - Interactive 3D environment
 * - AI specialist selection
 * - Real-time collaboration
 * - Voice chat integration
 */

export default function Workspace3DScreen() {
  const colors = useColors();
  const router = useRouter();
  const [show3D, setShow3D] = useState(false);
  const [selectedAI, setSelectedAI] = useState<string | undefined>(undefined);
  const [aiModels] = useState(getAllAI3DModels());

  const handleAISelect = (aiId: string) => {
    setSelectedAI(aiId);
    // Navigate to AI profile for voice chat
    setTimeout(() => {
      router.push(`/creator/${aiId}` as any);
    }, 500);
  };

  return (
    <ScreenContainer>
      {show3D ? (
        <Scene3D
          selectedAI={selectedAI || ""}
          onAISelect={handleAISelect}
          onClose={() => setShow3D(false)}
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Header */}
          <View className="px-4 py-6">
            <Text className="text-3xl font-bold text-foreground mb-2">
              3D Workspace
            </Text>
            <Text className="text-base text-muted">
              Interact with AI specialists in a 3D environment
            </Text>
          </View>

          {/* Launch 3D Button */}
          <View className="px-4 mb-6">
            <TouchableOpacity
              onPress={() => setShow3D(true)}
              className="bg-primary rounded-2xl overflow-hidden"
            >
              <View className="p-6 items-center">
                <Text className="text-5xl mb-3">🎮</Text>
                <Text className="text-2xl font-bold text-white mb-2">
                  Enter 3D Space
                </Text>
                <Text className="text-sm text-white/80 text-center">
                  Tap to explore the interactive 3D environment with all AI specialists
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Features */}
          <View className="px-4 mb-6">
            <Text className="text-lg font-bold text-foreground mb-4">
              Features
            </Text>

            {[
              {
                icon: "🎯",
                title: "Select AI Specialists",
                description: "Click on any AI to interact or start voice chat",
              },
              {
                icon: "📱",
                title: "Mobile Support",
                description: "Use Expo Go app on your phone to test 3D",
              },
              {
                icon: "🔄",
                title: "Camera Controls",
                description: "Orbit, first-person, and top-down views",
              },
              {
                icon: "👥",
                title: "Collaboration",
                description: "Work together with other users in real-time",
              },
            ].map((feature, idx) => (
              <View
                key={idx}
                className="flex-row gap-4 mb-4 p-4 rounded-xl"
                style={{ backgroundColor: colors.surface }}
              >
                <Text className="text-3xl">{feature.icon}</Text>
                <View className="flex-1">
                  <Text className="font-semibold text-foreground">
                    {feature.title}
                  </Text>
                  <Text className="text-sm text-muted mt-1">
                    {feature.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* AI Specialists Grid */}
          <View className="px-4 mb-6">
            <Text className="text-lg font-bold text-foreground mb-4">
              Available AI Specialists ({aiModels.length})
            </Text>

            {aiModels.map((ai, idx) => (
              <TouchableOpacity
                key={ai.id}
                onPress={() => {
                  setSelectedAI(ai.id);
                  setShow3D(true);
                }}
                className="flex-row gap-4 mb-3 p-4 rounded-xl"
                style={{ backgroundColor: colors.surface }}
              >
                <Text className="text-4xl">{ai.avatar}</Text>
                <View className="flex-1">
                  <Text className="font-semibold text-foreground">
                    {ai.name}
                  </Text>
                  <Text className="text-xs text-muted mt-1 capitalize">
                    {ai.category}
                  </Text>
                  <Text className="text-xs text-muted mt-2">
                    {ai.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Instructions */}
          <View className="px-4 mb-6 p-4 rounded-xl" style={{ backgroundColor: colors.surface }}>
            <Text className="font-semibold text-foreground mb-2">
              📖 How to Use
            </Text>
            <Text className="text-sm text-muted leading-relaxed">
              1. Tap &quot;Enter 3D Space&quot; to launch the interactive environment{"\n"}
              2. Use mouse/touch to rotate, zoom, and pan{"\n"}
              3. Click on AI specialists to select them{"\n"}
              4. Start voice chat to interact with the selected AI{"\n"}
              5. On mobile, download Expo Go to test on your phone
            </Text>
          </View>

          {/* Mobile Testing Info */}
          <View className="px-4 mb-6 p-4 rounded-xl" style={{ backgroundColor: colors.primary + "20" }}>
            <Text className="font-semibold text-foreground mb-2">
              📱 Test on Your Phone
            </Text>
            <Text className="text-sm text-muted mb-3">
              To test the 3D workspace on your mobile device:
            </Text>
            <Text className="text-sm text-muted mb-3">
              1. Download &quot;Expo Go&quot; app from App Store or Play Store{"\n"}
              2. Open the app and scan the QR code from the preview{"\n"}
              3. The app will load on your phone with full 3D support
            </Text>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  "Expo Go QR Code",
                  "Look for the QR code in the preview panel. Scan it with your phone's camera or the Expo Go app to test on your device."
                );
              }}
              className="bg-primary p-3 rounded-lg items-center mt-3"
            >
              <Text className="text-white font-semibold">
                Show QR Code Instructions
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
