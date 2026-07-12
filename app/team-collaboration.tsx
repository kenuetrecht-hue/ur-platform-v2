import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: "online" | "on-site" | "offline";
  location?: string;
  latitude?: number;
  longitude?: number;
  lastUpdate: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  senderId: string;
  message: string;
  timestamp: string;
  type: "text" | "task-assignment" | "location-update";
}

interface TaskAssignment {
  id: string;
  title: string;
  assignedTo: string;
  assignedBy: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed";
  dueTime: string;
  location: string;
}

export default function TeamCollaboration() {
  const colors = useColors();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: "member_1",
      name: "John Smith",
      role: "Field Lead",
      status: "on-site",
      location: "123 Oak Street",
      latitude: 30.2672,
      longitude: -97.7431,
      lastUpdate: "2 mins ago",
    },
    {
      id: "member_2",
      name: "Sarah Johnson",
      role: "Inspector",
      status: "on-site",
      location: "456 Maple Avenue",
      latitude: 32.7767,
      longitude: -96.797,
      lastUpdate: "5 mins ago",
    },
    {
      id: "member_3",
      name: "Mike Davis",
      role: "Plumber",
      status: "online",
      lastUpdate: "Just now",
    },
    {
      id: "member_4",
      name: "Lisa Chen",
      role: "Project Manager",
      status: "online",
      lastUpdate: "1 min ago",
    },
  ]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg_1",
      sender: "John Smith",
      senderId: "member_1",
      message: "Foundation inspection complete. Minor cracks found.",
      timestamp: "10:30 AM",
      type: "text",
    },
    {
      id: "msg_2",
      sender: "Sarah Johnson",
      senderId: "member_2",
      message: "Roof damage is more severe than expected. Recommend full replacement.",
      timestamp: "10:45 AM",
      type: "text",
    },
    {
      id: "msg_3",
      sender: "Lisa Chen",
      senderId: "member_4",
      message: "Assigning plumbing repair to Mike Davis",
      timestamp: "11:00 AM",
      type: "task-assignment",
    },
  ]);

  const [tasks, setTasks] = useState<TaskAssignment[]>([
    {
      id: "task_1",
      title: "Main water line replacement",
      assignedTo: "Mike Davis",
      assignedBy: "Lisa Chen",
      priority: "high",
      status: "pending",
      dueTime: "1:00 PM",
      location: "123 Oak Street",
    },
    {
      id: "task_2",
      title: "Electrical panel upgrade",
      assignedTo: "John Smith",
      assignedBy: "Lisa Chen",
      priority: "medium",
      status: "in-progress",
      dueTime: "3:00 PM",
      location: "123 Oak Street",
    },
  ]);

  const [newMessage, setNewMessage] = useState("");
  const [selectedTab, setSelectedTab] = useState<"chat" | "tasks" | "team">("chat");

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg: ChatMessage = {
        id: `msg_${messages.length + 1}`,
        sender: "You",
        senderId: "current_user",
        message: newMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "text",
      };
      setMessages([...messages, newMsg]);
      setNewMessage("");
    }
  };

  const handleUpdateTaskStatus = (taskId: string, newStatus: "pending" | "in-progress" | "completed") => {
    setTasks(
      tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      )
    );
  };

  const statusColors = {
    online: "bg-green-900 text-green-200",
    "on-site": "bg-blue-900 text-blue-200",
    offline: "bg-slate-700 text-slate-300",
  };

  const taskStatusColors = {
    pending: "bg-yellow-900 text-yellow-200",
    "in-progress": "bg-blue-900 text-blue-200",
    completed: "bg-green-900 text-green-200",
  };

  return (
    <ScreenContainer className="bg-slate-900">
      <View className="flex-1 gap-4 p-4">
        {/* Tab Navigation */}
        <View className="flex-row gap-2 bg-slate-800 p-1 rounded-lg">
          {["chat", "tasks", "team"].map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setSelectedTab(tab as "chat" | "tasks" | "team")}
              className={cn(
                "flex-1 py-2 rounded active:opacity-80",
                selectedTab === tab ? "bg-blue-600" : "bg-transparent"
              )}
            >
              <Text
                className={cn(
                  "text-center text-sm font-semibold capitalize",
                  selectedTab === tab ? "text-white" : "text-slate-400"
                )}
              >
                {tab === "chat" ? "💬" : tab === "tasks" ? "✓" : "👥"} {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Chat Tab */}
        {selectedTab === "chat" && (
          <View className="flex-1 gap-3">
            {/* Messages */}
            <ScrollView className="flex-1 gap-2">
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  className={cn(
                    "p-3 rounded-lg max-w-xs",
                    msg.senderId === "current_user"
                      ? "self-end bg-blue-600"
                      : "self-start"
                  )}
                  style={{
                    backgroundColor:
                      msg.senderId === "current_user"
                        ? "#2563eb"
                        : colors.surface,
                  }}
                >
                  {msg.senderId !== "current_user" && (
                    <Text className="text-xs text-slate-400 mb-1">{msg.sender}</Text>
                  )}
                  <Text
                    className={cn(
                      "text-sm",
                      msg.senderId === "current_user"
                        ? "text-white"
                        : "text-slate-200"
                    )}
                  >
                    {msg.message}
                  </Text>
                  <Text
                    className={cn(
                      "text-xs mt-1",
                      msg.senderId === "current_user"
                        ? "text-blue-200"
                        : "text-slate-500"
                    )}
                  >
                    {msg.timestamp}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Message Input */}
            <View className="flex-row gap-2">
              <TextInput
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type message..."
                placeholderTextColor="#64748b"
                className="flex-1 bg-slate-800 text-white px-3 py-2 rounded border border-slate-600 text-sm"
              />
              <Pressable
                onPress={handleSendMessage}
                className="bg-blue-600 px-4 py-2 rounded active:opacity-80"
              >
                <Text className="text-white font-semibold">Send</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Tasks Tab */}
        {selectedTab === "tasks" && (
          <ScrollView className="flex-1 gap-3">
            {tasks.map((task) => (
              <View
                key={task.id}
                className="p-4 rounded-lg border border-slate-700"
                style={{ backgroundColor: colors.surface }}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-white">{task.title}</Text>
                    <Text className="text-xs text-slate-400 mt-1">
                      Assigned to: {task.assignedTo}
                    </Text>
                  </View>
                  <View
                    className={cn(
                      "px-2 py-1 rounded text-xs font-semibold",
                      task.priority === "high"
                        ? "bg-red-900 text-red-200"
                        : task.priority === "medium"
                          ? "bg-yellow-900 text-yellow-200"
                          : "bg-blue-900 text-blue-200"
                    )}
                  >
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </View>
                </View>

                <View className="gap-2 pt-2 border-t border-slate-600">
                  <View className="flex-row justify-between text-xs">
                    <Text className="text-slate-400">Location: {task.location}</Text>
                    <Text className="text-slate-400">Due: {task.dueTime}</Text>
                  </View>

                  {/* Status Buttons */}
                  <View className="flex-row gap-2 mt-2">
                    {["pending", "in-progress", "completed"].map((status) => (
                      <Pressable
                        key={status}
                        onPress={() =>
                          handleUpdateTaskStatus(
                            task.id,
                            status as "pending" | "in-progress" | "completed"
                          )
                        }
                        className={cn(
                          "flex-1 py-2 rounded active:opacity-80",
                          task.status === status
                            ? taskStatusColors[status as keyof typeof taskStatusColors]
                            : "bg-slate-700"
                        )}
                      >
                        <Text
                          className={cn(
                            "text-xs font-semibold text-center capitalize",
                            task.status === status
                              ? "text-white"
                              : "text-slate-400"
                          )}
                        >
                          {status.replace("-", " ")}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Team Tab */}
        {selectedTab === "team" && (
          <ScrollView className="flex-1 gap-3">
            {teamMembers.map((member) => (
              <View
                key={member.id}
                className="p-4 rounded-lg border border-slate-700"
                style={{ backgroundColor: colors.surface }}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-white">{member.name}</Text>
                    <Text className="text-xs text-slate-400 mt-1">{member.role}</Text>
                  </View>
                  <View
                    className={cn(
                      "px-2 py-1 rounded text-xs font-semibold",
                      statusColors[member.status as keyof typeof statusColors]
                    )}
                  >
                    {member.status === "on-site" ? "📍" : member.status === "online" ? "🟢" : "⚫"}{" "}
                    {member.status.replace("-", " ")}
                  </View>
                </View>

                {member.location && (
                  <View className="gap-1 pt-2 border-t border-slate-600">
                    <Text className="text-xs text-slate-400">📍 {member.location}</Text>
                    <Text className="text-xs text-slate-500">Last update: {member.lastUpdate}</Text>
                    {member.latitude && member.longitude && (
                      <Text className="text-xs text-slate-500">
                        Coordinates: {member.latitude.toFixed(4)}, {member.longitude.toFixed(4)}
                      </Text>
                    )}
                  </View>
                )}

                <View className="flex-row gap-2 mt-3">
                  <Pressable className="flex-1 bg-blue-600 py-2 rounded active:opacity-80">
                    <Text className="text-white font-semibold text-center text-xs">📞 Call</Text>
                  </Pressable>
                  <Pressable className="flex-1 bg-green-600 py-2 rounded active:opacity-80">
                    <Text className="text-white font-semibold text-center text-xs">💬 Message</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </ScreenContainer>
  );
}
