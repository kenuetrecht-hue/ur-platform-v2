import { ScrollView, Text, View, TouchableOpacity, TextInput, ActivityIndicator, Image } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

export default function AIRealEstateMasterScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<"consultant" | "leads" | "search" | "analyze" | "study">("consultant");
  const [query, setQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAskConsultant = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setTimeout(() => {
      const response = {
        text: "I'm your real estate consultant. Ask me about property analysis, funding, contractors, renovation planning, or deal analysis.",
        videoUrl: undefined,
        audioUrl: undefined,
        diagramUrl: undefined,
      };
      setResults(response);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsLoading(false);
    }, 500);
  };

  const handleGenerateLeads = async () => {
    if (!searchLocation.trim()) return;
    setIsLoading(true);
    setTimeout(() => {
      const response = {
        leadsFound: 3,
        leads: [
          { id: 1, address: "123 Main St", dealType: "Off-Market", price: "$150,000", estimatedProfit: "$45,000" },
          { id: 2, address: "456 Oak Ave", dealType: "Wholesaler", price: "$125,000", estimatedProfit: "$55,000" },
          { id: 3, address: "789 Elm Rd", dealType: "Foreclosure", price: "$100,000", estimatedProfit: "$65,000" },
        ],
      };
      setResults(response);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsLoading(false);
    }, 500);
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView className="flex-1 bg-background">
        {/* AI Avatar Header */}
        <View className="bg-gradient-to-b from-primary/10 to-background p-6 items-center gap-3">
          <Image
            source={{ uri: "https://d2xsxph8kpxj0f.cloudfront.net/310519663606080544/4FKhKEyFxyQa9pE5YyLmxg/ai-real-estate-avatar-ZjDHcvzfScnH9dNu9VQPRA.webp" }}
            className="w-24 h-24 rounded-full border-2 border-primary"
          />
          <Text className="text-xl font-bold text-foreground">AI Real Estate Master</Text>
          <Text className="text-sm text-muted text-center">Your on-the-job real estate consultant</Text>
        </View>

        {/* Tab Navigation */}
        <View className="flex-row gap-2 p-4 border-b border-border overflow-x-auto">
          {[
            { id: "consultant", label: "Ask" },
            { id: "leads", label: "Leads" },
            { id: "search", label: "Search" },
            { id: "analyze", label: "Analyze" },
            { id: "study", label: "Study" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => {
                setActiveTab(tab.id as any);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              className={`px-4 py-2 rounded-lg ${activeTab === tab.id ? "bg-primary" : "bg-surface border border-border"}`}
            >
              <Text className={`font-semibold ${activeTab === tab.id ? "text-white" : "text-foreground"}`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === "consultant" && (
          <View className="p-4 gap-4">
            <Text className="text-lg font-bold text-foreground">Ask Me Anything</Text>
            <TextInput
              placeholder="Ask about real estate investing..."
              value={query}
              onChangeText={setQuery}
              className="bg-surface border border-border rounded-lg p-3 text-foreground"
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              onPress={handleAskConsultant}
              disabled={isLoading}
              className="bg-primary rounded-lg p-4 items-center"
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold">Get Answer</Text>
              )}
            </TouchableOpacity>
            {results && (
              <View className="bg-surface rounded-lg p-4 border border-border gap-3">
                <Text className="font-bold text-foreground">Response</Text>
                <Text className="text-muted">{results.text}</Text>
                {results.videoUrl && (
                  <TouchableOpacity className="bg-primary/20 rounded-lg p-3">
                    <Text className="text-primary font-semibold">Watch Video</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {activeTab === "leads" && (
          <View className="p-4 gap-4">
            <Text className="text-lg font-bold text-foreground">Generate Hot Leads</Text>
            <TextInput
              placeholder="Enter location (city, state)"
              value={searchLocation}
              onChangeText={setSearchLocation}
              className="bg-surface border border-border rounded-lg p-3 text-foreground"
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity
              onPress={handleGenerateLeads}
              disabled={isLoading}
              className="bg-primary rounded-lg p-4 items-center"
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold">Find Hot Leads</Text>
              )}
            </TouchableOpacity>
            {results && results.leads && (
              <View className="gap-3">
                <Text className="font-bold text-foreground">Found {results.leadsFound} Hot Deals</Text>
                {results.leads.map((lead: any) => (
                  <View key={lead.id} className="bg-surface rounded-lg p-4 border border-border">
                    <Text className="font-bold text-foreground">{lead.address}</Text>
                    <Text className="text-muted text-sm">{lead.dealType}</Text>
                    <View className="flex-row justify-between mt-2">
                      <View>
                        <Text className="text-xs text-muted">Price</Text>
                        <Text className="font-bold text-foreground">{lead.price}</Text>
                      </View>
                      <View>
                        <Text className="text-xs text-muted">Profit</Text>
                        <Text className="font-bold text-success">{lead.estimatedProfit}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === "search" && (
          <View className="p-4 gap-4">
            <Text className="text-lg font-bold text-foreground">Property Search</Text>
            <TextInput
              placeholder="Enter location to search"
              value={searchLocation}
              onChangeText={setSearchLocation}
              className="bg-surface border border-border rounded-lg p-3 text-foreground"
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity className="bg-primary rounded-lg p-4 items-center">
              <Text className="text-white font-bold">Search Properties</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === "analyze" && (
          <View className="p-4 gap-4">
            <Text className="text-lg font-bold text-foreground">Deal Analysis</Text>
            <TextInput
              placeholder="Purchase Price"
              className="bg-surface border border-border rounded-lg p-3 text-foreground"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
            />
            <TextInput
              placeholder="Repair Costs"
              className="bg-surface border border-border rounded-lg p-3 text-foreground"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity className="bg-primary rounded-lg p-4 items-center">
              <Text className="text-white font-bold">Analyze Deal</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === "study" && (
          <View className="p-4 gap-4">
            <Text className="text-lg font-bold text-foreground">Study Materials</Text>
            {[
              { title: "Real Estate Basics", progress: 75 },
              { title: "Financing", progress: 45 },
              { title: "Deal Analysis", progress: 60 },
            ].map((module, idx) => (
              <View key={idx} className="bg-surface rounded-lg p-4 border border-border">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="font-bold text-foreground">{module.title}</Text>
                  <Text className="text-sm text-muted">{module.progress}%</Text>
                </View>
                <View className="h-2 bg-background rounded-full overflow-hidden">
                  <View className="h-full bg-primary" style={{ width: `${module.progress}%` }} />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
