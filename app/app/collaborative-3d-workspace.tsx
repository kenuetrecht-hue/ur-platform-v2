import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Dimensions,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface AIAgent {
  id: string;
  name: string;
  field: string;
  isActive: boolean;
  position: { x: number; y: number; z: number };
  currentTask: string;
  isSpeaking: boolean;
}

interface Object3D {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number; z: number };
  createdBy: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  senderType: "user" | "ai";
  text: string;
  timestamp: Date;
  aiAgent?: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_AGENTS: AIAgent[] = [
  {
    id: "electrician-01",
    name: "AI Electrician",
    field: "Electrical",
    isActive: false,
    position: { x: -2, y: 0, z: 0 },
    currentTask: "Idle",
    isSpeaking: false,
  },
  {
    id: "plumber-01",
    name: "AI Plumber",
    field: "Plumbing",
    isActive: false,
    position: { x: 2, y: 0, z: 0 },
    currentTask: "Idle",
    isSpeaking: false,
  },
  {
    id: "roofing-01",
    name: "AI Roofing",
    field: "Roofing",
    isActive: false,
    position: { x: 0, y: 2, z: 0 },
    currentTask: "Idle",
    isSpeaking: false,
  },
];

const MOCK_OBJECTS: Object3D[] = [
  {
    id: "obj-1",
    type: "foundation",
    name: "Foundation",
    position: { x: 0, y: -1, z: 0 },
    createdBy: "user",
  },
  {
    id: "obj-2",
    type: "walls",
    name: "Walls",
    position: { x: 0, y: 0, z: 0 },
    createdBy: "user",
  },
  {
    id: "obj-3",
    type: "roof",
    name: "Roof",
    position: { x: 0, y: 2, z: 0 },
    createdBy: "roofing-01",
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function CollaborativeWorkspace() {
  const colors = useColors();
  const [agents, setAgents] = useState<AIAgent[]>(MOCK_AGENTS);
  const [objects, setObjects] = useState<Object3D[]>(MOCK_OBJECTS);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      sender: "System",
      senderType: "ai",
      text: "Welcome to the Collaborative 3D Workspace. Add AI specialists to get started.",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const toggleAgent = (agentId: string) => {
    setSelectedAgents((prev) => {
      if (prev.includes(agentId)) {
        return prev.filter((id) => id !== agentId);
      } else {
        return [...prev, agentId];
      }
    });

    // Update agent active status
    setAgents((prev) =>
      prev.map((agent) =>
        agent.id === agentId ? { ...agent, isActive: !agent.isActive } : agent
      )
    );

    // Add message
    const agent = agents.find((a) => a.id === agentId);
    if (agent) {
      addMessage(
        "system",
        `${agent.name} has joined the workspace.`,
        "ai",
        agent.id
      );
    }
  };

  const addMessage = (
    id: string,
    text: string,
    type: "user" | "ai",
    aiAgent?: string
  ) => {
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: type === "user" ? "You" : aiAgent || "System",
      senderType: type,
      text,
      timestamp: new Date(),
      aiAgent,
    };
    setMessages((prev) => [...prev, message]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // Add user message
    addMessage(`user-${Date.now()}`, inputText, "user");
    setInputText("");
    setIsLoading(true);

    // Simulate AI responses
    setTimeout(() => {
      if (selectedAgents.length > 0) {
        selectedAgents.forEach((agentId) => {
          const agent = agents.find((a) => a.id === agentId);
          if (agent) {
            const responses: Record<string, string> = {
              "electrician-01": `I can help with electrical systems. For your request, I recommend 200-amp service with proper grounding.`,
              "plumber-01": `I can assist with plumbing. I suggest copper piping with proper slope for drainage.`,
              "roofing-01": `I can design the roof. Recommend 30-degree pitch with metal roofing for durability.`,
            };
            addMessage(
              `ai-${Date.now()}`,
              responses[agentId] || "I'm ready to help.",
              "ai",
              agent.id
            );
          }
        });
      } else {
        addMessage(
          `ai-${Date.now()}`,
          "Please select at least one AI specialist to collaborate with.",
          "ai"
        );
      }
      setIsLoading(false);
    }, 500);
  };

  const addObject = (type: string) => {
    const newObject: Object3D = {
      id: `obj-${Date.now()}`,
      type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      position: {
        x: Math.random() * 4 - 2,
        y: Math.random() * 4 - 2,
        z: Math.random() * 4 - 2,
      },
      createdBy: "user",
    };
    setObjects((prev) => [...prev, newObject]);
    addMessage(
      `system-${Date.now()}`,
      `Added ${newObject.name} to the workspace.`,
      "ai"
    );
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  const isWeb = Platform.OS === "web";
  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;

  return (
    <ScreenContainer className="bg-background">
      {isWeb ? (
        // WEB LAYOUT: 3D on left, chat on right
        <View className="flex-1 flex-row gap-4 p-4">
          {/* 3D Viewport */}
          <View
            className="flex-1 rounded-lg border border-border bg-surface"
            style={{ minHeight: 500 }}
          >
            <View className="flex-1 items-center justify-center p-4">
              <Text className="text-lg font-semibold text-foreground mb-4">
                3D Workspace
              </Text>

              {/* 3D Placeholder */}
              <View className="w-full h-64 bg-background rounded-lg border-2 border-dashed border-border items-center justify-center mb-4">
                <Text className="text-muted text-center">
                  3D Scene Rendering{"\n"}(Babylon.js/Three.js)
                </Text>
              </View>

              {/* Objects List */}
              <View className="w-full">
                <Text className="text-sm font-semibold text-foreground mb-2">
                  Objects in Scene ({objects.length})
                </Text>
                <ScrollView className="h-32 border border-border rounded-lg p-2">
                  {objects.map((obj) => (
                    <View
                      key={obj.id}
                      className="flex-row justify-between items-center py-2 px-2 border-b border-border"
                    >
                      <Text className="text-xs text-foreground">
                        {obj.name}
                      </Text>
                      <Text className="text-xs text-muted">
                        {obj.type}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>

              {/* Add Object Buttons */}
              <View className="flex-row gap-2 mt-4 flex-wrap">
                {["box", "sphere", "cylinder"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => addObject(type)}
                    className="px-3 py-2 bg-primary rounded-lg"
                  >
                    <Text className="text-xs font-semibold text-background">
                      Add {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Chat & Controls */}
          <View className="w-80 rounded-lg border border-border bg-surface flex-col">
            {/* AI Agents */}
            <View className="p-4 border-b border-border">
              <Text className="text-sm font-semibold text-foreground mb-3">
                AI Specialists
              </Text>
              {agents.map((agent) => (
                <TouchableOpacity
                  key={agent.id}
                  onPress={() => toggleAgent(agent.id)}
                  className={cn(
                    "p-3 rounded-lg mb-2 border-2",
                    selectedAgents.includes(agent.id)
                      ? "bg-primary border-primary"
                      : "bg-background border-border"
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm font-semibold",
                      selectedAgents.includes(agent.id)
                        ? "text-background"
                        : "text-foreground"
                    )}
                  >
                    {agent.name}
                  </Text>
                  <Text
                    className={cn(
                      "text-xs",
                      selectedAgents.includes(agent.id)
                        ? "text-background opacity-80"
                        : "text-muted"
                    )}
                  >
                    {agent.field}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Chat Messages */}
            <ScrollView
              ref={scrollViewRef}
              className="flex-1 p-4"
              onContentSizeChange={() =>
                scrollViewRef.current?.scrollToEnd({ animated: true })
              }
            >
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  className={cn(
                    "mb-3 p-3 rounded-lg max-w-xs",
                    msg.senderType === "user"
                      ? "self-end bg-primary"
                      : "self-start bg-background border border-border"
                  )}
                >
                  <Text
                    className={cn(
                      "text-xs font-semibold mb-1",
                      msg.senderType === "user"
                        ? "text-background"
                        : "text-foreground"
                    )}
                  >
                    {msg.sender}
                  </Text>
                  <Text
                    className={cn(
                      "text-sm",
                      msg.senderType === "user"
                        ? "text-background"
                        : "text-foreground"
                    )}
                  >
                    {msg.text}
                  </Text>
                </View>
              ))}
              {isLoading && (
                <View className="self-start mb-3">
                  <ActivityIndicator color={colors.primary} />
                </View>
              )}
            </ScrollView>

            {/* Input */}
            <View className="p-4 border-t border-border flex-row gap-2">
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask the AIs..."
                placeholderTextColor={colors.muted}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={isLoading}
                className="px-4 py-2 bg-primary rounded-lg items-center justify-center"
              >
                <Text className="text-sm font-semibold text-background">
                  Send
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        // MOBILE LAYOUT: Stacked
        <View className="flex-1">
          {/* 3D Viewport */}
          <View className="h-64 rounded-lg border border-border bg-surface mb-4 items-center justify-center">
            <Text className="text-sm text-muted">
              3D Scene{"\n"}(Tap web for full view)
            </Text>
          </View>

          {/* AI Agents */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-foreground mb-2">
              AI Specialists
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {agents.map((agent) => (
                <TouchableOpacity
                  key={agent.id}
                  onPress={() => toggleAgent(agent.id)}
                  className={cn(
                    "p-3 rounded-lg mr-2 border-2 min-w-max",
                    selectedAgents.includes(agent.id)
                      ? "bg-primary border-primary"
                      : "bg-background border-border"
                  )}
                >
                  <Text
                    className={cn(
                      "text-xs font-semibold",
                      selectedAgents.includes(agent.id)
                        ? "text-background"
                        : "text-foreground"
                    )}
                  >
                    {agent.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Chat */}
          <View className="flex-1 rounded-lg border border-border bg-surface flex-col">
            <ScrollView
              ref={scrollViewRef}
              className="flex-1 p-3"
              onContentSizeChange={() =>
                scrollViewRef.current?.scrollToEnd({ animated: true })
              }
            >
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  className={cn(
                    "mb-2 p-2 rounded-lg max-w-xs",
                    msg.senderType === "user"
                      ? "self-end bg-primary"
                      : "self-start bg-background border border-border"
                  )}
                >
                  <Text
                    className={cn(
                      "text-xs font-semibold mb-1",
                      msg.senderType === "user"
                        ? "text-background"
                        : "text-foreground"
                    )}
                  >
                    {msg.sender}
                  </Text>
                  <Text
                    className={cn(
                      "text-xs",
                      msg.senderType === "user"
                        ? "text-background"
                        : "text-foreground"
                    )}
                  >
                    {msg.text}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Input */}
            <View className="p-3 border-t border-border flex-row gap-2">
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask..."
                placeholderTextColor={colors.muted}
                className="flex-1 px-2 py-1 bg-background border border-border rounded text-xs text-foreground"
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={isLoading}
                className="px-3 py-1 bg-primary rounded items-center justify-center"
              >
                <Text className="text-xs font-semibold text-background">
                  Send
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}
