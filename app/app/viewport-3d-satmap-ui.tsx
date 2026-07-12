import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";

interface Property {
  id: string;
  address: string;
  lat: number;
  lng: number;
  arv: number;
  purchasePrice: number;
  repairCost: number;
  profitMargin: number;
  status: "lead" | "under_contract" | "owned" | "renovating" | "sold";
}

const MOCK_PROPERTIES: Property[] = [
  {
    id: "prop_001",
    address: "123 Oak Street, Austin TX",
    lat: 30.2672,
    lng: -97.7431,
    arv: 450000,
    purchasePrice: 280000,
    repairCost: 65000,
    profitMargin: 105000,
    status: "under_contract",
  },
  {
    id: "prop_002",
    address: "456 Maple Ave, Austin TX",
    lat: 30.3039,
    lng: -97.7369,
    arv: 520000,
    purchasePrice: 310000,
    repairCost: 85000,
    profitMargin: 125000,
    status: "owned",
  },
  {
    id: "prop_003",
    address: "789 Pine Road, Austin TX",
    lat: 30.2711,
    lng: -97.7437,
    arv: 380000,
    purchasePrice: 220000,
    repairCost: 55000,
    profitMargin: 105000,
    status: "renovating",
  },
];

export default function Viewport3DSatmapUI() {
  const colors = useColors();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showPropertyDetail, setShowPropertyDetail] = useState(false);
  const [mapZoom, setMapZoom] = useState(14);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const filteredProperties = filterStatus
    ? MOCK_PROPERTIES.filter((p) => p.status === filterStatus)
    : MOCK_PROPERTIES;

  const handlePropertySelect = useCallback((property: Property) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setSelectedProperty(property);
    setShowPropertyDetail(true);
  }, []);

  const handleZoomIn = useCallback(() => {
    setMapZoom((z) => Math.min(z + 1, 20));
  }, []);

  const handleZoomOut = useCallback(() => {
    setMapZoom((z) => Math.max(z - 1, 10));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "lead":
        return colors.warning;
      case "under_contract":
        return colors.primary;
      case "owned":
        return colors.success;
      case "renovating":
        return colors.primary;
      case "sold":
        return colors.muted;
      default:
        return colors.foreground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "lead":
        return "Lead";
      case "under_contract":
        return "Under Contract";
      case "owned":
        return "Owned";
      case "renovating":
        return "Renovating";
      case "sold":
        return "Sold";
      default:
        return status;
    }
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View className="px-4 py-4 border-b border-border">
          <Text className="text-2xl font-bold text-foreground">
            3D Satellite Map
          </Text>
          <Text className="text-sm text-muted mt-1">
            Property Portfolio Overview
          </Text>
        </View>

        {/* Map Container (Mock) */}
        <View
          style={{
            height: 300,
            backgroundColor: colors.surface,
            margin: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
          }}
        >
          <Text style={{ color: colors.muted, fontSize: 14 }}>
            📡 3D Satellite Map (Zoom: {mapZoom}x)
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>
            {filteredProperties.length} properties visible
          </Text>

          {/* Zoom Controls */}
          <View
            style={{
              position: "absolute",
              bottom: 16,
              right: 16,
              gap: 8,
            }}
          >
            <Pressable
              onPress={handleZoomIn}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 6,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: "white", fontWeight: "700" }}>+</Text>
            </Pressable>
            <Pressable
              onPress={handleZoomOut}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 6,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: "white", fontWeight: "700" }}>−</Text>
            </Pressable>
          </View>
        </View>

        {/* Status Filter */}
        <View className="px-4 py-2">
          <Text className="text-sm font-semibold text-foreground mb-2">
            Filter by Status
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Pressable
              onPress={() => setFilterStatus(null)}
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor:
                  filterStatus === null ? colors.primary : colors.surface,
                marginRight: 8,
                opacity: pressed ? 0.8 : 1,
                borderWidth: 1,
                borderColor: colors.border,
              })}
            >
              <Text
                style={{
                  color: filterStatus === null ? "white" : colors.foreground,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                All
              </Text>
            </Pressable>
            {["lead", "under_contract", "owned", "renovating", "sold"].map(
              (status) => (
                <Pressable
                  key={status}
                  onPress={() => setFilterStatus(status)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor:
                      filterStatus === status ? colors.primary : colors.surface,
                    marginRight: 8,
                    opacity: pressed ? 0.8 : 1,
                    borderWidth: 1,
                    borderColor: colors.border,
                  })}
                >
                  <Text
                    style={{
                      color:
                        filterStatus === status ? "white" : colors.foreground,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {getStatusLabel(status)}
                  </Text>
                </Pressable>
              ),
            )}
          </ScrollView>
        </View>

        {/* Property List */}
        <View className="px-4 py-4">
          <Text className="text-sm font-semibold text-foreground mb-3">
            Properties ({filteredProperties.length})
          </Text>
          <FlatList
            scrollEnabled={true}
            data={filteredProperties}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handlePropertySelect(item)}
                style={({ pressed }) => ({
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: 14,
                        fontWeight: "700",
                      }}
                    >
                      {item.address}
                    </Text>
                    <Text
                      style={{
                        color: colors.muted,
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      Lat: {item.lat.toFixed(4)}, Lng: {item.lng.toFixed(4)}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: getStatusColor(item.status) + "20",
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      marginLeft: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: getStatusColor(item.status),
                        fontSize: 11,
                        fontWeight: "600",
                      }}
                    >
                      {getStatusLabel(item.status)}
                    </Text>
                  </View>
                </View>

                {/* Financial Metrics */}
                <View
                  style={{
                    backgroundColor: colors.background,
                    paddingHorizontal: 8,
                    paddingVertical: 8,
                    borderRadius: 8,
                    gap: 6,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      ARV:
                    </Text>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      ${item.arv.toLocaleString()}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      Purchase:
                    </Text>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      ${item.purchasePrice.toLocaleString()}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      Repairs:
                    </Text>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      ${item.repairCost.toLocaleString()}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      paddingHorizontal: 8,
                      paddingTop: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.success,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      Profit:
                    </Text>
                    <Text
                      style={{
                        color: colors.success,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      ${item.profitMargin.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </Pressable>
            )}
          />
        </View>
      </ScrollView>

      {/* Property Detail Modal */}
      <Modal visible={showPropertyDetail} transparent animationType="slide">
        <ScreenContainer className="bg-background">
          <ScrollView>
            {selectedProperty && (
              <View className="px-4 py-4">
                <View className="flex-row justify-between items-center mb-6">
                  <Text className="text-2xl font-bold text-foreground">
                    Property Details
                  </Text>
                  <Pressable
                    onPress={() => setShowPropertyDetail(false)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Text className="text-2xl text-foreground">✕</Text>
                  </Pressable>
                </View>

                <View className="bg-surface rounded-lg p-4 mb-4 border border-border">
                  <Text className="text-lg font-bold text-foreground mb-2">
                    {selectedProperty.address}
                  </Text>
                  <Text className="text-sm text-muted">
                    Coordinates: {selectedProperty.lat.toFixed(4)},{" "}
                    {selectedProperty.lng.toFixed(4)}
                  </Text>
                </View>

                <View className="bg-success/10 rounded-lg p-4 mb-4 border border-success">
                  <Text className="text-sm text-muted mb-2">Profit Margin</Text>
                  <Text className="text-3xl font-bold text-success">
                    ${selectedProperty.profitMargin.toLocaleString()}
                  </Text>
                </View>

                <View className="gap-3">
                  <View className="bg-surface rounded-lg p-3 border border-border">
                    <Text className="text-xs text-muted mb-1">
                      After Repair Value
                    </Text>
                    <Text className="text-xl font-bold text-foreground">
                      ${selectedProperty.arv.toLocaleString()}
                    </Text>
                  </View>
                  <View className="bg-surface rounded-lg p-3 border border-border">
                    <Text className="text-xs text-muted mb-1">
                      Purchase Price
                    </Text>
                    <Text className="text-xl font-bold text-foreground">
                      ${selectedProperty.purchasePrice.toLocaleString()}
                    </Text>
                  </View>
                  <View className="bg-surface rounded-lg p-3 border border-border">
                    <Text className="text-xs text-muted mb-1">
                      Repair Estimate
                    </Text>
                    <Text className="text-xl font-bold text-foreground">
                      ${selectedProperty.repairCost.toLocaleString()}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => setShowPropertyDetail(false)}
                  style={({ pressed }) => ({
                    backgroundColor: colors.primary,
                    paddingVertical: 12,
                    borderRadius: 10,
                    marginTop: 20,
                    opacity: pressed ? 0.8 : 1,
                    alignItems: "center",
                  })}
                >
                  <Text style={{ color: "white", fontWeight: "700" }}>
                    Close
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
}
