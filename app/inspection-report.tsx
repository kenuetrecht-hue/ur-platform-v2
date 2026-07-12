import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Image, TextInput, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

interface InspectionPhoto {
  id: string;
  uri: string;
  category: "exterior" | "interior" | "foundation" | "roof" | "plumbing" | "electrical";
  damageLevel: "none" | "minor" | "moderate" | "severe";
  notes: string;
  timestamp: string;
}

interface InspectionReport {
  id: string;
  propertyAddress: string;
  inspectionDate: string;
  inspector: string;
  overallCondition: "poor" | "fair" | "good" | "excellent";
  estimatedRepairCost: number;
  photos: InspectionPhoto[];
  summary: string;
}

export default function InspectionReport() {
  const colors = useColors();
  const [report, setReport] = useState<InspectionReport>({
    id: "insp_001",
    propertyAddress: "123 Oak Street, Austin, TX 78701",
    inspectionDate: "2024-05-29",
    inspector: "John Smith",
    overallCondition: "fair",
    estimatedRepairCost: 75000,
    photos: [
      {
        id: "photo_1",
        uri: "🏠",
        category: "exterior",
        damageLevel: "moderate",
        notes: "Roof shingles missing on south side, gutter damage",
        timestamp: "2024-05-29 09:15 AM",
      },
      {
        id: "photo_2",
        uri: "🔨",
        category: "foundation",
        damageLevel: "minor",
        notes: "Small cracks in foundation, non-structural",
        timestamp: "2024-05-29 09:45 AM",
      },
      {
        id: "photo_3",
        uri: "💧",
        category: "plumbing",
        damageLevel: "severe",
        notes: "Main water line leak, requires replacement",
        timestamp: "2024-05-29 10:30 AM",
      },
      {
        id: "photo_4",
        uri: "⚡",
        category: "electrical",
        damageLevel: "moderate",
        notes: "Outdated electrical panel, upgrade recommended",
        timestamp: "2024-05-29 11:00 AM",
      },
    ],
    summary:
      "Property requires significant repairs. Main concerns: roof damage, plumbing issues, and electrical system upgrade.",
  });

  const [selectedPhoto, setSelectedPhoto] = useState<InspectionPhoto | null>(report.photos[0]);
  const [newNote, setNewNote] = useState("");

  const damageColors = {
    none: "bg-green-900 text-green-200",
    minor: "bg-blue-900 text-blue-200",
    moderate: "bg-yellow-900 text-yellow-200",
    severe: "bg-red-900 text-red-200",
  };

  const categoryIcons = {
    exterior: "🏠",
    interior: "🏠",
    foundation: "🔨",
    roof: "🏘️",
    plumbing: "💧",
    electrical: "⚡",
  };

  const totalDamageCount = {
    none: report.photos.filter((p) => p.damageLevel === "none").length,
    minor: report.photos.filter((p) => p.damageLevel === "minor").length,
    moderate: report.photos.filter((p) => p.damageLevel === "moderate").length,
    severe: report.photos.filter((p) => p.damageLevel === "severe").length,
  };

  const handleAddNote = () => {
    if (selectedPhoto && newNote.trim()) {
      const updatedPhotos = report.photos.map((p) =>
        p.id === selectedPhoto.id ? { ...p, notes: newNote } : p
      );
      setReport({ ...report, photos: updatedPhotos });
      setSelectedPhoto({ ...selectedPhoto, notes: newNote });
      setNewNote("");
    }
  };

  return (
    <ScreenContainer className="bg-slate-900">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="gap-6 p-4">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-white">📋 Inspection Report</Text>
            <Text className="text-sm text-slate-400">{report.propertyAddress}</Text>
          </View>

          {/* Report Summary */}
          <View
            className="p-4 rounded-lg border border-slate-700 gap-3"
            style={{ backgroundColor: colors.surface }}
          >
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-sm text-slate-400 mb-1">Overall Condition</Text>
                <View
                  className={cn(
                    "px-3 py-1 rounded text-sm font-bold w-fit",
                    report.overallCondition === "poor"
                      ? "bg-red-900 text-red-200"
                      : report.overallCondition === "fair"
                        ? "bg-yellow-900 text-yellow-200"
                        : report.overallCondition === "good"
                          ? "bg-blue-900 text-blue-200"
                          : "bg-green-900 text-green-200"
                  )}
                >
                  {report.overallCondition.charAt(0).toUpperCase() + report.overallCondition.slice(1)}
                </View>
              </View>
              <View className="text-right">
                <Text className="text-sm text-slate-400 mb-1">Est. Repair Cost</Text>
                <Text className="text-lg font-bold text-orange-400">
                  ${report.estimatedRepairCost.toLocaleString()}
                </Text>
              </View>
            </View>

            <View className="pt-3 border-t border-slate-600 gap-2">
              <View className="flex-row justify-between text-xs">
                <View>
                  <Text className="text-slate-400">Inspector</Text>
                  <Text className="text-white font-semibold">{report.inspector}</Text>
                </View>
                <View className="text-right">
                  <Text className="text-slate-400">Date</Text>
                  <Text className="text-white font-semibold">{report.inspectionDate}</Text>
                </View>
              </View>
            </View>

            <View className="pt-2 border-t border-slate-600">
              <Text className="text-xs text-slate-400 mb-1">Summary</Text>
              <Text className="text-sm text-slate-200">{report.summary}</Text>
            </View>
          </View>

          {/* Damage Summary */}
          <View className="grid grid-cols-4 gap-2">
            <View
              className="p-3 rounded-lg border border-green-700 text-center"
              style={{ backgroundColor: colors.surface }}
            >
              <Text className="text-2xl mb-1">✓</Text>
              <Text className="text-xs text-slate-400">None</Text>
              <Text className="text-lg font-bold text-green-400">{totalDamageCount.none}</Text>
            </View>
            <View
              className="p-3 rounded-lg border border-blue-700 text-center"
              style={{ backgroundColor: colors.surface }}
            >
              <Text className="text-2xl mb-1">⚠️</Text>
              <Text className="text-xs text-slate-400">Minor</Text>
              <Text className="text-lg font-bold text-blue-400">{totalDamageCount.minor}</Text>
            </View>
            <View
              className="p-3 rounded-lg border border-yellow-700 text-center"
              style={{ backgroundColor: colors.surface }}
            >
              <Text className="text-2xl mb-1">⚠️⚠️</Text>
              <Text className="text-xs text-slate-400">Moderate</Text>
              <Text className="text-lg font-bold text-yellow-400">{totalDamageCount.moderate}</Text>
            </View>
            <View
              className="p-3 rounded-lg border border-red-700 text-center"
              style={{ backgroundColor: colors.surface }}
            >
              <Text className="text-2xl mb-1">🚨</Text>
              <Text className="text-xs text-slate-400">Severe</Text>
              <Text className="text-lg font-bold text-red-400">{totalDamageCount.severe}</Text>
            </View>
          </View>

          {/* Photo Gallery */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-white">📸 Inspection Photos</Text>

            {/* Photo List */}
            <View className="flex-row gap-2 pb-2 overflow-x-auto">
              {report.photos.map((photo) => (
                <Pressable
                  key={photo.id}
                  onPress={() => setSelectedPhoto(photo)}
                  className={cn(
                    "w-20 h-20 rounded-lg border-2 flex items-center justify-center active:opacity-80",
                    selectedPhoto?.id === photo.id
                      ? "border-blue-500 bg-blue-900"
                      : "border-slate-600"
                  )}
                  style={{
                    backgroundColor:
                      selectedPhoto?.id === photo.id ? "#1e3a8a" : colors.surface,
                  }}
                >
                  <Text className="text-3xl">{categoryIcons[photo.category]}</Text>
                </Pressable>
              ))}
            </View>

            {/* Selected Photo Details */}
            {selectedPhoto && (
              <View
                className="p-4 rounded-lg border border-slate-700 gap-3"
                style={{ backgroundColor: colors.surface }}
              >
                <View className="flex-row justify-between items-start">
                  <View>
                    <Text className="text-sm font-semibold text-white capitalize">
                      {selectedPhoto.category.replace("-", " ")}
                    </Text>
                    <Text className="text-xs text-slate-400 mt-1">{selectedPhoto.timestamp}</Text>
                  </View>
                  <View
                    className={cn(
                      "px-2 py-1 rounded text-xs font-semibold",
                      damageColors[selectedPhoto.damageLevel]
                    )}
                  >
                    {selectedPhoto.damageLevel.charAt(0).toUpperCase() +
                      selectedPhoto.damageLevel.slice(1)}
                  </View>
                </View>

                {/* Photo Preview */}
                <View className="w-full h-48 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-600">
                  <Text className="text-6xl">{selectedPhoto.uri}</Text>
                </View>

                {/* Notes */}
                <View className="gap-2">
                  <Text className="text-xs text-slate-400">Current Notes</Text>
                  <Text className="text-sm text-slate-200 p-2 bg-slate-800 rounded border border-slate-600">
                    {selectedPhoto.notes}
                  </Text>
                </View>

                {/* Add/Edit Notes */}
                <View className="gap-2">
                  <TextInput
                    value={newNote}
                    onChangeText={setNewNote}
                    placeholder="Add or update notes..."
                    placeholderTextColor="#64748b"
                    multiline
                    numberOfLines={3}
                    className="bg-slate-800 text-white px-3 py-2 rounded border border-slate-600 text-sm"
                  />
                  <Pressable
                    onPress={handleAddNote}
                    className="bg-blue-600 py-2 rounded active:opacity-80"
                  >
                    <Text className="text-white font-semibold text-center text-sm">
                      Update Notes
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View className="gap-2 flex-row">
            <Pressable className="flex-1 bg-green-600 py-3 rounded-lg active:opacity-80">
              <Text className="text-white font-semibold text-center">✓ Approve Report</Text>
            </Pressable>
            <Pressable className="flex-1 bg-blue-600 py-3 rounded-lg active:opacity-80">
              <Text className="text-white font-semibold text-center">📥 Export PDF</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
