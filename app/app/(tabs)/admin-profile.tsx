import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Switch,
  TextInput,
  FlatList,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { adminDashboardService } from "@/lib/admin-dashboard-service";

type AdminTab = "dashboard" | "users" | "content" | "creators" | "settings" | "disputes" | "logs" | "analytics";

export default function AdminProfileScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [stats, setStats] = useState(adminDashboardService.getDashboardStats());
  const [users, setUsers] = useState(adminDashboardService.getAllUsers());
  const [creators, setCreators] = useState(adminDashboardService.getAllCreators());
  const [content, setContent] = useState(adminDashboardService.getAllContent());
  const [settings, setSettings] = useState(adminDashboardService.getSystemSettings());
  const [disputes, setDisputes] = useState(adminDashboardService.getAllDisputes());
  const [logs, setLogs] = useState(adminDashboardService.getAdminLogs());
  const [selectedModal, setSelectedModal] = useState<string | null>(null);

  const renderDashboard = () => (
    <View className="px-4 py-6 gap-4">
      <Text className="text-2xl font-bold text-foreground mb-4">Admin Dashboard</Text>

      {/* Key Metrics */}
      <View className="gap-3">
        <MetricCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          icon="person.fill"
          color={colors.primary}
        />
        <MetricCard
          title="Total Creators"
          value={stats.totalCreators.toLocaleString()}
          icon="person.2.fill"
          color="#8B5CF6"
        />
        <MetricCard
          title="Total Content"
          value={stats.totalContent.toLocaleString()}
          icon="film.fill"
          color="#EC4899"
        />
        <MetricCard
          title="Total Earnings"
          value={`$${stats.totalEarnings.toLocaleString()}`}
          icon="dollarsign.circle.fill"
          color="#10B981"
        />
        <MetricCard
          title="Daily Active Users"
          value={stats.dailyActiveUsers.toLocaleString()}
          icon="chart.bar.fill"
          color="#F59E0B"
        />
        <MetricCard
          title="Content Pending Review"
          value={stats.contentModeration.pending.toString()}
          icon="checkmark.circle.fill"
          color="#EF4444"
        />
      </View>
    </View>
  );

  const renderUsers = () => (
    <View className="px-4 py-6">
      <Text className="text-2xl font-bold text-foreground mb-4">User Management</Text>
      <FlatList
        scrollEnabled={false}
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">{item.name}</Text>
                <Text className="text-sm text-muted">{item.email}</Text>
              </View>
              <View
                className={`px-3 py-1 rounded-full ${
                  item.status === "active" ? "bg-green-100" : "bg-red-100"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    item.status === "active" ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text className="text-xs text-muted mb-3">
              Joined: {item.joinedDate} | Earnings: ${item.totalEarnings.toLocaleString()}
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity className="flex-1 bg-primary/10 rounded px-3 py-2">
                <Text className="text-xs font-semibold text-primary text-center">View</Text>
              </TouchableOpacity>
              {item.status === "active" && (
                <TouchableOpacity className="flex-1 bg-red-100 rounded px-3 py-2">
                  <Text className="text-xs font-semibold text-red-700 text-center">Suspend</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );

  const renderContent = () => (
    <View className="px-4 py-6">
      <Text className="text-2xl font-bold text-foreground mb-4">Content Moderation</Text>
      <FlatList
        scrollEnabled={false}
        data={content}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">{item.title}</Text>
                <Text className="text-sm text-muted">by {item.creatorName}</Text>
              </View>
              <View
                className={`px-2 py-1 rounded ${
                  item.status === "published" ? "bg-green-100" : "bg-yellow-100"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    item.status === "published" ? "text-green-700" : "text-yellow-700"
                  }`}
                >
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text className="text-xs text-muted mb-3">
              Views: {item.views.toLocaleString()} | Likes: {item.likes.toLocaleString()} | Earnings: $
              {item.earnings.toLocaleString()}
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity className="flex-1 bg-green-100 rounded px-3 py-2">
                <Text className="text-xs font-semibold text-green-700 text-center">Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-red-100 rounded px-3 py-2">
                <Text className="text-xs font-semibold text-red-700 text-center">Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );

  const renderCreators = () => (
    <View className="px-4 py-6">
      <Text className="text-2xl font-bold text-foreground mb-4">Creator Management</Text>
      <FlatList
        scrollEnabled={false}
        data={creators}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">{item.name}</Text>
                <Text className="text-sm text-muted">{item.followers.toLocaleString()} followers</Text>
              </View>
              <View className="bg-primary/10 px-3 py-1 rounded">
                <Text className="text-xs font-semibold text-primary">{item.tier.toUpperCase()}</Text>
              </View>
            </View>
            <Text className="text-xs text-muted mb-3">
              Views: {item.totalViews.toLocaleString()} | Earnings: ${item.totalEarnings.toLocaleString()}
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity className="flex-1 bg-primary/10 rounded px-3 py-2">
                <Text className="text-xs font-semibold text-primary text-center">View Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-blue-100 rounded px-3 py-2">
                <Text className="text-xs font-semibold text-blue-700 text-center">Update Tier</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );

  const renderSettings = () => (
    <View className="px-4 py-6">
      <Text className="text-2xl font-bold text-foreground mb-4">System Settings</Text>

      {/* Maintenance Mode */}
      <View className="bg-surface rounded-lg p-4 mb-3 border border-border flex-row justify-between items-center">
        <View>
          <Text className="text-base font-semibold text-foreground">Maintenance Mode</Text>
          <Text className="text-xs text-muted">Temporarily disable app access</Text>
        </View>
        <Switch
          value={settings.maintenanceMode}
          onValueChange={(value) => {
            adminDashboardService.toggleMaintenanceMode(value);
            setSettings(adminDashboardService.getSystemSettings());
          }}
        />
      </View>

      {/* Payout Settings */}
      <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
        <Text className="text-base font-semibold text-foreground mb-3">Payout Settings</Text>
        <View className="gap-2">
          <View className="flex-row justify-between">
            <Text className="text-sm text-muted">Minimum Payout:</Text>
            <Text className="text-sm font-semibold text-foreground">
              ${settings.payoutSettings.minimumPayout}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-muted">Frequency:</Text>
            <Text className="text-sm font-semibold text-foreground">
              {settings.payoutSettings.payoutFrequency.toUpperCase()}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-muted">Commission Rate:</Text>
            <Text className="text-sm font-semibold text-foreground">
              {(settings.payoutSettings.commissionRate * 100).toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Content Moderation */}
      <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
        <Text className="text-base font-semibold text-foreground mb-3">Content Moderation</Text>
        <View className="gap-2">
          <View className="flex-row justify-between">
            <Text className="text-sm text-muted">Auto-Flag Threshold:</Text>
            <Text className="text-sm font-semibold text-foreground">
              {(settings.contentModeration.autoFlagThreshold * 100).toFixed(0)}%
            </Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-muted">Require Manual Review:</Text>
            <Switch value={settings.contentModeration.requireManualReview} />
          </View>
        </View>
      </View>

      {/* Email Notifications */}
      <View className="bg-surface rounded-lg p-4 border border-border">
        <Text className="text-base font-semibold text-foreground mb-3">Email Notifications</Text>
        <View className="gap-2">
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-muted">Enabled:</Text>
            <Switch value={settings.emailNotifications.enabled} />
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-muted">Daily Digest:</Text>
            <Switch value={settings.emailNotifications.dailyDigest} />
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-muted">Weekly Report:</Text>
            <Switch value={settings.emailNotifications.weeklyReport} />
          </View>
        </View>
      </View>
    </View>
  );

  const renderDisputes = () => (
    <View className="px-4 py-6">
      <Text className="text-2xl font-bold text-foreground mb-4">Dispute Management</Text>
      {disputes.length === 0 ? (
        <View className="bg-surface rounded-lg p-6 items-center justify-center border border-border">
          <Text className="text-sm text-muted">No disputes at this time</Text>
        </View>
      ) : (
        <FlatList
          scrollEnabled={false}
          data={disputes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">{item.type.toUpperCase()}</Text>
                  <Text className="text-sm text-muted">Creator: {item.creatorName}</Text>
                </View>
                <View
                  className={`px-2 py-1 rounded ${
                    item.priority === "critical"
                      ? "bg-red-100"
                      : item.priority === "high"
                        ? "bg-orange-100"
                        : "bg-yellow-100"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      item.priority === "critical"
                        ? "text-red-700"
                        : item.priority === "high"
                          ? "text-orange-700"
                          : "text-yellow-700"
                    }`}
                  >
                    {item.priority.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-muted mb-3">{item.description}</Text>
              <TouchableOpacity className="bg-primary/10 rounded px-3 py-2">
                <Text className="text-xs font-semibold text-primary text-center">Review</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );

  const renderLogs = () => (
    <View className="px-4 py-6">
      <Text className="text-2xl font-bold text-foreground mb-4">Admin Activity Logs</Text>
      <FlatList
        scrollEnabled={false}
        data={logs.slice(0, 20)}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="bg-surface rounded-lg p-3 mb-2 border border-border">
            <View className="flex-row justify-between items-start mb-1">
              <Text className="text-sm font-semibold text-foreground">{item.action}</Text>
              <Text className="text-xs text-muted">{new Date(item.timestamp).toLocaleTimeString()}</Text>
            </View>
            <Text className="text-xs text-muted">{item.details}</Text>
          </View>
        )}
      />
    </View>
  );

  const renderAnalytics = () => {
    const analytics = adminDashboardService.getAnalyticsReport();
    const revenue = adminDashboardService.getRevenueReport();

    return (
      <View className="px-4 py-6">
        <Text className="text-2xl font-bold text-foreground mb-4">Analytics & Reports</Text>

        {/* Revenue Summary */}
        <View className="bg-surface rounded-lg p-4 mb-4 border border-border">
          <Text className="text-base font-semibold text-foreground mb-3">Revenue Summary</Text>
          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">Total Revenue:</Text>
              <Text className="text-sm font-semibold text-foreground">
                ${revenue.totalRevenue.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">Creator Payouts:</Text>
              <Text className="text-sm font-semibold text-foreground">
                ${revenue.creatorPayouts.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">Platform Earnings:</Text>
              <Text className="text-sm font-semibold text-foreground">
                ${revenue.platformEarnings.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">Pending Payouts:</Text>
              <Text className="text-sm font-semibold text-foreground">
                ${revenue.pendingPayouts.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Top Creators */}
        <View className="bg-surface rounded-lg p-4 border border-border">
          <Text className="text-base font-semibold text-foreground mb-3">Top Creators</Text>
          {analytics.topCreators.map((creator, index) => (
            <View key={creator.id} className="flex-row justify-between items-center py-2 border-b border-border">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">
                  {index + 1}. {creator.name}
                </Text>
                <Text className="text-xs text-muted">{creator.followers.toLocaleString()} followers</Text>
              </View>
              <Text className="text-sm font-semibold text-primary">
                ${creator.totalEarnings.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Admin Header */}
        <View className="bg-gradient-to-r from-primary to-purple-600 px-4 py-6">
          <Text className="text-3xl font-bold text-white mb-2">Admin Panel</Text>
          <Text className="text-sm text-white/80">Kenneth Uetrecht - Full System Access</Text>
        </View>

        {/* Tab Navigation */}
        <View className="bg-surface border-b border-border">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
            {[
              { id: "dashboard" as AdminTab, label: "Dashboard" },
              { id: "users" as AdminTab, label: "Users" },
              { id: "content" as AdminTab, label: "Content" },
              { id: "creators" as AdminTab, label: "Creators" },
              { id: "settings" as AdminTab, label: "Settings" },
              { id: "disputes" as AdminTab, label: "Disputes" },
              { id: "logs" as AdminTab, label: "Logs" },
              { id: "analytics" as AdminTab, label: "Analytics" },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                className={`py-4 px-3 border-b-2 ${
                  activeTab === tab.id ? "border-primary" : "border-transparent"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    activeTab === tab.id ? "text-primary" : "text-muted"
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        {activeTab === "dashboard" && renderDashboard()}
        {activeTab === "users" && renderUsers()}
        {activeTab === "content" && renderContent()}
        {activeTab === "creators" && renderCreators()}
        {activeTab === "settings" && renderSettings()}
        {activeTab === "disputes" && renderDisputes()}
        {activeTab === "logs" && renderLogs()}
        {activeTab === "analytics" && renderAnalytics()}
      </ScrollView>
    </ScreenContainer>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
}

function MetricCard({ title, value, icon, color }: MetricCardProps) {
  return (
    <View className="bg-surface rounded-lg p-4 border border-border flex-row items-center gap-4">
      <View
        className="w-12 h-12 rounded-lg items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        <IconSymbol name={icon as any} size={24} color={color} />
      </View>
      <View className="flex-1">
        <Text className="text-sm text-muted">{title}</Text>
        <Text className="text-2xl font-bold text-foreground">{value}</Text>
      </View>
    </View>
  );
}
