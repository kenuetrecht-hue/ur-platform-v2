/**
 * Creator Profile & Dashboard
 * Dashboard for content creators showing stats, earnings, and AI helper features
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { cn } from "@/lib/utils";
import { useColors } from "@/hooks/use-colors";

// ============================================================================
// TYPES
// ============================================================================

interface CreatorStats {
  followers: number;
  totalEarnings: number;
  todayEarnings: number;
  contentCreated: number;
  engagementRate: number;
}

interface AIHelperStatus {
  name: string;
  status: "active" | "inactive";
  tasksCompleted: number;
  engagementScore: number;
}

// ============================================================================
// CREATOR PROFILE DASHBOARD COMPONENT
// ============================================================================

export default function CreatorProfileDashboard() {
  const colors = useColors();
  const [selectedTab, setSelectedTab] = useState<"overview" | "earnings" | "content" | "ai">("overview");

  const creatorStats: CreatorStats = {
    followers: 15234,
    totalEarnings: 3456.78,
    todayEarnings: 234.56,
    contentCreated: 342,
    engagementRate: 8.4,
  };

  const aiHelpers: AIHelperStatus[] = [
    {
      name: "Content Helper AI",
      status: "active",
      tasksCompleted: 1234,
      engagementScore: 92,
    },
    {
      name: "Voice Assistant",
      status: "active",
      tasksCompleted: 456,
      engagementScore: 88,
    },
  ];

  // ============================================================================
  // RENDER SECTIONS
  // ============================================================================

  const renderOverviewTab = () => (
    <ScrollView className="flex-1 p-4">
      {/* Stats Cards */}
      <View className="gap-3 mb-6">
        {/* Followers */}
        <View className="bg-surface rounded-lg p-4 border border-border">
          <Text className="text-muted text-sm">Followers</Text>
          <Text className="text-3xl font-bold text-foreground mt-1">
            {creatorStats.followers.toLocaleString()}
          </Text>
          <Text className="text-success text-xs mt-1">↑ 234 this week</Text>
        </View>

        {/* Today's Earnings */}
        <View className="bg-surface rounded-lg p-4 border border-border">
          <Text className="text-muted text-sm">Today&apos;s Earnings</Text>
          <Text className="text-3xl font-bold text-primary mt-1">
            ${creatorStats.todayEarnings.toFixed(2)}
          </Text>
          <Text className="text-muted text-xs mt-1">
            Paid daily at 11:59 PM
          </Text>
        </View>

        {/* Engagement Rate */}
        <View className="bg-surface rounded-lg p-4 border border-border">
          <Text className="text-muted text-sm">Engagement Rate</Text>
          <Text className="text-3xl font-bold text-foreground mt-1">
            {creatorStats.engagementRate}%
          </Text>
          <Text className="text-success text-xs mt-1">↑ 0.5% from last week</Text>
        </View>

        {/* Content Created */}
        <View className="bg-surface rounded-lg p-4 border border-border">
          <Text className="text-muted text-sm">Content Created</Text>
          <Text className="text-3xl font-bold text-foreground mt-1">
            {creatorStats.contentCreated}
          </Text>
          <Text className="text-muted text-xs mt-1">
            With AI assistance
          </Text>
        </View>
      </View>

      {/* AI Helper Status */}
      <View>
        <Text className="text-lg font-bold text-foreground mb-3">
          Your AI Helpers (Free)
        </Text>
        {aiHelpers.map((helper, idx) => (
          <View
            key={idx}
            className="bg-surface rounded-lg p-4 border border-border mb-3"
          >
            <View className="flex-row justify-between items-start mb-2">
              <Text className="text-foreground font-semibold">
                {helper.name}
              </Text>
              <View
                className={cn(
                  "px-2 py-1 rounded",
                  helper.status === "active"
                    ? "bg-success bg-opacity-20"
                    : "bg-muted bg-opacity-20"
                )}
              >
                <Text
                  className={cn(
                    "text-xs font-semibold",
                    helper.status === "active" ? "text-success" : "text-muted"
                  )}
                >
                  {helper.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-muted text-sm">
                Tasks: {helper.tasksCompleted}
              </Text>
              <Text className="text-muted text-sm">
                Engagement: {helper.engagementScore}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderEarningsTab = () => (
    <ScrollView className="flex-1 p-4">
      <View className="bg-surface rounded-lg p-6 border border-border mb-6">
        <Text className="text-muted text-sm">Total Earnings</Text>
        <Text className="text-4xl font-bold text-primary mt-2">
          ${creatorStats.totalEarnings.toFixed(2)}
        </Text>
        <Text className="text-muted text-sm mt-2">
          Payments processed daily at 11:59 PM
        </Text>
      </View>

      <Text className="text-lg font-bold text-foreground mb-3">
        Pricing Settings
      </Text>

      <View className="bg-surface rounded-lg p-4 border border-border mb-3">
        <Text className="text-foreground font-semibold mb-2">
          Set Your Rates
        </Text>
        <View className="gap-3">
          {["Per Minute", "Per Hour", "Per Week", "Per Month"].map(
            (period) => (
              <View key={period} className="flex-row items-center gap-2">
                <Text className="text-muted flex-1">{period}</Text>
                <TextInput
                  className="bg-background border border-border rounded px-3 py-2 w-24 text-foreground"
                  placeholder="$0.00"
                  keyboardType="decimal-pad"
                />
              </View>
            )
          )}
        </View>
      </View>

      <Text className="text-lg font-bold text-foreground mb-3 mt-4">
        Recent Earnings
      </Text>

      {[
        { date: "Today", amount: 234.56 },
        { date: "Yesterday", amount: 189.23 },
        { date: "Last 7 days", amount: 1456.78 },
        { date: "Last 30 days", amount: 3456.78 },
      ].map((earning, idx) => (
        <View
          key={idx}
          className="flex-row justify-between items-center bg-surface rounded-lg p-4 border border-border mb-2"
        >
          <Text className="text-foreground">{earning.date}</Text>
          <Text className="text-primary font-bold">
            ${earning.amount.toFixed(2)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderContentTab = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="text-lg font-bold text-foreground mb-3">
        Content Management
      </Text>

      <View className="gap-3 mb-6">
        <TouchableOpacity className="bg-primary rounded-lg p-4">
          <Text className="text-background font-bold text-center">
            + Create New Content
          </Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-surface border border-border rounded-lg p-4">
          <Text className="text-foreground font-bold text-center">
            Schedule Content
          </Text>
        </TouchableOpacity>
      </View>

      <Text className="text-lg font-bold text-foreground mb-3">
        Recent Content
      </Text>

      {[
        { title: "My First Blog Post", views: 1234, likes: 89 },
        { title: "Tutorial Video", views: 5678, likes: 456 },
        { title: "Behind the Scenes", views: 2345, likes: 234 },
      ].map((content, idx) => (
        <View
          key={idx}
          className="bg-surface rounded-lg p-4 border border-border mb-3"
        >
          <Text className="text-foreground font-semibold">{content.title}</Text>
          <View className="flex-row gap-4 mt-2">
            <Text className="text-muted text-sm">👁️ {content.views}</Text>
            <Text className="text-muted text-sm">❤️ {content.likes}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderAITab = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="text-lg font-bold text-foreground mb-3">
        AI Helper Settings
      </Text>

      {/* Active AI Helpers */}
      <View className="mb-6">
        <Text className="text-foreground font-semibold mb-3">
          Active Helpers (All Free)
        </Text>
        {aiHelpers.map((helper, idx) => (
          <View
            key={idx}
            className="bg-success bg-opacity-10 border border-success rounded-lg p-4 mb-3"
          >
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="text-foreground font-bold">
                  {helper.name}
                </Text>
                <Text className="text-success text-sm mt-1">
                  ✓ Active & Helping 24/7
                </Text>
              </View>
              <TouchableOpacity className="bg-success bg-opacity-20 px-3 py-1 rounded">
                <Text className="text-success text-xs font-semibold">
                  Manage
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* AI Capabilities */}
      <Text className="text-foreground font-semibold mb-3">
        What Your AI Helpers Do
      </Text>

      {[
        {
          title: "24/7 Content Posting",
          desc: "Automatically posts your content on schedule",
        },
        {
          title: "Follower Engagement",
          desc: "Responds to comments and messages",
        },
        {
          title: "Content Scheduling",
          desc: "Plans and schedules your posts",
        },
        {
          title: "Analytics Tracking",
          desc: "Monitors performance and engagement",
        },
        {
          title: "Auto-Responses",
          desc: "Handles common questions",
        },
      ].map((capability, idx) => (
        <View
          key={idx}
          className="bg-surface rounded-lg p-4 border border-border mb-3"
        >
          <Text className="text-foreground font-semibold">
            {capability.title}
          </Text>
          <Text className="text-muted text-sm mt-1">{capability.desc}</Text>
        </View>
      ))}
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
            Creator Dashboard
          </Text>
          <Text className="text-muted text-sm mt-1">
            Your profile and earnings
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
              { key: "overview", label: "Overview" },
              { key: "earnings", label: "Earnings" },
              { key: "content", label: "Content" },
              { key: "ai", label: "AI Helpers" },
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
        {selectedTab === "overview" && renderOverviewTab()}
        {selectedTab === "earnings" && renderEarningsTab()}
        {selectedTab === "content" && renderContentTab()}
        {selectedTab === "ai" && renderAITab()}
      </View>
    </ScreenContainer>
  );
}
