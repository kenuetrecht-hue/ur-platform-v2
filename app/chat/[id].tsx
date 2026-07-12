import { useEffect, useState, useRef } from "react";
import { View, Text, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Avatar, HeaderBar } from "@/components/ur-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { Message, getMessages, getConversations, sendMessage, addPoints, Conversation } from "@/lib/store";
import * as Haptics from "expo-haptics";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!id) return;
    getConversations().then((cs) => {
      const c = cs.find((cv) => cv.id === id);
      if (c) setConv(c);
    });
    getMessages(id).then((m) => {
      setMessages(m);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    });
  }, [id]);

  async function handleSend() {
    if (!id || !text.trim() || sending) return;
    setSending(true);
    const newMsg = await sendMessage(id, text.trim());
    setMessages((prev) => [...prev, newMsg]);
    setText("");
    await addPoints(2);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    setSending(false);

    // Simulate creator reply
    setTimeout(async () => {
      if (!id) return;
      const replies = ["Thanks for reaching out! 🙌", "Got it! I'll get back to you shortly.", "Appreciate the message!", "Love the support 💪", "Awesome question — let me think on it."];
      const reply: Message = {
        id: `m${Date.now()}`,
        conversationId: id,
        senderId: conv?.creatorId || "creator",
        text: replies[Math.floor(Math.random() * replies.length)],
        timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        isOwn: false,
      };
      setMessages((prev) => [...prev, reply]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }, 1500);
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <HeaderBar
        title=""
        onBack={() => router.back()}
        right={
          conv && (
            <Pressable
              onPress={() => router.push(`/creator/${conv.creatorId}` as any)}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, opacity: pressed ? 0.7 : 1 })}
            >
              <Avatar uri={conv.creatorPhoto} size={36} />
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "600" }}>{conv.creatorName}</Text>
            </Pressable>
          )
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          keyboardShouldPersistTaps="handled"
        >
          {conv?.isPaidChat && (
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primary + "15", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
                <IconSymbol name="lock.fill" size={12} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>Private paid chat</Text>
              </View>
            </View>
          )}

          {messages.map((msg) => (
            <View
              key={msg.id}
              style={{
                flexDirection: "row",
                justifyContent: msg.isOwn ? "flex-end" : "flex-start",
              }}
            >
              <View
                style={{
                  maxWidth: "78%",
                  backgroundColor: msg.isOwn ? colors.primary : colors.surface,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 18,
                  borderBottomRightRadius: msg.isOwn ? 4 : 18,
                  borderBottomLeftRadius: msg.isOwn ? 18 : 4,
                  borderWidth: msg.isOwn ? 0 : 1,
                  borderColor: colors.border,
                  gap: 4,
                }}
              >
                <Text style={{ color: msg.isOwn ? "#FFFFFF" : colors.foreground, fontSize: 15, lineHeight: 21 }}>{msg.text}</Text>
                <Text style={{ color: msg.isOwn ? "rgba(255,255,255,0.7)" : colors.muted, fontSize: 10, alignSelf: "flex-end" }}>{msg.timestamp}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Composer */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 0.5, borderTopColor: colors.border, backgroundColor: colors.background }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={colors.muted}
            multiline
            maxLength={500}
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 10,
              fontSize: 15,
              color: colors.foreground,
              maxHeight: 100,
            }}
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || sending}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: text.trim() ? colors.primary : colors.surface,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <IconSymbol name="paperplane.fill" size={18} color={text.trim() ? "#FFFFFF" : colors.muted} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
