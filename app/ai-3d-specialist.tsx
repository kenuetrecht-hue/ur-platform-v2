import React, { useState, useRef, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
// Image picker will be handled via native module
// import * as ImagePicker from "expo-image-picker";
import { cn } from "@/lib/utils";

/**
 * AI 3D Specialist Screen
 * 
 * Features:
 * - Chat with AI 3D Specialist
 * - Upload images for analysis (damage detection, space-to-3D)
 * - Generate 3D models
 * - Get cost estimates
 * - View troubleshooting guides
 * - Access learning resources
 */

type Tab = "chat" | "analyze" | "generate" | "learn";

export default function AI3DSpecialistScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; message: string }[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<"damage" | "space-to-3d" | "material-identification">("damage");
  const [modelDescription, setModelDescription] = useState("");
  const [exportFormat, setExportFormat] = useState<"stl" | "obj" | "step" | "gcode" | "dxf" | "svg">("stl");
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // tRPC mutations
  const chatMutation = trpc.ai3dSpecialist.chat.useMutation();
  const analyzeImageMutation = trpc.ai3dSpecialist.analyzeImage.useMutation();
  const generateModelMutation = trpc.ai3dSpecialist.generateModel.useMutation();
  const estimateCostsMutation = trpc.ai3dSpecialist.estimateCosts.useMutation();
  const getTroubleshootingMutation = trpc.ai3dSpecialist.getTroubleshootingGuide.useMutation();

  // Handle chat message
  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    const userMessage = chatMessage;
    setChatMessage("");
    setChatHistory((prev) => [...prev, { role: "user", message: userMessage }]);
    setLoading(true);

    try {
      const response = await chatMutation.mutateAsync({
        message: userMessage,
      });

      setChatHistory((prev) => [...prev, { role: "ai", message: response.response }]);
    } catch (error) {
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", message: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Handle image selection
  const handlePickImage = async () => {
    // TODO: Implement image picker for native platforms
    // For now, use a placeholder
    setSelectedImage("https://via.placeholder.com/400x300?text=Sample+Image");
  };

  // Handle image analysis
  const handleAnalyzeImage = async () => {
    if (!selectedImage) return;

    setLoading(true);
    try {
      const response = await analyzeImageMutation.mutateAsync({
        imageUrl: selectedImage,
        analysisType: analysisType,
      });

      setChatHistory((prev) => [
        ...prev,
        {
          role: "ai",
          message: `Analysis: ${response.analysis}\n\nFindings:\n${response.findings
            .map((f) => `• ${f.type}: ${f.description}`)
            .join("\n")}\n\nRecommendations:\n${response.recommendations.join("\n")}`,
        },
      ]);
    } catch (error) {
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", message: "Error analyzing image. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Handle model generation
  const handleGenerateModel = async () => {
    if (!modelDescription.trim()) return;

    setLoading(true);
    try {
      const response = await generateModelMutation.mutateAsync({
        description: modelDescription,
        format: exportFormat,
      });

      setChatHistory((prev) => [
        ...prev,
        {
          role: "ai",
          message: `Model generated! Download: ${response.downloadUrl}\n\nSpecifications: ${JSON.stringify(
            response.specifications
          )}`,
        },
      ]);
    } catch (error) {
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", message: "Error generating model. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer className="bg-background">
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-4 shadow-md">
          <View className="flex-row items-center gap-3">
            <Image
              source={{ uri: "https://assets.urmedia.io/avatars/ai-3d-specialist.png" }}
              className="w-12 h-12 rounded-full bg-indigo-500"
            />
            <View className="flex-1">
              <Text className="text-lg font-bold text-white">AI 3D Specialist</Text>
              <Text className="text-xs text-indigo-100">Senior Veteran Engineer</Text>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View className="flex-row bg-surface border-b border-border">
          {(["chat", "analyze", "generate", "learn"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-3 px-2 border-b-2",
                activeTab === tab ? "border-primary bg-indigo-50" : "border-transparent"
              )}
            >
              <Text
                className={cn(
                  "text-sm font-semibold text-center capitalize",
                  activeTab === tab ? "text-primary" : "text-muted"
                )}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <ScrollView ref={scrollViewRef} className="flex-1 p-4" onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}>
          {/* Chat Tab */}
          {activeTab === "chat" && (
            <View className="gap-4">
              <View className="bg-surface rounded-lg p-4 gap-3">
                {chatHistory.length === 0 && (
                  <Text className="text-muted text-center py-8">
                    👋 Hello! I&apos;m your AI 3D Specialist. Ask me anything about 3D printing, CAD design, or CNC machining.
                  </Text>
                )}

                {chatHistory.map((msg, idx) => (
                  <View
                    key={idx}
                    className={cn(
                      "rounded-lg p-3",
                      msg.role === "user"
                        ? "bg-primary ml-8 self-end"
                        : "bg-indigo-100 mr-8 self-start"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-sm",
                        msg.role === "user" ? "text-white" : "text-gray-900"
                      )}
                    >
                      {msg.message}
                    </Text>
                  </View>
                ))}

                {loading && (
                  <View className="flex-row items-center gap-2 mr-8 self-start">
                    <ActivityIndicator color={colors.primary} />
                    <Text className="text-muted text-sm">AI is thinking...</Text>
                  </View>
                )}
              </View>

              <View className="flex-row gap-2">
                <TextInput
                  value={chatMessage}
                  onChangeText={setChatMessage}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-foreground"
                  placeholderTextColor={colors.muted}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={handleSendMessage}
                  disabled={loading || !chatMessage.trim()}
                  className="bg-primary rounded-lg px-4 py-2 justify-center"
                >
                  <Text className="text-white font-semibold">Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Analyze Tab */}
          {activeTab === "analyze" && (
            <View className="gap-4">
              <View className="bg-surface rounded-lg p-4 gap-3">
                <Text className="font-bold text-foreground">Upload Image for Analysis</Text>

                {selectedImage && (
                  <Image source={{ uri: selectedImage }} className="w-full h-64 rounded-lg bg-gray-200" />
                )}

                {Platform.OS !== "web" && (
                  <TouchableOpacity
                    onPress={handlePickImage}
                    className="bg-indigo-100 border-2 border-dashed border-primary rounded-lg py-8 items-center"
                  >
                    <Text className="text-primary font-semibold">📸 Pick Image</Text>
                  </TouchableOpacity>
                )}
                {Platform.OS === "web" && (
                  <View className="bg-indigo-100 border-2 border-dashed border-primary rounded-lg py-8 items-center">
                    <Text className="text-primary font-semibold">📸 Image upload available on mobile</Text>
                  </View>
                )}

                <View className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">Analysis Type:</Text>
                  {(["damage", "space-to-3d", "material-identification"] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setAnalysisType(type)}
                      className={cn(
                        "p-3 rounded-lg border",
                        analysisType === type
                          ? "bg-primary border-primary"
                          : "bg-surface border-border"
                      )}
                    >
                      <Text
                        className={cn(
                          "font-semibold capitalize",
                          analysisType === type ? "text-white" : "text-foreground"
                        )}
                      >
                        {type.replace("-", " ")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={handleAnalyzeImage}
                  disabled={!selectedImage || loading}
                  className="bg-primary rounded-lg py-3 items-center"
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold">Analyze Image</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Generate Tab */}
          {activeTab === "generate" && (
            <View className="gap-4">
              <View className="bg-surface rounded-lg p-4 gap-3">
                <Text className="font-bold text-foreground">Generate 3D Model</Text>

                <TextInput
                  value={modelDescription}
                  onChangeText={setModelDescription}
                  placeholder="Describe what you want to create..."
                  multiline
                  numberOfLines={4}
                  className="bg-white border border-border rounded-lg px-3 py-2 text-foreground"
                  placeholderTextColor={colors.muted}
                />

                <View className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">Export Format:</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {(["stl", "obj", "step", "gcode", "dxf", "svg"] as const).map((format) => (
                      <TouchableOpacity
                        key={format}
                        onPress={() => setExportFormat(format)}
                        className={cn(
                          "px-3 py-2 rounded-lg border",
                          exportFormat === format
                            ? "bg-primary border-primary"
                            : "bg-surface border-border"
                        )}
                      >
                        <Text
                          className={cn(
                            "text-sm font-semibold uppercase",
                            exportFormat === format ? "text-white" : "text-foreground"
                          )}
                        >
                          {format}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleGenerateModel}
                  disabled={!modelDescription.trim() || loading}
                  className="bg-primary rounded-lg py-3 items-center"
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold">Generate Model</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Learn Tab */}
          {activeTab === "learn" && (
            <View className="gap-4">
              <View className="bg-indigo-50 rounded-lg p-4 gap-3 border border-indigo-200">
                <Text className="font-bold text-indigo-900">📚 Learning Resources</Text>
                <Text className="text-sm text-indigo-800">
                  Master 3D printing, CAD design, and CNC machining with our comprehensive guides and practice tests.
                </Text>

                <View className="gap-2 mt-2">
                  {[
                    "3D Printing Fundamentals",
                    "CAD Design Basics",
                    "CNC Machine Programming",
                    "Material Science",
                    "Safety & Best Practices",
                  ].map((topic) => (
                    <TouchableOpacity
                      key={topic}
                      className="bg-white border border-indigo-200 rounded-lg p-3 flex-row justify-between items-center"
                    >
                      <Text className="font-semibold text-foreground">{topic}</Text>
                      <Text className="text-primary">→</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}
