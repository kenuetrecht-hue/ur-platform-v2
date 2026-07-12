import { useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, Alert , useWindowDimensions } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { WebHeader } from "@/components/web-layout";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import { getAICreators, generateAINewsContent, generateAICryptoContent, generateAIAlerts } from "@/lib/ai-creators";

export default function AICreatorsWebScreen() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const aiCreators = getAICreators();
  const newsContent = generateAINewsContent();
  const cryptoContent = generateAICryptoContent();
  const alerts = generateAIAlerts();

  const [selectedCreatorId, setSelectedCreatorId] = useState<string>("ai-news");
  const [subscriptions, setSubscriptions] = useState<Set<string>>(new Set());

  const selectedCreator = aiCreators.find((c) => c.id === selectedCreatorId);
  const isSubscribed = subscriptions.has(selectedCreatorId);

  const handleSubscribe = () => {
    if (isSubscribed) {
      setSubscriptions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(selectedCreatorId);
        return newSet;
      });
      Alert.alert("Unsubscribed", `You have unsubscribed from ${selectedCreator?.name}`);
    } else {
      setSubscriptions((prev) => new Set(prev).add(selectedCreatorId));
      Alert.alert("Subscribed", `You are now subscribed to ${selectedCreator?.name} for $${selectedCreator?.price}/month`);
    }
  };

  const AICreatorCard = ({ creator }: { creator: typeof aiCreators[0] }) => (
    <Pressable
      onPress={() => setSelectedCreatorId(creator.id)}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
      })}
      className={cn(
        "bg-surface rounded-lg border-2 p-4 gap-3",
        selectedCreatorId === creator.id ? "border-primary" : "border-border"
      )}
    >
      {/* Avatar & Badge */}
      <View className="relative">
        <View className="w-full aspect-square bg-primary/20 rounded-lg flex items-center justify-center">
          <Text className="text-6xl">{creator.avatar}</Text>
        </View>
        <View className="absolute top-2 right-2 flex-row gap-1">
          <View className="bg-primary px-2 py-1 rounded-full">
            <Text className="text-white text-xs font-bold">AI</Text>
          </View>
          {creator.verified && (
            <View className="bg-blue-500 px-2 py-1 rounded-full">
              <Text className="text-white text-xs font-bold">✓</Text>
            </View>
          )}
        </View>
      </View>

      {/* Info */}
      <View className="gap-1">
        <Text className="text-base font-bold text-foreground">{creator.name}</Text>
        <Text className="text-sm text-muted">{creator.handle}</Text>
        <Text className="text-xs text-muted">{creator.category}</Text>
      </View>

      {/* Stats */}
      <View className="flex-row justify-between py-2 border-t border-b border-border">
        <View className="items-center flex-1">
          <Text className="text-sm font-bold text-foreground">{(creator.followers / 1000).toFixed(0)}K</Text>
          <Text className="text-xs text-muted">Followers</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-sm font-bold text-foreground">{creator.rating}</Text>
          <Text className="text-xs text-muted">Rating</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-sm font-bold text-foreground">${creator.price}</Text>
          <Text className="text-xs text-muted">Monthly</Text>
        </View>
      </View>

      {/* Tier Badge */}
      <View
        className={cn(
          "px-3 py-2 rounded-lg text-center",
          creator.tier === "Platinum" && "bg-yellow-500",
          creator.tier === "Gold" && "bg-yellow-400",
          creator.tier === "Silver" && "bg-gray-400",
          creator.tier === "Bronze" && "bg-orange-400"
        )}
      >
        <Text className="text-white text-xs font-bold">{creator.tier} Tier</Text>
      </View>
    </Pressable>
  );

  const ContentItem = ({ item }: { item: (typeof newsContent)[0] }) => (
    <View className="bg-surface rounded-lg border border-border p-4 gap-2 mb-3">
      <View className="flex-row justify-between items-start gap-2">
        <View className="flex-1">
          <Text className="text-sm font-bold text-foreground">{item.title}</Text>
          <Text className="text-xs text-muted mt-1">{item.category}</Text>
        </View>
        {item.sentiment && (
          <View
            className={cn(
              "px-2 py-1 rounded text-xs font-bold",
              item.sentiment === "positive" && "bg-green-500",
              item.sentiment === "neutral" && "bg-gray-500",
              item.sentiment === "negative" && "bg-red-500"
            )}
          >
            <Text className="text-white text-xs">{item.sentiment}</Text>
          </View>
        )}
      </View>
      <Text className="text-sm text-muted line-clamp-2">{item.content}</Text>
      <View className="flex-row justify-between items-center pt-2 border-t border-border">
        <Text className="text-xs text-muted">
          {item.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
        {item.confidence && (
          <Text className="text-xs text-muted">Confidence: {(item.confidence * 100).toFixed(0)}%</Text>
        )}
      </View>
    </View>
  );

  const AlertItem = ({ alert }: { alert: (typeof alerts)[0] }) => (
    <View
      className={cn(
        "rounded-lg border p-3 mb-2",
        alert.severity === "high" && "bg-red-500/10 border-red-500",
        alert.severity === "medium" && "bg-yellow-500/10 border-yellow-500",
        alert.severity === "low" && "bg-blue-500/10 border-blue-500"
      )}
    >
      <View className="flex-row justify-between items-start gap-2">
        <View className="flex-1">
          <Text className="text-sm font-bold text-foreground">{alert.title}</Text>
          <Text className="text-xs text-muted mt-1">{alert.message}</Text>
        </View>
        <View
          className={cn(
            "px-2 py-1 rounded text-xs font-bold",
            alert.severity === "high" && "bg-red-500",
            alert.severity === "medium" && "bg-yellow-500",
            alert.severity === "low" && "bg-blue-500"
          )}
        >
          <Text className="text-white text-xs">{alert.severity}</Text>
        </View>
      </View>
    </View>
  );

  // Mobile view
  if (!isDesktop) {
    return (
      <ScreenContainer>
        <WebHeader title="AI Creators" subtitle="AI-powered content" />
        <ScrollView className="flex-1 p-4 gap-4">
          {/* Creator List */}
          <View className="gap-3">
            {aiCreators.map((creator) => (
              <AICreatorCard key={creator.id} creator={creator} />
            ))}
          </View>

          {selectedCreator && (
            <>
              {/* Disclaimer */}
              <View className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-3 gap-2">
                <Text className="text-sm font-bold text-foreground">⚠️ AI-Generated Content</Text>
                <Text className="text-xs text-muted">{selectedCreator.disclaimer}</Text>
              </View>

              {/* Subscribe Button */}
              <Pressable
                onPress={handleSubscribe}
                className={cn(
                  "rounded-lg py-3 items-center",
                  isSubscribed ? "bg-red-500" : "bg-primary"
                )}
              >
                <Text className="text-white font-bold">
                  {isSubscribed ? "Unsubscribe" : `Subscribe $${selectedCreator.price}/mo`}
                </Text>
              </Pressable>

              {/* Content */}
              <View>
                <Text className="text-lg font-bold text-foreground mb-3">Latest Updates</Text>
                {(selectedCreator.id === "ai-news" ? newsContent : cryptoContent).map((item) => (
                  <ContentItem key={item.id} item={item} />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </ScreenContainer>
    );
  }

  // Desktop view
  return (
    <ScreenContainer>
      <WebHeader title="AI Creators" subtitle="AI-powered news, analysis, and insights" />

      <View className="flex-1 flex-row gap-4 p-4">
        {/* Left Sidebar - Creator List */}
        <View className="w-80 bg-surface rounded-lg border border-border p-4 gap-3">
          <Text className="text-lg font-bold text-foreground">AI Creators</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {aiCreators.map((creator) => (
              <AICreatorCard key={creator.id} creator={creator} />
            ))}
          </ScrollView>
        </View>

        {/* Main Content */}
        {selectedCreator && (
          <View className="flex-1 gap-4">
            {/* Header */}
            <View className="bg-surface rounded-lg border border-border p-6 gap-4">
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1 gap-2">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-3xl">{selectedCreator.avatar}</Text>
                    <View className="flex-1">
                      <Text className="text-2xl font-bold text-foreground">{selectedCreator.name}</Text>
                      <Text className="text-sm text-muted">{selectedCreator.handle}</Text>
                    </View>
                  </View>
                  <Text className="text-sm text-muted">{selectedCreator.description}</Text>
                </View>
                <Pressable
                  onPress={handleSubscribe}
                  className={cn(
                    "rounded-lg px-6 py-3 items-center min-w-40",
                    isSubscribed ? "bg-red-500" : "bg-primary"
                  )}
                >
                  <Text className="text-white font-bold">
                    {isSubscribed ? "Unsubscribe" : `Subscribe $${selectedCreator.price}/mo`}
                  </Text>
                </Pressable>
              </View>

              {/* Stats */}
              <View className="flex-row gap-4 pt-4 border-t border-border">
                <View>
                  <Text className="text-sm font-bold text-foreground">{(selectedCreator.followers / 1000).toFixed(0)}K</Text>
                  <Text className="text-xs text-muted">Followers</Text>
                </View>
                <View>
                  <Text className="text-sm font-bold text-foreground">{selectedCreator.rating}</Text>
                  <Text className="text-xs text-muted">Rating</Text>
                </View>
                <View>
                  <Text className="text-sm font-bold text-foreground">{selectedCreator.updateFrequency}</Text>
                  <Text className="text-xs text-muted">Update Frequency</Text>
                </View>
              </View>

              {/* Disclaimer */}
              <View className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-3 gap-2">
                <Text className="text-sm font-bold text-foreground">⚠️ AI-Generated Content</Text>
                <Text className="text-xs text-muted">{selectedCreator.disclaimer}</Text>
              </View>
            </View>

            {/* Content Grid */}
            <View className="flex-1 flex-row gap-4">
              {/* Latest Content */}
              <View className="flex-1 bg-surface rounded-lg border border-border p-4">
                <Text className="text-lg font-bold text-foreground mb-4">Latest Updates</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {(selectedCreator.id === "ai-news" ? newsContent : cryptoContent).map((item) => (
                    <ContentItem key={item.id} item={item} />
                  ))}
                </ScrollView>
              </View>

              {/* Alerts */}
              <View className="w-80 bg-surface rounded-lg border border-border p-4">
                <Text className="text-lg font-bold text-foreground mb-4">Alerts</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {alerts
                    .filter((a) => a.creatorId === selectedCreator.id)
                    .map((alert) => (
                      <AlertItem key={alert.id} alert={alert} />
                    ))}
                </ScrollView>
              </View>
            </View>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
