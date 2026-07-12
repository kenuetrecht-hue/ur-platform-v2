/**
 * Content Creator Workspace
 * Integrated workspace where creators and their AI helpers work together
 * AI helps post content, engage with followers, and manage 24/7
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { cn } from "@/lib/utils";
import { useColors } from "@/hooks/use-colors";

// ============================================================================
// TYPES
// ============================================================================

interface ScheduledPost {
  id: string;
  content: string;
  scheduledTime: Date;
  status: "scheduled" | "posted" | "failed";
  aiGenerated: boolean;
}

interface FollowerEngagement {
  id: string;
  type: "comment" | "message" | "like";
  author: string;
  content: string;
  timestamp: Date;
  aiResponded: boolean;
}

// ============================================================================
// CREATOR WORKSPACE COMPONENT
// ============================================================================

export default function CreatorWorkspace() {
  const colors = useColors();
  const [selectedTab, setSelectedTab] = useState<"compose" | "schedule" | "engagement" | "ai">("compose");
  const [contentText, setContentText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const scheduledPosts: ScheduledPost[] = [
    {
      id: "1",
      content: "Check out my latest blog post on productivity tips!",
      scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      status: "scheduled",
      aiGenerated: false,
    },
    {
      id: "2",
      content: "New video tutorial available now! Learn how to...",
      scheduledTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
      status: "scheduled",
      aiGenerated: true,
    },
    {
      id: "3",
      content: "Thanks for 15K followers! Here's a special offer...",
      scheduledTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: "posted",
      aiGenerated: true,
    },
  ];

  const followerEngagements: FollowerEngagement[] = [
    {
      id: "1",
      type: "comment",
      author: "john_doe",
      content: "This is amazing! How did you do this?",
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      aiResponded: true,
    },
    {
      id: "2",
      type: "message",
      author: "jane_smith",
      content: "Can you help me with my project?",
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      aiResponded: false,
    },
    {
      id: "3",
      type: "like",
      author: "mike_wilson",
      content: "Liked your post",
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      aiResponded: false,
    },
  ];

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handlePostContent = () => {
    if (!contentText.trim()) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setContentText("");
      alert("Content posted successfully!");
    }, 1000);
  };

  const handleScheduleContent = () => {
    if (!contentText.trim()) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setContentText("");
      alert("Content scheduled successfully!");
    }, 1000);
  };

  const handleAIGenerateContent = () => {
    setIsLoading(true);
    setTimeout(() => {
      setContentText(
        "🚀 Exciting news! I just launched a new project that will help you..."
      );
      setIsLoading(false);
    }, 1500);
  };

  // ============================================================================
  // RENDER SECTIONS
  // ============================================================================

  const renderComposeTab = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="text-lg font-bold text-foreground mb-3">
        Create New Content
      </Text>

      {/* Content Editor */}
      <View className="bg-surface rounded-lg border border-border p-4 mb-4">
        <TextInput
          className="text-foreground text-base min-h-32"
          placeholder="Write your content here..."
          placeholderTextColor={colors.muted}
          value={contentText}
          onChangeText={setContentText}
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* AI Suggestions */}
      <View className="bg-primary bg-opacity-10 border border-primary rounded-lg p-4 mb-4">
        <Text className="text-primary font-bold mb-2">✨ AI Suggestions</Text>
        <Text className="text-foreground text-sm mb-3">
          Your AI helper can generate content ideas, improve your writing, or
          suggest hashtags.
        </Text>
        <TouchableOpacity
          onPress={handleAIGenerateContent}
          disabled={isLoading}
          className="bg-primary px-4 py-2 rounded-lg"
        >
          <Text className="text-background font-semibold text-center">
            {isLoading ? "Generating..." : "Generate with AI"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View className="gap-3">
        <TouchableOpacity
          onPress={handlePostContent}
          disabled={isLoading || !contentText.trim()}
          className="bg-primary px-6 py-4 rounded-lg"
        >
          <Text className="text-background font-bold text-center">
            {isLoading ? "Posting..." : "Post Now"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleScheduleContent}
          disabled={isLoading || !contentText.trim()}
          className="bg-surface border border-border px-6 py-4 rounded-lg"
        >
          <Text className="text-foreground font-bold text-center">
            Schedule Post
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderScheduleTab = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="text-lg font-bold text-foreground mb-3">
        Scheduled Posts
      </Text>

      {scheduledPosts.map((post) => (
        <View
          key={post.id}
          className="bg-surface rounded-lg border border-border p-4 mb-3"
        >
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1">
              <Text className="text-foreground font-semibold">
                {post.content.substring(0, 50)}...
              </Text>
              <Text className="text-muted text-sm mt-1">
                {post.scheduledTime.toLocaleString()}
              </Text>
            </View>
            <View
              className={cn(
                "px-2 py-1 rounded",
                post.status === "posted"
                  ? "bg-success bg-opacity-20"
                  : post.status === "scheduled"
                    ? "bg-primary bg-opacity-20"
                    : "bg-error bg-opacity-20"
              )}
            >
              <Text
                className={cn(
                  "text-xs font-semibold",
                  post.status === "posted"
                    ? "text-success"
                    : post.status === "scheduled"
                      ? "text-primary"
                      : "text-error"
                )}
              >
                {post.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {post.aiGenerated && (
            <View className="flex-row items-center gap-1 mt-2">
              <Text className="text-primary text-xs">✨ AI Generated</Text>
            </View>
          )}
        </View>
      ))}

      <TouchableOpacity className="bg-primary px-6 py-4 rounded-lg mt-4">
        <Text className="text-background font-bold text-center">
          + Schedule New Post
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderEngagementTab = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="text-lg font-bold text-foreground mb-3">
        Follower Engagement
      </Text>

      <View className="bg-primary bg-opacity-10 border border-primary rounded-lg p-3 mb-4">
        <Text className="text-primary font-semibold text-sm">
          🤖 Your AI helper is monitoring engagement 24/7
        </Text>
      </View>

      {followerEngagements.map((engagement) => (
        <View
          key={engagement.id}
          className="bg-surface rounded-lg border border-border p-4 mb-3"
        >
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1">
              <Text className="text-foreground font-semibold">
                @{engagement.author}
              </Text>
              <Text className="text-muted text-xs mt-1">
                {engagement.type.toUpperCase()} •{" "}
                {engagement.timestamp.toLocaleTimeString()}
              </Text>
            </View>
            {engagement.aiResponded && (
              <View className="bg-success bg-opacity-20 px-2 py-1 rounded">
                <Text className="text-success text-xs font-semibold">
                  ✓ Responded
                </Text>
              </View>
            )}
          </View>

          <Text className="text-foreground text-sm">{engagement.content}</Text>

          {!engagement.aiResponded && (
            <TouchableOpacity className="mt-3 bg-primary bg-opacity-20 px-3 py-2 rounded">
              <Text className="text-primary text-xs font-semibold text-center">
                Let AI Respond
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );

  const renderAITab = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="text-lg font-bold text-foreground mb-3">
        AI Helper Status
      </Text>

      {/* AI Status Card */}
      <View className="bg-success bg-opacity-10 border border-success rounded-lg p-4 mb-4">
        <View className="flex-row items-center gap-2 mb-2">
          <Text className="text-2xl">🤖</Text>
          <View className="flex-1">
            <Text className="text-foreground font-bold">
              Content Helper AI
            </Text>
            <Text className="text-success text-sm">● Active & Working</Text>
          </View>
        </View>
      </View>

      {/* AI Statistics */}
      <Text className="text-foreground font-semibold mb-3">
        Today&apos;s AI Activity
      </Text>

      {[
        { label: "Posts Scheduled", value: "5" },
        { label: "Responses Generated", value: "12" },
        { label: "Engagement Tracked", value: "34" },
        { label: "Content Suggestions", value: "8" },
      ].map((stat, idx) => (
        <View
          key={idx}
          className="flex-row justify-between items-center bg-surface rounded-lg p-3 border border-border mb-2"
        >
          <Text className="text-foreground">{stat.label}</Text>
          <Text className="text-primary font-bold">{stat.value}</Text>
        </View>
      ))}

      {/* AI Capabilities */}
      <Text className="text-foreground font-semibold mb-3 mt-6">
        What Your AI Does
      </Text>

      {[
        "Posts content on your schedule",
        "Responds to comments & messages",
        "Tracks engagement metrics",
        "Suggests content ideas",
        "Optimizes posting times",
        "Analyzes follower behavior",
      ].map((capability, idx) => (
        <View
          key={idx}
          className="flex-row items-center gap-2 bg-surface rounded-lg p-3 border border-border mb-2"
        >
          <Text className="text-success">✓</Text>
          <Text className="text-foreground">{capability}</Text>
        </View>
      ))}

      <Text className="text-muted text-xs mt-4 text-center">
        All AI features are FREE for creators
      </Text>
    </ScrollView>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ScreenContainer className="bg-background">
      <View className="flex-1 flex-col">
        {/* Header */}
        <View className="border-b border-border p-4">
          <Text className="text-2xl font-bold text-foreground">
            Creator Workspace
          </Text>
          <Text className="text-muted text-sm mt-1">
            Create, schedule, and engage with your AI helper
          </Text>
        </View>

        {/* Tab Navigation */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="border-b border-border"
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {(
            [
              { key: "compose", label: "Compose" },
              { key: "schedule", label: "Schedule" },
              { key: "engagement", label: "Engagement" },
              { key: "ai", label: "AI Helper" },
            ] as const
          ).map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setSelectedTab(tab.key)}
              className={cn(
                "py-3 px-4 border-b-2 mr-2",
                selectedTab === tab.key
                  ? "border-primary"
                  : "border-transparent"
              )}
            >
              <Text
                className={cn(
                  "font-semibold",
                  selectedTab === tab.key ? "text-primary" : "text-muted"
                )}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Content */}
        {selectedTab === "compose" && renderComposeTab()}
        {selectedTab === "schedule" && renderScheduleTab()}
        {selectedTab === "engagement" && renderEngagementTab()}
        {selectedTab === "ai" && renderAITab()}
      </View>
    </ScreenContainer>
  );
}
