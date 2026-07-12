import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';

interface AnalyticsData {
  totalSubscribers: number;
  subscriberGrowth: number; // percentage
  totalRevenue: number;
  revenueGrowth: number; // percentage
  totalEngagement: number;
  engagementGrowth: number; // percentage
  topContent: {
    title: string;
    views: number;
    engagement: number;
  }[];
  dailyRevenue: {
    date: string;
    revenue: number;
  }[];
  subscriberTrend: {
    date: string;
    count: number;
  }[];
}

const mockAnalyticsData: AnalyticsData = {
  totalSubscribers: 1250,
  subscriberGrowth: 12.5,
  totalRevenue: 3450.75,
  revenueGrowth: 18.3,
  totalEngagement: 8920,
  engagementGrowth: 25.6,
  topContent: [
    { title: 'Wellness Tips', views: 2340, engagement: 456 },
    { title: 'Fitness Challenge', views: 1890, engagement: 389 },
    { title: 'Meditation Guide', views: 1650, engagement: 312 },
  ],
  dailyRevenue: [
    { date: 'Mon', revenue: 450 },
    { date: 'Tue', revenue: 520 },
    { date: 'Wed', revenue: 480 },
    { date: 'Thu', revenue: 610 },
    { date: 'Fri', revenue: 720 },
    { date: 'Sat', revenue: 380 },
    { date: 'Sun', revenue: 290 },
  ],
  subscriberTrend: [
    { date: 'Week 1', count: 950 },
    { date: 'Week 2', count: 1050 },
    { date: 'Week 3', count: 1180 },
    { date: 'Week 4', count: 1250 },
  ],
};

export default function CreatorAnalyticsDashboard() {
  const colors = useColors();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  const analyticsData = useMemo(() => mockAnalyticsData, []);

  const StatCard = ({
    label,
    value,
    growth,
    icon,
  }: {
    label: string;
    value: string;
    growth: number;
    icon: string;
  }) => (
    <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-muted text-sm mb-1">{label}</Text>
          <Text className="text-foreground text-2xl font-bold">{value}</Text>
          <Text className={`text-sm mt-2 ${growth >= 0 ? 'text-success' : 'text-error'}`}>
            {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
          </Text>
        </View>
        <Text className="text-3xl">{icon}</Text>
      </View>
    </View>
  );

  const ChartBar = ({
    label,
    value,
    maxValue,
  }: {
    label: string;
    value: number;
    maxValue: number;
  }) => {
    const percentage = (value / maxValue) * 100;
    return (
      <View className="mb-4">
        <View className="flex-row justify-between mb-1">
          <Text className="text-sm text-foreground font-medium">{label}</Text>
          <Text className="text-sm text-muted">${value.toFixed(2)}</Text>
        </View>
        <View className="w-full h-2 bg-border rounded-full overflow-hidden">
          <View
            className="h-full bg-primary rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </View>
      </View>
    );
  };

  const maxRevenue = Math.max(...analyticsData.dailyRevenue.map((d) => d.revenue));

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-foreground mb-2">
            Creator Analytics
          </Text>
          <Text className="text-muted">Track your performance and growth</Text>
        </View>

        {/* Time Range Selector */}
        <View className="flex-row gap-2 mb-6">
          {(['week', 'month', 'year'] as const).map((range) => (
            <Pressable
              key={range}
              onPress={() => setTimeRange(range)}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 6,
                  backgroundColor:
                    timeRange === range ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                className={`font-medium capitalize ${
                  timeRange === range ? 'text-background' : 'text-foreground'
                }`}
              >
                {range}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Key Metrics */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-foreground mb-3">
            Key Metrics
          </Text>
          <StatCard
            label="Total Subscribers"
            value={analyticsData.totalSubscribers.toLocaleString()}
            growth={analyticsData.subscriberGrowth}
            icon="👥"
          />
          <StatCard
            label="Total Revenue"
            value={`$${analyticsData.totalRevenue.toFixed(2)}`}
            growth={analyticsData.revenueGrowth}
            icon="💰"
          />
          <StatCard
            label="Total Engagement"
            value={analyticsData.totalEngagement.toLocaleString()}
            growth={analyticsData.engagementGrowth}
            icon="📊"
          />
        </View>

        {/* Daily Revenue Chart */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-foreground mb-3">
            Daily Revenue
          </Text>
          <View className="bg-surface rounded-lg p-4 border border-border">
            {analyticsData.dailyRevenue.map((day) => (
              <ChartBar
                key={day.date}
                label={day.date}
                value={day.revenue}
                maxValue={maxRevenue}
              />
            ))}
          </View>
        </View>

        {/* Top Content */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-foreground mb-3">
            Top Content
          </Text>
          {analyticsData.topContent.map((content, index) => (
            <View
              key={index}
              className="bg-surface rounded-lg p-4 mb-3 border border-border"
            >
              <View className="flex-row justify-between items-start mb-2">
                <Text className="text-foreground font-semibold flex-1">
                  {content.title}
                </Text>
                <Text className="text-primary font-bold">#{index + 1}</Text>
              </View>
              <View className="flex-row gap-4">
                <View>
                  <Text className="text-muted text-xs">Views</Text>
                  <Text className="text-foreground font-semibold">
                    {content.views.toLocaleString()}
                  </Text>
                </View>
                <View>
                  <Text className="text-muted text-xs">Engagement</Text>
                  <Text className="text-foreground font-semibold">
                    {content.engagement.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Subscriber Trend */}
        <View className="mb-8">
          <Text className="text-lg font-bold text-foreground mb-3">
            Subscriber Trend
          </Text>
          <View className="bg-surface rounded-lg p-4 border border-border">
            {analyticsData.subscriberTrend.map((trend, index) => (
              <View key={index} className="flex-row justify-between items-center mb-3">
                <Text className="text-foreground">{trend.date}</Text>
                <View className="flex-row items-center gap-2">
                  <View
                    className="h-8 bg-primary rounded"
                    style={{
                      width: `${(trend.count / 1250) * 100}%`,
                      minWidth: 40,
                    }}
                  />
                  <Text className="text-foreground font-semibold">
                    {trend.count}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
