import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

interface CreatorProfile {
  id: string;
  displayName: string;
  email: string;
  bio: string;
  category: string;
  avatar: string;
  verified: boolean;
  followers: number;
  totalEarnings: number;
  monthlyEarnings: number;
  paymentMethod: string;
  bankAccount: string;
  createdAt: string;
}

const mockCreator: CreatorProfile = {
  id: "creator-001",
  displayName: "Sarah Creative",
  email: "sarah@example.com",
  bio: "Digital artist and content creator sharing my journey",
  category: "Art",
  avatar: "🎨",
  verified: true,
  followers: 1250,
  totalEarnings: 3450.5,
  monthlyEarnings: 450.25,
  paymentMethod: "Bank Transfer",
  bankAccount: "****1234",
  createdAt: "2024-01-15",
};

export default function CreatorProfilePage() {
  const router = useRouter();
  const colors = useColors();
  const [creator, setCreator] = useState<CreatorProfile>(mockCreator);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState({
    displayName: creator.displayName,
    bio: creator.bio,
  });

  const handleSaveProfile = async () => {
    if (!editData.displayName.trim()) {
      Alert.alert("Error", "Display name is required");
      return;
    }

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCreator({
        ...creator,
        displayName: editData.displayName,
        bio: editData.bio,
      });
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 p-6 gap-6">
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <Text className="text-3xl font-bold text-foreground">Creator Profile</Text>
            <TouchableOpacity
              onPress={() => {
                if (isEditing) {
                  setEditData({
                    displayName: creator.displayName,
                    bio: creator.bio,
                  });
                }
                setIsEditing(!isEditing);
              }}
              className="bg-primary rounded-lg px-4 py-2"
            >
              <Text className="text-background font-semibold">
                {isEditing ? "Cancel" : "Edit"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Profile Header Card */}
          <View className="bg-surface rounded-lg p-6 gap-4">
            <View className="flex-row items-center gap-4">
              <Text className="text-6xl">{creator.avatar}</Text>
              <View className="flex-1 gap-1">
                {isEditing ? (
                  <TextInput
                    className="bg-background border border-border rounded-lg p-2 text-foreground font-bold"
                    value={editData.displayName}
                    onChangeText={(text) =>
                      setEditData({ ...editData, displayName: text })
                    }
                    placeholder="Display Name"
                  />
                ) : (
                  <View className="flex-row items-center gap-2">
                    <Text className="text-2xl font-bold text-foreground">
                      {creator.displayName}
                    </Text>
                    {creator.verified && <Text className="text-lg">✅</Text>}
                  </View>
                )}
                <Text className="text-sm text-muted">{creator.category}</Text>
                <Text className="text-sm text-muted">{creator.followers} followers</Text>
              </View>
            </View>

            {isEditing ? (
              <TextInput
                className="bg-background border border-border rounded-lg p-3 text-foreground"
                value={editData.bio}
                onChangeText={(text) => setEditData({ ...editData, bio: text })}
                placeholder="Bio"
                multiline
                numberOfLines={3}
              />
            ) : (
              <Text className="text-base text-foreground">{creator.bio}</Text>
            )}

            {isEditing && (
              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={loading}
                className="bg-primary rounded-lg p-3 items-center"
              >
                {loading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text className="text-background font-semibold">Save Changes</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Earnings Overview */}
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Earnings</Text>
            <View className="flex-row gap-3">
              <View className="flex-1 bg-surface rounded-lg p-4 gap-2">
                <Text className="text-sm text-muted">This Month</Text>
                <Text className="text-2xl font-bold text-primary">
                  ${creator.monthlyEarnings.toFixed(2)}
                </Text>
              </View>
              <View className="flex-1 bg-surface rounded-lg p-4 gap-2">
                <Text className="text-sm text-muted">Total Earnings</Text>
                <Text className="text-2xl font-bold text-success">
                  ${creator.totalEarnings.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Account Information */}
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Account Information</Text>
            <View className="bg-surface rounded-lg p-4 gap-4">
              <View className="gap-1">
                <Text className="text-sm text-muted">Email</Text>
                <Text className="text-base text-foreground">{creator.email}</Text>
              </View>
              <View className="gap-1">
                <Text className="text-sm text-muted">Category</Text>
                <Text className="text-base text-foreground">{creator.category}</Text>
              </View>
              <View className="gap-1">
                <Text className="text-sm text-muted">Member Since</Text>
                <Text className="text-base text-foreground">{creator.createdAt}</Text>
              </View>
            </View>
          </View>

          {/* Payment Information */}
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Payment Method</Text>
            <View className="bg-surface rounded-lg p-4 gap-4">
              <View className="gap-1">
                <Text className="text-sm text-muted">Payment Method</Text>
                <Text className="text-base text-foreground">{creator.paymentMethod}</Text>
              </View>
              <View className="gap-1">
                <Text className="text-sm text-muted">Account</Text>
                <Text className="text-base text-foreground">{creator.bankAccount}</Text>
              </View>
              <TouchableOpacity className="bg-primary rounded-lg p-3 items-center mt-2">
                <Text className="text-background font-semibold">Update Payment Method</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Quick Actions</Text>
            <View className="gap-2">
              <TouchableOpacity
                onPress={() => router.push("/creator-dashboard-option2")}
                className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between"
              >
                <Text className="text-base font-semibold text-foreground">Go to Dashboard</Text>
                <Text className="text-lg">→</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Alert.alert("Settings", "Settings page coming soon")}
                className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between"
              >
                <Text className="text-base font-semibold text-foreground">Account Settings</Text>
                <Text className="text-lg">→</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Alert.alert("Help", "Help page coming soon")}
                className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between"
              >
                <Text className="text-base font-semibold text-foreground">Help & Support</Text>
                <Text className="text-lg">→</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
