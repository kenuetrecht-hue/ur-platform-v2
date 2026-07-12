import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

interface PropertyResult {
  zpid: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
}

interface PropertyDetails extends PropertyResult {
  arv: number;
  mao: number;
  repairCosts: number;
  profitMargin: number;
}

export default function PropertySearch() {
  const colors = useColors();
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<PropertyDetails | null>(null);
  const [searchResults, setSearchResults] = useState<PropertyResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  // tRPC queries
  const searchPropertyQuery = trpc.voiceProperty.searchProperty.useQuery(
    { address, city, state, zipCode: zipCode || undefined },
    { enabled: false }
  );

  const getComparableSalesQuery = trpc.voiceProperty.getComparableSales.useQuery(
    { zpid: selectedProperty?.zpid || "", count: 5 },
    { enabled: !!selectedProperty }
  );

  const estimateARVQuery = trpc.voiceProperty.estimateARV.useQuery(
    {
      zpid: selectedProperty?.zpid || "",
      afterRepairCondition: "good",
    },
    { enabled: !!selectedProperty }
  );

  const calculateMAOQuery = trpc.voiceProperty.calculateMAO.useQuery(
    { arvEstimate: 0, desiredProfitMargin: 0.2, repairCosts: 0 },
    { enabled: false }
  );

  /**
   * Search for properties
   */
  const handleSearch = async () => {
    try {
      setError("");
      setIsSearching(true);

      if (!address || !city || !state) {
        setError("Please enter address, city, and state");
        setIsSearching(false);
        return;
      }

      // Mock search results for demo
      const mockResults: PropertyResult[] = [
        {
          zpid: "zpid_001",
          address: `${address}`,
          city,
          state,
          zipCode,
          price: 350000,
          beds: 3,
          baths: 2,
          sqft: 1800,
        },
        {
          zpid: "zpid_002",
          address: `${address} Unit B`,
          city,
          state,
          zipCode,
          price: 365000,
          beds: 3,
          baths: 2,
          sqft: 1850,
        },
        {
          zpid: "zpid_003",
          address: `${address} Adjacent`,
          city,
          state,
          zipCode,
          price: 340000,
          beds: 2,
          baths: 2,
          sqft: 1600,
        },
      ];

      setSearchResults(mockResults);
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to search properties");
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Select property and calculate metrics
   */
  const handleSelectProperty = async (property: PropertyResult) => {
    try {
      setError("");

      // Calculate ARV (mock for demo)
      const arvEstimate = property.price * 1.25; // 25% appreciation

      // Calculate MAO with 20% profit margin
      const mao = arvEstimate * 0.7; // 70% of ARV

      // Estimate repair costs based on property age (mock)
      const repairCosts = property.sqft * 15; // $15 per sqft

      // Calculate profit
      const profitMargin = ((arvEstimate - mao - repairCosts) / arvEstimate) * 100;

      const details: PropertyDetails = {
        ...property,
        arv: arvEstimate,
        mao,
        repairCosts,
        profitMargin,
      };

      setSelectedProperty(details);
    } catch (err) {
      console.error("Selection error:", err);
      setError("Failed to calculate property metrics");
    }
  };

  return (
    <ScreenContainer className="bg-black">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="gap-6 p-4">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-white">
              🏠 Property Search & Analysis
            </Text>
            <Text className="text-sm text-gray-400">
              Find deals with real-time ARV calculations
            </Text>
          </View>

          {/* Search Form */}
          <View
            className="rounded-2xl p-6 border border-indigo-600/30 gap-4"
            style={{ backgroundColor: "#0f172a" }}
          >
            <Text className="text-lg font-bold text-white">Search Criteria</Text>

            {/* Address Input */}
            <View className="gap-2">
              <Text className="text-xs font-semibold text-gray-300">
                Street Address
              </Text>
              <TextInput
                placeholder="123 Main Street"
                placeholderTextColor="#6b7280"
                value={address}
                onChangeText={setAddress}
                style={{
                  backgroundColor: "#1e293b",
                  color: "white",
                  borderWidth: 1,
                  borderColor: "#4f46e5",
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                }}
              />
            </View>

            {/* City Input */}
            <View className="gap-2">
              <Text className="text-xs font-semibold text-gray-300">City</Text>
              <TextInput
                placeholder="New York"
                placeholderTextColor="#6b7280"
                value={city}
                onChangeText={setCity}
                style={{
                  backgroundColor: "#1e293b",
                  color: "white",
                  borderWidth: 1,
                  borderColor: "#4f46e5",
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                }}
              />
            </View>

            {/* State & Zip Row */}
            <View className="flex-row gap-3">
              <View className="flex-1 gap-2">
                <Text className="text-xs font-semibold text-gray-300">
                  State
                </Text>
                <TextInput
                  placeholder="NY"
                  placeholderTextColor="#6b7280"
                  value={state}
                  onChangeText={setState}
                  maxLength={2}
                  style={{
                    backgroundColor: "#1e293b",
                    color: "white",
                    borderWidth: 1,
                    borderColor: "#4f46e5",
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                  }}
                />
              </View>

              <View className="flex-1 gap-2">
                <Text className="text-xs font-semibold text-gray-300">
                  Zip Code
                </Text>
                <TextInput
                  placeholder="10001"
                  placeholderTextColor="#6b7280"
                  value={zipCode}
                  onChangeText={setZipCode}
                  maxLength={5}
                  style={{
                    backgroundColor: "#1e293b",
                    color: "white",
                    borderWidth: 1,
                    borderColor: "#4f46e5",
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                  }}
                />
              </View>
            </View>

            {/* Search Button */}
            <Pressable
              onPress={handleSearch}
              disabled={isSearching}
              style={({ pressed }) => ({
                backgroundColor: isSearching ? "#4f46e5" : "#6366f1",
                borderRadius: 10,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed || isSearching ? 0.8 : 1,
              })}
            >
              {isSearching ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">
                  🔍 Search Properties
                </Text>
              )}
            </Pressable>

            {error && (
              <View
                className="rounded-lg p-3 border border-red-600/30"
                style={{ backgroundColor: "#2a0f0f" }}
              >
                <Text className="text-sm text-red-400">{error}</Text>
              </View>
            )}
          </View>

          {/* Search Results */}
          {searchResults.length > 0 && !selectedProperty && (
            <View
              className="rounded-2xl p-6 border border-indigo-600/30 gap-4"
              style={{ backgroundColor: "#0f172a" }}
            >
              <Text className="text-lg font-bold text-white">
                Found {searchResults.length} Properties
              </Text>

              {searchResults.map((property) => (
                <Pressable
                  key={property.zpid}
                  onPress={() => handleSelectProperty(property)}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? "#1e293b" : "#1a1f2e",
                    borderWidth: 1,
                    borderColor: "#4f46e5",
                    borderRadius: 12,
                    padding: 12,
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <View className="gap-2">
                    <Text className="text-white font-bold">
                      {property.address}
                    </Text>
                    <Text className="text-sm text-gray-400">
                      {property.city}, {property.state} {property.zipCode}
                    </Text>
                    <View className="flex-row gap-4 mt-2">
                      <View>
                        <Text className="text-xs text-gray-500">Price</Text>
                        <Text className="text-lg font-bold text-green-400">
                          ${property.price.toLocaleString()}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-xs text-gray-500">Beds/Baths</Text>
                        <Text className="text-lg font-bold text-indigo-400">
                          {property.beds}/{property.baths}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-xs text-gray-500">Sqft</Text>
                        <Text className="text-lg font-bold text-blue-400">
                          {property.sqft.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* Property Details & Analysis */}
          {selectedProperty && (
            <View
              className="rounded-2xl p-6 border border-green-600/30 gap-4"
              style={{ backgroundColor: "#0f2818" }}
            >
              <View className="flex-row justify-between items-start gap-2">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-white">
                    {selectedProperty.address}
                  </Text>
                  <Text className="text-sm text-gray-400">
                    {selectedProperty.city}, {selectedProperty.state}{" "}
                    {selectedProperty.zipCode}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setSelectedProperty(null)}
                  style={{
                    backgroundColor: "#1e293b",
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text className="text-white text-sm font-bold">✕</Text>
                </Pressable>
              </View>

              {/* Property Specs */}
              <View className="grid grid-cols-3 gap-3">
                <View
                  className="rounded-lg p-3 border border-gray-700"
                  style={{ backgroundColor: "#1a1f2e" }}
                >
                  <Text className="text-xs text-gray-400 mb-1">Beds</Text>
                  <Text className="text-2xl font-bold text-white">
                    {selectedProperty.beds}
                  </Text>
                </View>
                <View
                  className="rounded-lg p-3 border border-gray-700"
                  style={{ backgroundColor: "#1a1f2e" }}
                >
                  <Text className="text-xs text-gray-400 mb-1">Baths</Text>
                  <Text className="text-2xl font-bold text-white">
                    {selectedProperty.baths}
                  </Text>
                </View>
                <View
                  className="rounded-lg p-3 border border-gray-700"
                  style={{ backgroundColor: "#1a1f2e" }}
                >
                  <Text className="text-xs text-gray-400 mb-1">Sqft</Text>
                  <Text className="text-xl font-bold text-white">
                    {(selectedProperty.sqft / 1000).toFixed(1)}k
                  </Text>
                </View>
              </View>

              {/* Investment Metrics */}
              <View className="gap-3 pt-4 border-t border-gray-700">
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-gray-300">Current Price</Text>
                  <Text className="text-lg font-bold text-white">
                    ${selectedProperty.price.toLocaleString()}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-gray-300">ARV Estimate</Text>
                  <Text className="text-lg font-bold text-green-400">
                    ${selectedProperty.arv.toLocaleString()}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-gray-300">MAO (70% Rule)</Text>
                  <Text className="text-lg font-bold text-indigo-400">
                    ${selectedProperty.mao.toLocaleString()}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-gray-300">Est. Repairs</Text>
                  <Text className="text-lg font-bold text-yellow-400">
                    ${selectedProperty.repairCosts.toLocaleString()}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center pt-3 border-t border-gray-700">
                  <Text className="text-sm font-bold text-gray-300">
                    Profit Margin
                  </Text>
                  <Text
                    className="text-lg font-bold"
                    style={{
                      color:
                        selectedProperty.profitMargin > 20
                          ? "#22c55e"
                          : selectedProperty.profitMargin > 10
                          ? "#f59e0b"
                          : "#ef4444",
                    }}
                  >
                    {selectedProperty.profitMargin.toFixed(1)}%
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View className="gap-2 flex-row pt-4">
                <Pressable
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: "#6366f1",
                    borderRadius: 10,
                    paddingVertical: 12,
                    alignItems: "center",
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text className="text-white font-bold">📊 View Comps</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: "#4f46e5",
                    borderRadius: 10,
                    paddingVertical: 12,
                    alignItems: "center",
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text className="text-white font-bold">💬 Ask AI</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Empty State */}
          {searchResults.length === 0 && !selectedProperty && (
            <View
              className="rounded-2xl p-8 border border-gray-700 gap-4 items-center"
              style={{ backgroundColor: "#1a1f2e" }}
            >
              <Text className="text-4xl">🔍</Text>
              <Text className="text-center text-gray-400">
                Enter property details and search to find investment opportunities
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
