/**
 * Mobile File Manager & Transfer Component
 * Download files from web, manage locally, transfer to equipment on job site
 */

import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { PageHeader } from "@/components/page-header";
import { DemoSection, DemoButton, DemoFeatureList } from "@/components/demo-section";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ProjectFile {
  id: string;
  name: string;
  format: string;
  size: number;
  createdAt: Date;
  syncedAt?: Date;
  status: "local" | "synced" | "syncing";
  projectName: string;
}

interface ConnectedEquipment {
  id: string;
  name: string;
  type: "3d_printer" | "cnc_machine" | "robotics" | "other";
  connectivity: "usb" | "wifi" | "bluetooth" | "sd_card";
  status: "connected" | "disconnected";
  signalStrength?: number;
}

interface FileTransferJob {
  id: string;
  fileName: string;
  equipmentName: string;
  progress: number;
  status: "queued" | "transferring" | "completed" | "failed";
  speed?: number;
  timeRemaining?: number;
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * File Status Badge
 */
function FileStatusBadge({ status }: { status: "local" | "synced" | "syncing" }) {
  const statusConfig = {
    local: { icon: "📱", label: "Local", color: "bg-blue-100 dark:bg-blue-900/30" },
    synced: { icon: "☁️", label: "Synced", color: "bg-green-100 dark:bg-green-900/30" },
    syncing: { icon: "🔄", label: "Syncing", color: "bg-yellow-100 dark:bg-yellow-900/30" },
  };

  const config = statusConfig[status];

  return (
    <View className={cn("rounded-full px-2 py-1 flex-row items-center gap-1", config.color)}>
      <Text>{config.icon}</Text>
      <Text className="text-xs font-semibold text-foreground">{config.label}</Text>
    </View>
  );
}

/**
 * Equipment Connection Card
 */
function EquipmentConnectionCard({
  equipment,
  onConnect,
}: {
  equipment: ConnectedEquipment;
  onConnect: () => void;
}) {
  const colors = useColors();
  const equipmentIcons = {
    "3d_printer": "🖨️",
    cnc_machine: "🔧",
    robotics: "🤖",
    other: "⚙️",
  };

  return (
    <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2 flex-1">
          <Text className="text-2xl">{equipmentIcons[equipment.type]}</Text>
          <View className="flex-1">
            <Text className="font-semibold text-foreground">{equipment.name}</Text>
            <Text className="text-xs text-muted">{equipment.connectivity.toUpperCase()}</Text>
          </View>
        </View>
        <View
          className={cn(
            "w-3 h-3 rounded-full",
            equipment.status === "connected" ? "bg-green-500" : "bg-gray-400"
          )}
        />
      </View>

      {equipment.signalStrength !== undefined && (
        <View className="mb-2">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-xs text-muted">Signal</Text>
            <Text className="text-xs font-semibold text-foreground">{equipment.signalStrength}%</Text>
          </View>
          <View className="h-1 bg-border rounded-full overflow-hidden">
            <View
              className="h-full bg-primary"
              style={{ width: `${equipment.signalStrength}%` }}
            />
          </View>
        </View>
      )}

      <DemoButton
        label={equipment.status === "connected" ? "✓ Connected" : "Connect"}
        onPress={onConnect}
        variant={equipment.status === "connected" ? "primary" : "primary"}
      />
    </View>
  );
}

/**
 * Project File Card
 */
function ProjectFileCard({
  file,
  onDownload,
  onTransfer,
}: {
  file: ProjectFile;
  onDownload: () => void;
  onTransfer: () => void;
}) {
  const formatIcons: Record<string, string> = {
    stl: "🖨️",
    gltf: "🎨",
    obj: "📦",
    gcode: "⚙️",
    nc: "🔧",
    pdf: "📄",
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-center gap-2 flex-1">
          <Text className="text-2xl">{formatIcons[file.format] || "📁"}</Text>
          <View className="flex-1">
            <Text className="font-semibold text-foreground">{file.name}</Text>
            <Text className="text-xs text-muted">{file.projectName}</Text>
          </View>
        </View>
        <FileStatusBadge status={file.status} />
      </View>

      <View className="flex-row justify-between mb-3">
        <Text className="text-xs text-muted">{formatSize(file.size)}</Text>
        <Text className="text-xs text-muted">
          {file.syncedAt ? `Synced ${new Date(file.syncedAt).toLocaleDateString()}` : "Local only"}
        </Text>
      </View>

      <View className="flex-row gap-2">
        <Pressable
          className="flex-1 bg-primary rounded-lg py-2 active:opacity-70"
          onPress={onDownload}
        >
          <Text className="text-center text-white font-semibold text-sm">📥 Download</Text>
        </Pressable>
        <Pressable
          className="flex-1 bg-secondary rounded-lg py-2 active:opacity-70"
          onPress={onTransfer}
        >
          <Text className="text-center text-white font-semibold text-sm">📤 Transfer</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * File Transfer Progress Card
 */
function FileTransferProgressCard({ job }: { job: FileTransferJob }) {
  const statusColors = {
    queued: "bg-gray-100 dark:bg-gray-900/30",
    transferring: "bg-blue-100 dark:bg-blue-900/30",
    completed: "bg-green-100 dark:bg-green-900/30",
    failed: "bg-red-100 dark:bg-red-900/30",
  };

  const statusIcons = {
    queued: "⏳",
    transferring: "📤",
    completed: "✅",
    failed: "❌",
  };

  return (
    <View className={cn("rounded-lg p-4 mb-3", statusColors[job.status])}>
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2 flex-1">
          <Text className="text-lg">{statusIcons[job.status]}</Text>
          <View className="flex-1">
            <Text className="font-semibold text-foreground text-sm">{job.fileName}</Text>
            <Text className="text-xs text-muted">{job.equipmentName}</Text>
          </View>
        </View>
        <Text className="text-sm font-bold text-foreground">{job.progress}%</Text>
      </View>

      <View className="h-2 bg-border rounded-full overflow-hidden mb-2">
        <View
          className="h-full bg-primary"
          style={{ width: `${job.progress}%` }}
        />
      </View>

      {job.status === "transferring" && (
        <View className="flex-row justify-between">
          <Text className="text-xs text-muted">{job.speed || 0} KB/s</Text>
          <Text className="text-xs text-muted">{job.timeRemaining || 0}s remaining</Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Mobile File Manager Screen
 */
export function MobileFileManager() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<"files" | "equipment" | "transfers">("files");

  // Mock data
  const mockFiles: ProjectFile[] = [
    {
      id: "file-1",
      name: "concrete_house_v3.stl",
      format: "stl",
      size: 45000000,
      createdAt: new Date(),
      syncedAt: new Date(),
      status: "synced",
      projectName: "3D Concrete House",
    },
    {
      id: "file-2",
      name: "aerodynamics_design.gltf",
      format: "gltf",
      size: 12500000,
      createdAt: new Date(),
      status: "local",
      projectName: "Factory Aerodynamics",
    },
  ];

  const mockEquipment: ConnectedEquipment[] = [
    {
      id: "eq-1",
      name: "Prusa i3 MK3S+",
      type: "3d_printer",
      connectivity: "usb",
      status: "connected",
      signalStrength: 100,
    },
    {
      id: "eq-2",
      name: "Haas VF-2 CNC",
      type: "cnc_machine",
      connectivity: "wifi",
      status: "connected",
      signalStrength: 85,
    },
  ];

  const mockTransfers: FileTransferJob[] = [
    {
      id: "transfer-1",
      fileName: "concrete_house_v3.stl",
      equipmentName: "Prusa i3 MK3S+",
      progress: 75,
      status: "transferring",
      speed: 250,
      timeRemaining: 45,
    },
  ];

  const handleDownloadFile = (fileId: string) => {
    Alert.alert("Download", `Downloading file ${fileId}...`);
  };

  const handleTransferFile = (fileId: string) => {
    Alert.alert("Transfer", `Select equipment to transfer file ${fileId}`);
  };

  const handleConnectEquipment = (equipmentId: string) => {
    Alert.alert("Connect", `Connecting to equipment ${equipmentId}...`);
  };

  return (
    <ScreenContainer>
      <PageHeader
        icon="📁"
        title="File Manager"
        subtitle="Download and transfer designs to equipment"
        category="system"
      />

      {/* Tab Navigation */}
      <View className="flex-row gap-2 mb-4">
        {(["files", "equipment", "transfers"] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg active:opacity-70",
              activeTab === tab ? "bg-primary" : "bg-surface border-2 border-border"
            )}
          >
            <Text
              className={cn(
                "text-center font-semibold text-sm",
                activeTab === tab ? "text-white" : "text-foreground"
              )}
            >
              {tab === "files" ? "📁 Files" : tab === "equipment" ? "⚙️ Equipment" : "📤 Transfers"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 mb-4">
        {/* Files Tab */}
        {activeTab === "files" && (
          <>
            <DemoSection
              title="Project Files"
              description="Download from web, manage locally"
              icon="📁"
              variant="info"
            >
              <DemoFeatureList
                features={[
                  "Sync files from web to mobile",
                  "Organize by project",
                  "View file details",
                  "Transfer to equipment",
                  "Manage storage",
                ]}
              />
            </DemoSection>

            {mockFiles.map((file) => (
              <ProjectFileCard
                key={file.id}
                file={file}
                onDownload={() => handleDownloadFile(file.id)}
                onTransfer={() => handleTransferFile(file.id)}
              />
            ))}
          </>
        )}

        {/* Equipment Tab */}
        {activeTab === "equipment" && (
          <>
            <DemoSection
              title="Connected Equipment"
              description="Manage connections and transfers"
              icon="⚙️"
              variant="info"
            >
              <DemoFeatureList
                features={[
                  "USB, WiFi, Bluetooth, Ethernet",
                  "Real-time connection status",
                  "Signal strength monitoring",
                  "Quick connect/disconnect",
                  "Equipment profiles",
                ]}
              />
            </DemoSection>

            {mockEquipment.map((equipment) => (
              <EquipmentConnectionCard
                key={equipment.id}
                equipment={equipment}
                onConnect={() => handleConnectEquipment(equipment.id)}
              />
            ))}

            <DemoSection title="Add New Equipment" icon="➕">
              <DemoButton
                label="🔍 Scan for Equipment"
                onPress={() => Alert.alert("Scan", "Scanning for nearby equipment...")}
                variant="primary"
              />
            </DemoSection>
          </>
        )}

        {/* Transfers Tab */}
        {activeTab === "transfers" && (
          <>
            <DemoSection
              title="File Transfers"
              description="Track upload/download progress"
              icon="📤"
              variant="info"
            >
              <DemoFeatureList
                features={[
                  "Real-time progress tracking",
                  "Speed monitoring",
                  "Time estimation",
                  "Pause/resume transfers",
                  "Transfer history",
                ]}
              />
            </DemoSection>

            {mockTransfers.map((transfer) => (
              <FileTransferProgressCard key={transfer.id} job={transfer} />
            ))}

            <DemoSection title="Transfer History" icon="📜">
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-sm text-foreground">concrete_house_v2.stl</Text>
                  <Text className="text-xs text-muted">✅ Completed</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-foreground">aerodynamics_v1.gltf</Text>
                  <Text className="text-xs text-muted">✅ Completed</Text>
                </View>
              </View>
            </DemoSection>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

export default MobileFileManager;
