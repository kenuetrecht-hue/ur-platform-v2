import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

interface Property {
  id: string;
  address: string;
  lat: number;
  lng: number;
  purchasePrice: number;
  estimatedRepairCost: number;
  afterRepairValue: string;
  arv: number;
  profitMargin: number;
  status: "active" | "pending" | "sold";
}

export default function Viewport3DSatmap() {
  const colors = useColors();
  const [properties, setProperties] = useState<Property[]>([
    {
      id: "1",
      address: "123 Oak Street, Austin, TX 78701",
      lat: 30.2672,
      lng: -97.7431,
      purchasePrice: 250000,
      estimatedRepairCost: 75000,
      afterRepairValue: "$380,000",
      arv: 380000,
      profitMargin: 55000,
      status: "active",
    },
    {
      id: "2",
      address: "456 Maple Avenue, Dallas, TX 75201",
      lat: 32.7767,
      lng: -96.797,
      purchasePrice: 180000,
      estimatedRepairCost: 45000,
      afterRepairValue: "$280,000",
      arv: 280000,
      profitMargin: 55000,
      status: "pending",
    },
    {
      id: "3",
      address: "789 Pine Road, Houston, TX 77001",
      lat: 29.7604,
      lng: -95.3698,
      purchasePrice: 320000,
      estimatedRepairCost: 120000,
      afterRepairValue: "$520,000",
      arv: 520000,
      profitMargin: 80000,
      status: "active",
    },
  ]);

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(properties[0]);
  const [loading, setLoading] = useState(false);

  const calculateMetrics = (property: Property) => {
    const totalInvestment = property.purchasePrice + property.estimatedRepairCost;
    const profit = property.arv - totalInvestment;
    const roi = ((profit / totalInvestment) * 100).toFixed(1);

    return { totalInvestment, profit, roi };
  };

  const handleAddProperty = () => {
    // Placeholder for adding new property
    console.log("Add new property");
  };

  const handleAnalyzeProperty = (property: Property) => {
    setLoading(true);
    setTimeout(() => {
      setSelectedProperty(property);
      setLoading(false);
    }, 500);
  };

  const metrics = selectedProperty ? calculateMetrics(selectedProperty) : null;

  return (
    <ScreenContainer className="bg-slate-900">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="gap-6 p-4">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-white">🛰️ 3D Satellite Map</Text>
            <Text className="text-sm text-slate-400">Real Estate Acquisitions Workspace</Text>
          </View>

          {/* Map Placeholder */}
          <View
            className="w-full h-64 bg-gradient-to-br from-blue-900 to-slate-800 rounded-xl border border-blue-700 flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: colors.surface }}
          >
            <View className="gap-2 items-center">
              <Text className="text-4xl">🗺️</Text>
              <Text className="text-sm text-slate-400">Interactive 3D Satellite Map</Text>
              <Text className="text-xs text-slate-500">{properties.length} properties tracked</Text>
            </View>
          </View>

          {/* Property Stats Overview */}
          <View className="grid grid-cols-3 gap-3">
            <View
              className="p-4 rounded-lg border border-slate-700"
              style={{ backgroundColor: colors.surface }}
            >
              <Text className="text-xs text-slate-400 mb-1">Total Portfolio</Text>
              <Text className="text-lg font-bold text-green-400">
                ${(properties.reduce((sum, p) => sum + p.arv, 0) / 1000000).toFixed(1)}M
              </Text>
            </View>
            <View
              className="p-4 rounded-lg border border-slate-700"
              style={{ backgroundColor: colors.surface }}
            >
              <Text className="text-xs text-slate-400 mb-1">Active Deals</Text>
              <Text className="text-lg font-bold text-blue-400">
                {properties.filter((p) => p.status === "active").length}
              </Text>
            </View>
            <View
              className="p-4 rounded-lg border border-slate-700"
              style={{ backgroundColor: colors.surface }}
            >
              <Text className="text-xs text-slate-400 mb-1">Total Profit</Text>
              <Text className="text-lg font-bold text-yellow-400">
                ${(properties.reduce((sum, p) => sum + p.profitMargin, 0) / 1000).toFixed(0)}K
              </Text>
            </View>
          </View>

          {/* Selected Property Details */}
          {selectedProperty && metrics && (
            <View
              className="p-4 rounded-lg border border-slate-700 gap-3"
              style={{ backgroundColor: colors.surface }}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-white">{selectedProperty.address}</Text>
                  <Text className="text-xs text-slate-400 mt-1">
                    Status: {selectedProperty.status.toUpperCase()}
                  </Text>
                </View>
                <View
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold",
                    selectedProperty.status === "active"
                      ? "bg-green-900 text-green-200"
                      : selectedProperty.status === "pending"
                        ? "bg-yellow-900 text-yellow-200"
                        : "bg-slate-700 text-slate-200"
                  )}
                >
                  {selectedProperty.status === "active"
                    ? "Active"
                    : selectedProperty.status === "pending"
                      ? "Pending"
                      : "Sold"}
                </View>
              </View>

              {/* ARV Calculation Breakdown */}
              <View className="gap-2 pt-2 border-t border-slate-600">
                <View className="flex-row justify-between">
                  <Text className="text-sm text-slate-300">Purchase Price:</Text>
                  <Text className="text-sm font-semibold text-white">
                    ${selectedProperty.purchasePrice.toLocaleString()}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-slate-300">Est. Repair Cost:</Text>
                  <Text className="text-sm font-semibold text-white">
                    ${selectedProperty.estimatedRepairCost.toLocaleString()}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-slate-300">Total Investment:</Text>
                  <Text className="text-sm font-semibold text-blue-300">
                    ${metrics.totalInvestment.toLocaleString()}
                  </Text>
                </View>
                <View className="flex-row justify-between pt-2 border-t border-slate-600">
                  <Text className="text-sm text-slate-300">After Repair Value (ARV):</Text>
                  <Text className="text-sm font-bold text-green-400">
                    ${selectedProperty.arv.toLocaleString()}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-slate-300">Estimated Profit:</Text>
                  <Text className="text-sm font-bold text-yellow-400">
                    ${metrics.profit.toLocaleString()}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-slate-300">ROI:</Text>
                  <Text className="text-sm font-bold text-purple-400">{metrics.roi}%</Text>
                </View>
              </View>
            </View>
          )}

          {/* Properties List */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-white">Portfolio Properties</Text>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              properties.map((property) => (
                <Pressable
                  key={property.id}
                  onPress={() => handleAnalyzeProperty(property)}
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.7 : 1,
                      backgroundColor:
                        selectedProperty?.id === property.id ? colors.primary : colors.surface,
                    },
                  ]}
                  className="p-3 rounded-lg border border-slate-700"
                >
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1">
                      <Text
                        className={cn(
                          "text-sm font-semibold",
                          selectedProperty?.id === property.id ? "text-white" : "text-slate-200"
                        )}
                      >
                        {property.address}
                      </Text>
                      <Text className="text-xs text-slate-400 mt-1">
                        ARV: ${property.arv.toLocaleString()} | Profit: ${property.profitMargin.toLocaleString()}
                      </Text>
                    </View>
                    <View
                      className={cn(
                        "px-2 py-1 rounded text-xs font-semibold",
                        property.status === "active"
                          ? "bg-green-900 text-green-200"
                          : property.status === "pending"
                            ? "bg-yellow-900 text-yellow-200"
                            : "bg-slate-700 text-slate-200"
                      )}
                    >
                      {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </View>

          {/* Action Buttons */}
          <View className="gap-2 flex-row">
            <Pressable
              onPress={handleAddProperty}
              className="flex-1 bg-blue-600 py-3 rounded-lg active:opacity-80"
            >
              <Text className="text-white font-semibold text-center">+ Add Property</Text>
            </Pressable>
            <Pressable className="flex-1 bg-slate-700 py-3 rounded-lg active:opacity-80">
              <Text className="text-white font-semibold text-center">📊 Export Report</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
