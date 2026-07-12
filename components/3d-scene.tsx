import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface AI3DObject {
  id: string;
  name: string;
  avatar: string;
  position: { x: number; y: number; z: number };
  category: string;
  isActive: boolean;
}

interface Scene3DProps {
  selectedAI?: string;
  onAISelect?: (aiId: string) => void;
  onClose?: () => void;
}

/**
 * 3D Scene Component
 * 
 * Displays an interactive 3D environment where users can:
 * - See AI specialists in a 3D space
 * - Interact with them using touch/mouse controls
 * - Rotate, zoom, and pan the view
 * - Select AI specialists to chat with
 * 
 * Uses Babylon.js for 3D rendering (works on web and mobile via Expo)
 */

export function Scene3D({ selectedAI, onAISelect, onClose }: Scene3DProps) {
  const colors = useColors();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedObject, setSelectedObject] = useState<AI3DObject | null>(null);
  const [aiObjects, setAIObjects] = useState<AI3DObject[]>([]);
  const [cameraMode, setCameraMode] = useState<"orbit" | "firstperson" | "topdown">("orbit");

  // Initialize 3D scene
  useEffect(() => {
    if (typeof window === "undefined" || !canvasRef.current) return;

    const initializeScene = async () => {
      try {
        // Dynamically import Babylon.js
        const BABYLON = await import("babylonjs");
        const canvas = canvasRef.current;

        // Create engine
        const engine = new BABYLON.Engine(canvas, true);

        // Create scene
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.15, 1);

        // Camera setup
        const camera = new BABYLON.ArcRotateCamera(
          "camera",
          Math.PI / 2,
          Math.PI / 2.5,
          100,
          new BABYLON.Vector3(0, 0, 0),
          scene
        );
        camera.attachControl(canvas, true);
        camera.wheelPrecision = 50;
        camera.inertia = 0.7;
        camera.angularSensibilityX = 1000;
        camera.angularSensibilityY = 1000;

        // Lighting
        const light1 = new BABYLON.HemisphericLight(
          "light1",
          new BABYLON.Vector3(1, 1, 1),
          scene
        );
        light1.intensity = 0.7;

        const light2 = new BABYLON.PointLight(
          "light2",
          new BABYLON.Vector3(0, 50, 0),
          scene
        );
        light2.intensity = 0.5;

        // Create ground
        const ground = BABYLON.MeshBuilder.CreateGround(
          "ground",
          { width: 200, height: 200 },
          scene
        );
          const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
        groundMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.3);
        ground.material = groundMaterial;

        // Create AI spheres (representing AI specialists)
        const aiPositions = [
          { x: -30, y: 10, z: -30, name: "Wellness Coach", avatar: "🧘" },
          { x: 30, y: 10, z: -30, name: "Fitness Trainer", avatar: "💪" },
          { x: -30, y: 10, z: 30, name: "Business Advisor", avatar: "💼" },
          { x: 30, y: 10, z: 30, name: "Creative Muse", avatar: "🎨" },
          { x: 0, y: 10, z: 0, name: "AI Hub", avatar: "🤖" },
        ];

        const spheres: AI3DObject[] = [];

        aiPositions.forEach((pos, index) => {
          const sphere = BABYLON.MeshBuilder.CreateSphere(
            `sphere_${index}`,
            { diameter: 15, segments: 32 },
            scene
          );
          sphere.position = new BABYLON.Vector3(pos.x, pos.y, pos.z);

          const material = new BABYLON.StandardMaterial(`mat_${index}`, scene);
          material.emissiveColor = new BABYLON.Color3(
            0.2 + Math.random() * 0.6,
            0.3 + Math.random() * 0.5,
            0.8
          );
          material.specularColor = new BABYLON.Color3(1, 1, 1);
          material.specularPower = 64;
          sphere.material = material;

          // Add animation
          const animation = new BABYLON.Animation(
            `anim_${index}`,
            "position.y",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
          );
          const keys = [
            { frame: 0, value: pos.y },
            { frame: 30, value: pos.y + 5 },
            { frame: 60, value: pos.y },
          ];
          animation.setKeys(keys);
          sphere.animations.push(animation);
          scene.beginAnimation(sphere, 0, 60, true);

          spheres.push({
            id: `ai_${index}`,
            name: pos.name,
            avatar: pos.avatar,
            position: pos,
            category: "specialist",
            isActive: false,
          });
        });

        setAIObjects(spheres);

        // Handle picking (clicking on objects)
        scene.onPointerDown = () => {
          const hit = scene.pick(scene.pointerX, scene.pointerY);
          if (hit?.hit) {
            const pickedMesh = hit.pickedMesh;
            const aiIndex = parseInt(pickedMesh?.name.split("_")[1] || "0");
            if (aiIndex < spheres.length) {
              setSelectedObject(spheres[aiIndex]);
              if (onAISelect) {
                onAISelect(spheres[aiIndex].id);
              }
            }
          }
        };

        // Render loop
        engine.runRenderLoop(() => {
          scene.render();
        });

        // Handle window resize
        window.addEventListener("resize", () => {
          engine.resize();
        });

        setIsLoading(false);
      } catch (error) {
        console.error("Failed to initialize 3D scene:", error);
        setIsLoading(false);
      }
    };

    initializeScene();
  }, [onAISelect]);

  return (
    <View className="flex-1 bg-background" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View
        className="px-4 py-3 border-b flex-row items-center justify-between"
        style={{ borderBottomColor: colors.border }}
      >
        <Text className="text-lg font-bold text-foreground">3D Workspace</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} className="p-2">
            <Text className="text-xl font-bold text-foreground">✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 3D Canvas (Web only) */}
      {typeof window !== "undefined" && (
        <View className="flex-1">
          {isLoading && (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={colors.primary} />
              <Text className="text-foreground mt-4">Loading 3D Scene...</Text>
            </View>
          )}
          <canvas
            ref={canvasRef}
            style={{
              width: "100%",
              height: "100%",
              display: isLoading ? "none" : "block",
            }}
          />
        </View>
      )}

      {/* Mobile Fallback */}
      {typeof window === "undefined" && (
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-2xl mb-4">📱</Text>
          <Text className="text-lg font-bold text-foreground mb-2">
            3D Scene
          </Text>
          <Text className="text-center text-muted">
            3D visualization works best on web. On mobile, use the AI Specialists tab to interact with each AI.
          </Text>
        </View>
      )}

      {/* Controls */}
      <View
        className="px-4 py-3 border-t"
        style={{ borderTopColor: colors.border }}
      >
        <Text className="text-sm font-semibold text-foreground mb-2">
          Camera Mode
        </Text>
        <View className="flex-row gap-2">
          {(["orbit", "firstperson", "topdown"] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => setCameraMode(mode)}
              className={`flex-1 py-2 rounded-lg items-center ${
                cameraMode === mode ? "bg-primary" : "bg-surface"
              }`}
            >
              <Text
                className={`text-sm font-semibold capitalize ${
                  cameraMode === mode ? "text-white" : "text-foreground"
                }`}
              >
                {mode === "firstperson" ? "1st Person" : mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Selected AI Info */}
      {selectedObject && (
        <View
          className="px-4 py-3 border-t"
          style={{ borderTopColor: colors.border }}
        >
          <Text className="text-sm text-muted mb-1">Selected</Text>
          <View className="flex-row items-center gap-3">
            <Text className="text-3xl">{selectedObject.avatar}</Text>
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">
                {selectedObject.name}
              </Text>
              <Text className="text-xs text-muted">
                Click to start voice chat
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
