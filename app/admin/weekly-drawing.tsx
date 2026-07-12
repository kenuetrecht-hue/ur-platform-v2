import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Alert, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

interface DrawingEntry {
  id: number;
  userId: number;
  userName: string;
  entryCount: number;
  sourceType: "scratch_off" | "tier_1_lifetime" | "promotion" | "admin";
}

interface DrawingWinner {
  id: number;
  userId: number;
  userName: string;
  prizeDescription: string;
  prizeValue: string;
  claimedAt: string | null;
}

export default function WeeklyDrawingAdminScreen() {
  const colors = useColors();
  const [currentWeek, setCurrentWeek] = useState("2026-W22");
  const [entries, setEntries] = useState<DrawingEntry[]>([
    { id: 1, userId: 101, userName: "Alex Rivera", entryCount: 5, sourceType: "scratch_off" },
    { id: 2, userId: 102, userName: "Maya Chen", entryCount: 2, sourceType: "tier_1_lifetime" },
    { id: 3, userId: 103, userName: "Jordan Smith", entryCount: 8, sourceType: "scratch_off" },
    { id: 4, userId: 104, userName: "Casey Johnson", entryCount: 3, sourceType: "promotion" },
    { id: 5, userId: 105, userName: "Taylor Brown", entryCount: 1, sourceType: "tier_1_lifetime" },
  ]);

  const [winners, setWinners] = useState<DrawingWinner[]>([]);
  const [selectedWinners, setSelectedWinners] = useState<number[]>([]);
  const [drawingInProgress, setDrawingInProgress] = useState(false);
  const [totalEntries, setTotalEntries] = useState(0);

  useEffect(() => {
    const total = entries.reduce((sum, entry) => sum + entry.entryCount, 0);
    setTotalEntries(total);
  }, [entries]);

  const performDrawing = () => {
    Alert.alert(
      "Perform Weekly Drawing?",
      `This will select 5 winners from ${totalEntries} total entries for week ${currentWeek}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Draw Winners",
          onPress: async () => {
            setDrawingInProgress(true);

            // Simulate drawing process
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Weighted random selection based on entry count
            const newWinners: DrawingWinner[] = [];
            const selectedIds = new Set<number>();

            for (let i = 0; i < 5; i++) {
              let winner: DrawingEntry | null = null;
              let attempts = 0;

              while (!winner && attempts < 10) {
                const random = Math.random() * totalEntries;
                let sum = 0;

                for (const entry of entries) {
                  sum += entry.entryCount;
                  if (random <= sum && !selectedIds.has(entry.userId)) {
                    winner = entry;
                    break;
                  }
                }
                attempts++;
              }

              if (winner) {
                selectedIds.add(winner.userId);
                const prizes = [
                  { desc: "Premium Membership (3 Months)", value: "$24.99" },
                  { desc: "Creator Boost (30 Days)", value: "$19.99" },
                  { desc: "Exclusive Content Pack", value: "$14.99" },
                  { desc: "500 Loyalty Points", value: "$9.99" },
                  { desc: "Ad-Free (6 Months)", value: "$29.99" },
                ];

                newWinners.push({
                  id: newWinners.length + 1,
                  userId: winner.userId,
                  userName: winner.userName,
                  prizeDescription: prizes[i].desc,
                  prizeValue: prizes[i].value,
                  claimedAt: null,
                });
              }
            }

            setWinners(newWinners);
            setDrawingInProgress(false);
            Alert.alert("Success!", "5 winners have been selected!");
          },
        },
      ]
    );
  };

  const notifyWinner = (winner: DrawingWinner) => {
    Alert.alert(
      "Send Notification",
      `Notify ${winner.userName} that they won ${winner.prizeDescription}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: () => {
            Alert.alert("Sent!", `Notification sent to ${winner.userName}`);
          },
        },
      ]
    );
  };

  const claimWinner = (winnerId: number) => {
    setWinners((prev) =>
      prev.map((w) => (w.id === winnerId ? { ...w, claimedAt: new Date().toISOString() } : w))
    );
  };

  return (
    <ScreenContainer>
      <ScrollView className="flex-1 p-4 gap-6">
        {/* Header */}
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">Weekly Drawing Admin</Text>
          <Text className="text-base text-muted">Manage and execute weekly prize drawings</Text>
        </View>

        {/* Week Info */}
        <View className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-6 gap-3 border-2 border-blue-300">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-semibold text-blue-700">Current Drawing Week</Text>
              <Text className="text-2xl font-bold text-blue-900">{currentWeek}</Text>
            </View>
            <View className="items-end">
              <Text className="text-sm font-semibold text-purple-700">Total Entries</Text>
              <Text className="text-2xl font-bold text-purple-900">{totalEntries}</Text>
            </View>
          </View>
        </View>

        {/* Drawing Entries */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-foreground">Entries ({entries.length})</Text>
            <View className="bg-purple-100 px-3 py-1 rounded-full">
              <Text className="text-xs font-bold text-purple-700">{totalEntries} total</Text>
            </View>
          </View>

          {entries.map((entry) => (
            <View key={entry.id} className="bg-white rounded-xl border-2 border-gray-200 p-4 flex-row items-center gap-3">
              <View className="flex-1">
                <Text className="text-base font-bold text-foreground">{entry.userName}</Text>
                <Text className="text-xs text-muted mt-1">
                  {entry.entryCount} entries • {entry.sourceType.replace(/_/g, " ")}
                </Text>
              </View>
              <View className="bg-purple-100 px-3 py-2 rounded-lg items-center">
                <Text className="text-lg font-bold text-purple-700">{entry.entryCount}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Draw Button */}
        <Pressable
          onPress={performDrawing}
          disabled={drawingInProgress || winners.length > 0}
          className={cn(
            "px-6 py-4 rounded-xl items-center",
            drawingInProgress || winners.length > 0 ? "bg-gray-300 opacity-50" : "bg-gradient-to-r from-purple-500 to-blue-500"
          )}
        >
          <Text className="text-white font-bold text-lg">
            {drawingInProgress ? "Drawing..." : winners.length > 0 ? "Drawing Complete" : "Perform Drawing"}
          </Text>
        </Pressable>

        {/* Winners Section */}
        {winners.length > 0 && (
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">🏆 Winners ({winners.length})</Text>
              <View className="bg-green-100 px-3 py-1 rounded-full">
                <Text className="text-xs font-bold text-green-700">Selected</Text>
              </View>
            </View>

            {winners.map((winner, index) => (
              <View key={winner.id} className="bg-gradient-to-r from-yellow-50 to-green-50 rounded-xl border-2 border-yellow-300 p-4 gap-3">
                {/* Rank */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-2xl font-bold text-yellow-600">#{index + 1}</Text>
                    <View>
                      <Text className="text-base font-bold text-foreground">{winner.userName}</Text>
                      <Text className="text-xs text-muted">User ID: {winner.userId}</Text>
                    </View>
                  </View>
                  {winner.claimedAt ? (
                    <View className="bg-green-200 px-3 py-1 rounded-full">
                      <Text className="text-xs font-bold text-green-700">✓ Claimed</Text>
                    </View>
                  ) : (
                    <View className="bg-orange-200 px-3 py-1 rounded-full">
                      <Text className="text-xs font-bold text-orange-700">Pending</Text>
                    </View>
                  )}
                </View>

                {/* Prize */}
                <View className="bg-white rounded-lg p-3 gap-1">
                  <Text className="text-sm font-bold text-foreground">Prize</Text>
                  <Text className="text-base font-bold text-purple-600">{winner.prizeDescription}</Text>
                  <Text className="text-xs text-muted">{winner.prizeValue} value</Text>
                </View>

                {/* Actions */}
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => notifyWinner(winner)}
                    disabled={winner.claimedAt !== null}
                    className="flex-1 bg-blue-500 px-3 py-2 rounded-lg items-center active:opacity-80"
                  >
                    <Text className="text-white font-bold text-sm">Notify</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => claimWinner(winner.id)}
                    disabled={winner.claimedAt !== null}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg items-center",
                      winner.claimedAt ? "bg-gray-300 opacity-50" : "bg-green-500 active:opacity-80"
                    )}
                  >
                    <Text className="text-white font-bold text-sm">
                      {winner.claimedAt ? "Claimed" : "Mark Claimed"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Info */}
        <View className="bg-blue-50 rounded-xl border-2 border-blue-200 p-4 gap-2">
          <Text className="text-sm font-bold text-blue-900">📋 Drawing Process</Text>
          <Text className="text-xs text-blue-800">
            1. Review all entries for the week{"\n"}
            2. Click &quot;Perform Drawing&quot; to select 5 winners{"\n"}
            3. Send notifications to winners{"\n"}
            4. Mark prizes as claimed when received
          </Text>
        </View>

        <View className="pb-4" />
      </ScrollView>
    </ScreenContainer>
  );
}
