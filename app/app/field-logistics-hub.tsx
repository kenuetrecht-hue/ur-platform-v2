import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  category: "inspection" | "repair" | "logistics" | "safety";
  priority: "high" | "medium" | "low";
  completed: boolean;
  dueTime: string;
  assignee: string;
}

interface Asset {
  id: string;
  name: string;
  location: string;
  status: "available" | "in-use" | "maintenance";
  lastUsed: string;
}

export default function FieldLogisticsHub() {
  const colors = useColors();
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Structural inspection - Foundation",
      category: "inspection",
      priority: "high",
      completed: false,
      dueTime: "9:00 AM",
      assignee: "Field Team Lead",
    },
    {
      id: "2",
      title: "Roof damage assessment",
      category: "inspection",
      priority: "high",
      completed: false,
      dueTime: "10:30 AM",
      assignee: "Structural Engineer",
    },
    {
      id: "3",
      title: "Electrical system check",
      category: "inspection",
      priority: "medium",
      completed: true,
      dueTime: "11:00 AM",
      assignee: "Licensed Electrician",
    },
    {
      id: "4",
      title: "Plumbing repair - Main line",
      category: "repair",
      priority: "high",
      completed: false,
      dueTime: "1:00 PM",
      assignee: "Master Plumber",
    },
    {
      id: "5",
      title: "HVAC system installation",
      category: "repair",
      priority: "medium",
      completed: false,
      dueTime: "2:00 PM",
      assignee: "HVAC Technician",
    },
    {
      id: "6",
      title: "Safety equipment check",
      category: "safety",
      priority: "high",
      completed: true,
      dueTime: "8:00 AM",
      assignee: "Safety Officer",
    },
  ]);

  const [assets, setAssets] = useState<Asset[]>([
    {
      id: "1",
      name: "Excavator - CAT 320",
      location: "Lot A - North",
      status: "in-use",
      lastUsed: "Today 8:30 AM",
    },
    {
      id: "2",
      name: "Dumpster - 20 Yard",
      location: "Lot B - South",
      status: "available",
      lastUsed: "Yesterday 5:00 PM",
    },
    {
      id: "3",
      name: "Scaffolding Set",
      location: "Storage - Building C",
      status: "maintenance",
      lastUsed: "2 days ago",
    },
    {
      id: "4",
      name: "Concrete Mixer",
      location: "Lot A - East",
      status: "available",
      lastUsed: "Today 10:00 AM",
    },
  ]);

  const toggleTask = (id: string) => {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)));
  };

  const priorityColors = {
    high: "bg-red-900 text-red-200",
    medium: "bg-yellow-900 text-yellow-200",
    low: "bg-blue-900 text-blue-200",
  };

  const categoryIcons = {
    inspection: "🔍",
    repair: "🔧",
    logistics: "📦",
    safety: "⚠️",
  };

  const statusColors = {
    "available": "bg-green-900 text-green-200",
    "in-use": "bg-blue-900 text-blue-200",
    "maintenance": "bg-orange-900 text-orange-200",
  };

  const completedTasks = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;
  const completionRate = Math.round((completedTasks / totalTasks) * 100);

  return (
    <ScreenContainer className="bg-slate-900">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="gap-6 p-4">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-white">📋 Field Logistics Hub</Text>
            <Text className="text-sm text-slate-400">Morning Tool Checklist & Asset Locator</Text>
          </View>

          {/* Daily Progress */}
          <View
            className="p-4 rounded-lg border border-slate-700 gap-3"
            style={{ backgroundColor: colors.surface }}
          >
            <View className="flex-row justify-between items-center">
              <Text className="text-sm font-semibold text-white">Daily Task Progress</Text>
              <Text className="text-lg font-bold text-blue-400">{completionRate}%</Text>
            </View>

            {/* Progress Bar */}
            <View className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <View
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${completionRate}%` }}
              />
            </View>

            <Text className="text-xs text-slate-400">
              {completedTasks} of {totalTasks} tasks completed
            </Text>
          </View>

          {/* Morning Checklist */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-white">🌅 Morning Checklist</Text>

            {tasks.map((task) => (
              <Pressable
                key={task.id}
                onPress={() => toggleTask(task.id)}
                className={cn(
                  "p-3 rounded-lg border flex-row items-start gap-3 active:opacity-80",
                  task.completed
                    ? "bg-slate-800 border-slate-600 opacity-60"
                    : "border-slate-700"
                )}
                style={{
                  backgroundColor: task.completed ? "#1e293b" : colors.surface,
                }}
              >
                {/* Checkbox */}
                <View
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5",
                    task.completed
                      ? "bg-green-600 border-green-500"
                      : "border-slate-500"
                  )}
                >
                  {task.completed && <Text className="text-white text-xs font-bold">✓</Text>}
                </View>

                {/* Task Details */}
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-lg">{categoryIcons[task.category]}</Text>
                    <Text
                      className={cn(
                        "text-sm font-semibold",
                        task.completed ? "text-slate-400 line-through" : "text-white"
                      )}
                    >
                      {task.title}
                    </Text>
                  </View>

                  <View className="flex-row gap-2 items-center">
                    <View className={cn("px-2 py-0.5 rounded text-xs font-semibold", priorityColors[task.priority])}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </View>
                    <Text className="text-xs text-slate-400">Due: {task.dueTime}</Text>
                    <Text className="text-xs text-slate-500">{task.assignee}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Asset Locator */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-white">🗺️ Asset Locator</Text>

            {assets.map((asset) => (
              <View
                key={asset.id}
                className="p-3 rounded-lg border border-slate-700"
                style={{ backgroundColor: colors.surface }}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-white">{asset.name}</Text>
                    <Text className="text-xs text-slate-400 mt-1">📍 {asset.location}</Text>
                  </View>
                  <View
                    className={cn(
                      "px-2 py-1 rounded text-xs font-semibold",
                      statusColors[asset.status as keyof typeof statusColors]
                    )}
                  >
                    {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                  </View>
                </View>

                <Text className="text-xs text-slate-400">Last Used: {asset.lastUsed}</Text>
              </View>
            ))}
          </View>

          {/* Quick Actions */}
          <View className="gap-2 flex-row">
            <Pressable className="flex-1 bg-green-600 py-3 rounded-lg active:opacity-80">
              <Text className="text-white font-semibold text-center">✓ Complete Task</Text>
            </Pressable>
            <Pressable className="flex-1 bg-blue-600 py-3 rounded-lg active:opacity-80">
              <Text className="text-white font-semibold text-center">📞 Call Supervisor</Text>
            </Pressable>
          </View>

          {/* End of Day Report */}
          <View
            className="p-4 rounded-lg border border-slate-700 gap-2"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-sm font-semibold text-white">📊 End of Day Summary</Text>
            <View className="flex-row justify-between">
              <Text className="text-xs text-slate-400">Tasks Completed:</Text>
              <Text className="text-xs font-bold text-green-400">{completedTasks}/{totalTasks}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-slate-400">Assets in Use:</Text>
              <Text className="text-xs font-bold text-blue-400">
                {assets.filter((a) => a.status === "in-use").length}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-slate-400">Assets in Maintenance:</Text>
              <Text className="text-xs font-bold text-orange-400">
                {assets.filter((a) => a.status === "maintenance").length}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
