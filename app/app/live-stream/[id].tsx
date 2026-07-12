import { ScrollView, Text, View, Pressable, TextInput } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

export default function LiveStreamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const [isLive, setIsLive] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<{ user: string; text: string }[]>([]);
  const [tips, setTips] = useState(0);

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      setMessages([...messages, { user: "You", text: chatMessage }]);
      setChatMessage("");
    }
  };

  const handleTip = (amount: number) => {
    setTips(tips + amount);
    setMessages([...messages, { user: "System", text: `💰 Someone tipped $${amount}!` }]);
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-4">
          {/* Stream Header */}
          <View className="flex-row justify-between items-center">
            <Text className="text-2xl font-bold text-foreground">Live Stream</Text>
            {isLive && (
              <View className="bg-error rounded-full px-3 py-1 flex-row items-center gap-2">
                <Text className="text-white text-xs font-bold">● LIVE</Text>
              </View>
            )}
          </View>

          {/* Video Stream Area */}
          <View
            className="w-full aspect-video bg-surface rounded-2xl border-2 border-border items-center justify-center relative"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-muted text-center">
              {isLive ? "📹 Stream Active" : "📹 Ready to Stream"}
            </Text>
            {isLive && (
              <View className="absolute top-4 right-4 bg-black/50 rounded px-2 py-1">
                <Text className="text-white text-xs font-semibold">{viewers} viewers</Text>
              </View>
            )}
          </View>

          {/* Stream Stats */}
          <View className="flex-row gap-4 justify-around">
            <View className="bg-surface rounded-lg p-3 flex-1 items-center border border-border">
              <Text className="text-2xl font-bold text-primary">{viewers}</Text>
              <Text className="text-xs text-muted">Viewers</Text>
            </View>
            <View className="bg-surface rounded-lg p-3 flex-1 items-center border border-border">
              <Text className="text-2xl font-bold text-success">${tips.toFixed(2)}</Text>
              <Text className="text-xs text-muted">Tips</Text>
            </View>
            <View className="bg-surface rounded-lg p-3 flex-1 items-center border border-border">
              <Text className="text-2xl font-bold text-primary">{messages.length}</Text>
              <Text className="text-xs text-muted">Messages</Text>
            </View>
          </View>

          {/* Live Chat */}
          <View className="bg-surface rounded-lg border border-border p-3 h-40">
            <Text className="text-sm font-semibold text-foreground mb-2">Live Chat</Text>
            <ScrollView className="flex-1 mb-2">
              {messages.map((msg, idx) => (
                <View key={idx} className="mb-2">
                  <Text className="text-xs font-semibold text-primary">{msg.user}</Text>
                  <Text className="text-xs text-foreground">{msg.text}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Chat Input */}
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-foreground"
              placeholder="Send a message..."
              placeholderTextColor={colors.muted}
              value={chatMessage}
              onChangeText={setChatMessage}
              editable={isLive}
            />
            <Pressable
              onPress={handleSendMessage}
              disabled={!isLive}
              style={({ pressed }) => [
                {
                  opacity: isLive && pressed ? 0.8 : isLive ? 1 : 0.5,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: colors.primary,
                },
              ]}
            >
              <Text className="text-white font-semibold">Send</Text>
            </Pressable>
          </View>

          {/* Tip Buttons */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Quick Tips</Text>
            <View className="flex-row gap-2 flex-wrap">
              {[1, 5, 10, 25].map((amount) => (
                <Pressable
                  key={amount}
                  onPress={() => handleTip(amount)}
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.8 : 1,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: colors.primary,
                    },
                  ]}
                >
                  <Text className="text-white font-semibold">${amount}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Stream Controls */}
          <View className="flex-row gap-4 justify-center">
            <Pressable
              onPress={() => setIsLive(!isLive)}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 24,
                  backgroundColor: isLive ? colors.error : colors.primary,
                },
              ]}
            >
              <Text className="text-white font-semibold text-center">
                {isLive ? "End Stream" : "Start Stream"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 24,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text className="text-foreground font-semibold text-center">Back</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
