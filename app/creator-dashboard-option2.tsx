import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

interface DashboardStats {
  totalViews: number;
  totalSubscribers: number;
  monthlyEarnings: number;
  totalEarnings: number;
  conversionRate: number;
  avgSessionLength: number;
}

interface Content {
  id: string;
  title: string;
  type: "video" | "article" | "tutorial";
  views: number;
  likes: number;
  createdAt: string;
  status: "published" | "draft" | "scheduled";
}

const mockStats: DashboardStats = {
  totalViews: 15420,
  totalSubscribers: 342,
  monthlyEarnings: 1250.75,
  totalEarnings: 5432.1,
  conversionRate: 8.5,
  avgSessionLength: 12.3,
};

const mockContent: Content[] = [
  {
    id: "1",
    title: "Digital Art Masterclass",
    type: "video",
    views: 2340,
    likes: 156,
    createdAt: "2024-06-01",
    status: "published",
  },
  {
    id: "2",
    title: "My Creative Process",
    type: "article",
    views: 1205,
    likes: 89,
    createdAt: "2024-05-28",
    status: "published",
  },
  {
    id: "3",
    title: "Advanced Techniques",
    type: "tutorial",
    views: 0,
    likes: 0,
    createdAt: "2024-06-02",
    status: "draft",
  },
];

export default function CreatorDashboardOption2() {
  const router = useRouter();
  const colors = useColors();
  const [stats] = useState<DashboardStats>(mockStats);
  const [content, setContent] = useState<Content[]>(mockContent);
  const [selectedTab, setSelectedTab] = useState<"overview" | "content" | "analytics">("overview");

  const handleUploadContent = () => {
    Alert.alert("Upload Content", "Content upload feature coming soon");
  };

  const handleDeleteContent = (id: string) => {
    Alert.alert(
      "Delete Content",
      "Are you sure you want to delete this content?",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Delete",
          onPress: () => {
            setContent(content.filter((c) => c.id !== id));
            Alert.alert("Success", "Content deleted successfully");
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "text-success";
      case "draft":
        return "text-warning";
      case "scheduled":
        return "text-primary";
      default:
        return "text-muted";
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 p-6 gap-6">
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <Text className="text-3xl font-bold text-foreground">Dashboard</Text>
            <TouchableOpacity
              onPress={() => router.push("/creator-profile-page")}
              className="bg-surface border border-border rounded-lg px-4 py-2"
            >
              <Text className="text-foreground font-semibold">Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Tab Navigation */}
          <View className="flex-row gap-2 bg-surface rounded-lg p-1">
            {["overview", "content", "analytics"].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setSelectedTab(tab as any)}
                className={`flex-1 py-2 px-3 rounded-lg ${
                  selectedTab === tab ? "bg-primary" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-sm font-semibold text-center ${
                    selectedTab === tab ? "text-background" : "text-foreground"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Overview Tab */}
          {selectedTab === "overview" && (
            <View className="gap-4">
              {/* Stats Grid */}
              <View className="gap-3">
                <View className="flex-row gap-3">
                  <View className="flex-1 bg-surface rounded-lg p-4 gap-2">
                    <Text className="text-xs text-muted uppercase">Total Views</Text>
                    <Text className="text-2xl font-bold text-foreground">
                      {stats.totalViews.toLocaleString()}
                    </Text>
                  </View>
                  <View className="flex-1 bg-surface rounded-lg p-4 gap-2">
                    <Text className="text-xs text-muted uppercase">Subscribers</Text>
                    <Text className="text-2xl font-bold text-primary">
                      {stats.totalSubscribers}
                    </Text>
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1 bg-surface rounded-lg p-4 gap-2">
                    <Text className="text-xs text-muted uppercase">This Month</Text>
                    <Text className="text-2xl font-bold text-success">
                      ${stats.monthlyEarnings.toFixed(2)}
                    </Text>
                  </View>
                  <View className="flex-1 bg-surface rounded-lg p-4 gap-2">
                    <Text className="text-xs text-muted uppercase">Total Earned</Text>
                    <Text className="text-2xl font-bold text-foreground">
                      ${stats.totalEarnings.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Quick Actions */}
              <View className="gap-2">
                <TouchableOpacity
                  onPress={handleUploadContent}
                  className="bg-primary rounded-lg p-4 items-center"
                >
                  <Text className="text-background font-semibold text-base">+ Upload New Content</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => Alert.alert("Subscribers", "Subscriber list coming soon")}
                  className="bg-surface border border-border rounded-lg p-4 items-center"
                >
                  <Text className="text-foreground font-semibold text-base">View Subscribers</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Content Tab */}
          {selectedTab === "content" && (
            <View className="gap-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-foreground">Your Content</Text>
                <TouchableOpacity onPress={handleUploadContent} className="bg-primary rounded-lg px-3 py-1">
                  <Text className="text-background text-sm font-semibold">+ Add</Text>
                </TouchableOpacity>
              </View>

              {content.length === 0 ? (
                <View className="bg-surface rounded-lg p-6 items-center gap-2">
                  <Text className="text-2xl">📝</Text>
                  <Text className="text-foreground font-semibold">No content yet</Text>
                  <Text className="text-muted text-sm">Upload your first content to get started</Text>
                </View>
              ) : (
                content.map((item) => (
                  <View key={item.id} className="bg-surface rounded-lg p-4 gap-3">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 gap-1">
                        <Text className="text-base font-semibold text-foreground">{item.title}</Text>
                        <View className="flex-row gap-2 items-center">
                          <Text className="text-xs text-muted">{item.type}</Text>
                          <Text className={`text-xs font-semibold ${getStatusColor(item.status)}`}>
                            {item.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteContent(item.id)}
                        className="p-2"
                      >
                        <Text className="text-lg">🗑️</Text>
                      </TouchableOpacity>
                    </View>
                    <View className="flex-row gap-4 pt-2 border-t border-border">
                      <View className="flex-1">
                        <Text className="text-xs text-muted">Views</Text>
                        <Text className="text-base font-bold text-foreground">{item.views}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs text-muted">Likes</Text>
                        <Text className="text-base font-bold text-foreground">{item.likes}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs text-muted">Date</Text>
                        <Text className="text-base font-bold text-foreground">{item.createdAt}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Analytics Tab */}
          {selectedTab === "analytics" && (
            <View className="gap-4">
              <View className="bg-surface rounded-lg p-4 gap-3">
                <View className="gap-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-muted">Conversion Rate</Text>
                    <Text className="text-lg font-bold text-primary">{stats.conversionRate}%</Text>
                  </View>
                  <View className="h-2 bg-border rounded-full overflow-hidden">
                    <View
                      className="h-full bg-primary"
                      style={{ width: `${stats.conversionRate * 10}%` }}
                    />
                  </View>
                </View>
              </View>

              <View className="bg-surface rounded-lg p-4 gap-3">
                <View className="gap-2">
                  <Text className="text-sm text-muted">Avg Session Length</Text>
                  <Text className="text-2xl font-bold text-foreground">
                    {stats.avgSessionLength} min
                  </Text>
                </View>
              </View>

              <View className="bg-surface rounded-lg p-4 gap-3">
                <Text className="text-base font-semibold text-foreground">Performance Tips</Text>
                <View className="gap-2">
                  <Text className="text-sm text-muted">• Post consistently to maintain engagement</Text>
                  <Text className="text-sm text-muted">• Engage with your subscribers in comments</Text>
                  <Text className="text-sm text-muted">• Use trending topics to increase visibility</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
