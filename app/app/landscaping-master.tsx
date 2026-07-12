/**
 * Landscaping Master AI Screen
 * Photo-to-3D landscape design and visualization
 */

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
// Image picker would be handled by native platform

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DesignProject {
  id: string;
  name: string;
  photoUrl: string;
  style: string;
  budget: number;
  status: "planning" | "designing" | "reviewing" | "ready";
  createdAt: Date;
  updatedAt: Date;
}

interface DesignElement {
  id: string;
  type: "plant" | "hardscape" | "water" | "lighting";
  name: string;
  quantity: number;
  cost: number;
  position: { x: number; y: number };
}

// ============================================================================
// LANDSCAPING MASTER SCREEN
// ============================================================================

export default function LandscapingMasterScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<"projects" | "design" | "learn">("projects");
  const [projects, setProjects] = useState<DesignProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<DesignProject | null>(null);
  const [designElements, setDesignElements] = useState<DesignElement[]>([]);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [budget, setBudget] = useState("5000");
  const [style, setStyle] = useState("modern_minimalist");
  const fileInputRef = useRef<any>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handlePickPhoto = async () => {
    // In production, would use expo-image-picker
    // For now, use a placeholder image
    setSelectedPhoto("https://images.unsplash.com/photo-1585320806437-4fb4d2a5b3d5?w=400&h=300&fit=crop");
  };

  const handleTakePhoto = async () => {
    // In production, would use expo-image-picker camera
    // For now, use a placeholder image
    setSelectedPhoto("https://images.unsplash.com/photo-1585320806437-4fb4d2a5b3d5?w=400&h=300&fit=crop");
  };

  const handleCreateProject = async () => {
    if (!projectName || !selectedPhoto) {
      alert("Please enter project name and select a photo");
      return;
    }

    setIsLoading(true);

    try {
      // Simulate project creation
      const newProject: DesignProject = {
        id: `project-${Date.now()}`,
        name: projectName,
        photoUrl: selectedPhoto,
        style,
        budget: parseFloat(budget),
        status: "planning",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setProjects([...projects, newProject]);
      setSelectedProject(newProject);
      setProjectName("");
      setBudget("5000");
      setSelectedPhoto(null);
      setShowPhotoModal(false);
      setActiveTab("design");
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddElement = (type: string) => {
    const newElement: DesignElement = {
      id: `elem-${Date.now()}`,
      type: type as any,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
      quantity: 1,
      cost: 100,
      position: { x: Math.random() * 80, y: Math.random() * 80 },
    };

    setDesignElements([...designElements, newElement]);
  };

  const handleRemoveElement = (id: string) => {
    setDesignElements(designElements.filter((elem) => elem.id !== id));
  };

  const calculateTotalCost = () => {
    return designElements.reduce((sum, elem) => sum + elem.cost * elem.quantity, 0);
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderProjectsList = () => (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
      {projects.length === 0 ? (
        <View className="items-center justify-center py-12">
          <Text className="text-lg font-semibold text-foreground mb-2">No Projects Yet</Text>
          <Text className="text-sm text-muted text-center mb-6">
            Create your first landscape design project
          </Text>
          <TouchableOpacity
            onPress={() => setShowPhotoModal(true)}
            className="bg-primary px-6 py-3 rounded-full"
          >
            <Text className="text-background font-semibold">New Project</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="gap-4">
          {projects.map((project) => (
            <TouchableOpacity
              key={project.id}
              onPress={() => {
                setSelectedProject(project);
                setActiveTab("design");
              }}
              className="bg-surface rounded-lg overflow-hidden border border-border"
            >
              <Image
                source={{ uri: project.photoUrl }}
                className="w-full h-40"
                resizeMode="cover"
              />
              <View className="p-4">
                <Text className="text-lg font-semibold text-foreground">{project.name}</Text>
                <Text className="text-sm text-muted mt-1">{project.style}</Text>
                <View className="flex-row justify-between items-center mt-3">
                  <Text className="text-sm font-semibold text-primary">
                    Budget: ${project.budget}
                  </Text>
                  <View
                    className={cn(
                      "px-3 py-1 rounded-full",
                      project.status === "ready" && "bg-success",
                      project.status === "reviewing" && "bg-warning",
                      project.status === "designing" && "bg-primary",
                      project.status === "planning" && "bg-border"
                    )}
                  >
                    <Text className="text-xs font-semibold text-background capitalize">
                      {project.status}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderDesignTools = () => (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
      {!selectedProject ? (
        <View className="items-center justify-center py-12">
          <Text className="text-lg font-semibold text-foreground">Select a Project</Text>
        </View>
      ) : (
        <View className="gap-4">
          {/* Project Header */}
          <View className="bg-surface rounded-lg p-4 border border-border">
            <Text className="text-lg font-semibold text-foreground">{selectedProject.name}</Text>
            <Text className="text-sm text-muted mt-1">{selectedProject.style}</Text>
            <View className="flex-row gap-4 mt-3">
              <View>
                <Text className="text-xs text-muted">Budget</Text>
                <Text className="text-sm font-semibold text-foreground">
                  ${selectedProject.budget}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-muted">Used</Text>
                <Text className="text-sm font-semibold text-foreground">
                  ${calculateTotalCost()}
                </Text>
              </View>
            </View>
          </View>

          {/* 3D Preview Placeholder */}
          <View className="bg-surface rounded-lg p-4 border border-border border-dashed items-center justify-center h-48">
            <Text className="text-muted text-center">3D Landscape Preview</Text>
            <Text className="text-xs text-muted mt-2">(Interactive 3D view coming soon)</Text>
          </View>

          {/* Design Elements */}
          <View>
            <Text className="text-base font-semibold text-foreground mb-3">Design Elements</Text>

            {/* Add Element Buttons */}
            <View className="gap-2 mb-4">
              <TouchableOpacity
                onPress={() => handleAddElement("plant")}
                className="bg-primary/10 border border-primary rounded-lg p-3 flex-row items-center justify-center"
              >
                <Text className="text-primary font-semibold">+ Add Plants</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleAddElement("hardscape")}
                className="bg-primary/10 border border-primary rounded-lg p-3 flex-row items-center justify-center"
              >
                <Text className="text-primary font-semibold">+ Add Hardscape</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleAddElement("water")}
                className="bg-primary/10 border border-primary rounded-lg p-3 flex-row items-center justify-center"
              >
                <Text className="text-primary font-semibold">+ Add Water Feature</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleAddElement("lighting")}
                className="bg-primary/10 border border-primary rounded-lg p-3 flex-row items-center justify-center"
              >
                <Text className="text-primary font-semibold">+ Add Lighting</Text>
              </TouchableOpacity>
            </View>

            {/* Elements List */}
            {designElements.length > 0 && (
              <View className="gap-2">
                {designElements.map((element) => (
                  <View key={element.id} className="bg-surface rounded-lg p-3 border border-border">
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-foreground">
                          {element.name}
                        </Text>
                        <Text className="text-xs text-muted mt-1">
                          Qty: {element.quantity} × ${element.cost}
                        </Text>
                        <Text className="text-xs font-semibold text-primary mt-1">
                          ${element.cost * element.quantity}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveElement(element.id)}
                        className="bg-error/10 px-3 py-1 rounded"
                      >
                        <Text className="text-error text-xs font-semibold">Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Cost Summary */}
          {designElements.length > 0 && (
            <View className="bg-primary/10 rounded-lg p-4 border border-primary">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm font-semibold text-foreground">Total Design Cost</Text>
                <Text className="text-lg font-bold text-primary">${calculateTotalCost()}</Text>
              </View>
              <View className="flex-row justify-between items-center mt-2">
                <Text className="text-xs text-muted">Remaining Budget</Text>
                <Text
                  className={cn(
                    "text-sm font-semibold",
                    calculateTotalCost() <= selectedProject.budget
                      ? "text-success"
                      : "text-error"
                  )}
                >
                  ${selectedProject.budget - calculateTotalCost()}
                </Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View className="gap-2 mt-4">
            <TouchableOpacity className="bg-primary px-4 py-3 rounded-full items-center">
              <Text className="text-background font-semibold">Preview in 3D</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-success px-4 py-3 rounded-full items-center">
              <Text className="text-background font-semibold">Save Design</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderLearning = () => (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
      <View className="gap-4">
        <View className="bg-surface rounded-lg p-4 border border-border">
          <Text className="text-base font-semibold text-foreground mb-2">
            Landscaping Certification
          </Text>
          <Text className="text-sm text-muted mb-3">
            Prepare for your professional landscaping certification with our comprehensive study
            materials.
          </Text>
          <TouchableOpacity className="bg-primary px-4 py-2 rounded-lg items-center">
            <Text className="text-background font-semibold text-sm">Start Learning</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-surface rounded-lg p-4 border border-border">
          <Text className="text-base font-semibold text-foreground mb-2">Plant Database</Text>
          <Text className="text-sm text-muted mb-3">
            Browse 500+ plants with detailed growing requirements, maintenance tips, and design
            recommendations.
          </Text>
          <TouchableOpacity className="bg-primary px-4 py-2 rounded-lg items-center">
            <Text className="text-background font-semibold text-sm">Explore Plants</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-surface rounded-lg p-4 border border-border">
          <Text className="text-base font-semibold text-foreground mb-2">Design Principles</Text>
          <Text className="text-sm text-muted mb-3">
            Learn professional landscape design principles, color theory, and layout techniques.
          </Text>
          <TouchableOpacity className="bg-primary px-4 py-2 rounded-lg items-center">
            <Text className="text-background font-semibold text-sm">View Tutorials</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ScreenContainer className="bg-background">
      {/* Header */}
      <View className="bg-primary px-6 py-4">
        <Text className="text-2xl font-bold text-background">Landscaping Master</Text>
        <Text className="text-sm text-background/80 mt-1">Design your landscape before you build</Text>
      </View>

      {/* Tab Navigation */}
      <View className="flex-row border-b border-border">
        {(["projects", "design", "learn"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-4 items-center border-b-2",
              activeTab === tab ? "border-primary" : "border-transparent"
            )}
          >
            <Text
              className={cn(
                "text-sm font-semibold capitalize",
                activeTab === tab ? "text-primary" : "text-muted"
              )}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === "projects" && renderProjectsList()}
      {activeTab === "design" && renderDesignTools()}
      {activeTab === "learn" && renderLearning()}

      {/* Create Project Modal */}
      <Modal visible={showPhotoModal} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/50 items-center justify-center p-4">
          <View className="bg-background rounded-lg w-full max-w-md p-6 gap-4">
            <Text className="text-lg font-bold text-foreground">New Landscape Project</Text>

            {/* Photo Section */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">1. Upload Yard Photo</Text>
              {selectedPhoto ? (
                <View>
                  <Image
                    source={{ uri: selectedPhoto }}
                    className="w-full h-48 rounded-lg"
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => setSelectedPhoto(null)}
                    className="mt-2 bg-error/10 px-4 py-2 rounded-lg items-center"
                  >
                    <Text className="text-error text-sm font-semibold">Change Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="gap-2">
                  <TouchableOpacity
                    onPress={handlePickPhoto}
                    className="bg-primary/10 border border-primary rounded-lg p-4 items-center"
                  >
                    <Text className="text-primary font-semibold">Choose from Gallery</Text>
                  </TouchableOpacity>
                  {Platform.OS !== "web" && (
                    <TouchableOpacity
                      onPress={handleTakePhoto}
                      className="bg-primary/10 border border-primary rounded-lg p-4 items-center"
                    >
                      <Text className="text-primary font-semibold">Take Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Project Details */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">2. Project Details</Text>
              <TextInput
                placeholder="Project Name"
                value={projectName}
                onChangeText={setProjectName}
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                placeholderTextColor={colors.muted}
              />
              <TextInput
                placeholder="Budget ($)"
                value={budget}
                onChangeText={setBudget}
                keyboardType="decimal-pad"
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                placeholderTextColor={colors.muted}
              />
            </View>

            {/* Style Selection */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">3. Design Style</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="gap-2"
                contentContainerStyle={{ gap: 8 }}
              >
                {["modern_minimalist", "traditional_formal", "cottage_garden", "xeriscaping"].map(
                  (s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setStyle(s)}
                      className={cn(
                        "px-4 py-2 rounded-full border",
                        style === s
                          ? "bg-primary border-primary"
                          : "bg-surface border-border"
                      )}
                    >
                      <Text
                        className={cn(
                          "text-xs font-semibold capitalize",
                          style === s ? "text-background" : "text-foreground"
                        )}
                      >
                        {s.replace(/_/g, " ")}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </ScrollView>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-2 mt-4">
              <TouchableOpacity
                onPress={() => setShowPhotoModal(false)}
                className="flex-1 bg-surface border border-border rounded-lg py-3 items-center"
              >
                <Text className="text-foreground font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateProject}
                disabled={isLoading}
                className="flex-1 bg-primary rounded-lg py-3 items-center"
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text className="text-background font-semibold">Create Project</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
