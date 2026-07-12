import { useState, useEffect } from "react";
import { View, Text, ScrollView, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform , useWindowDimensions } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { SidebarLayout, WebHeader } from "@/components/web-layout";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
  reactions?: string[];
}

interface Chat {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isGroup: boolean;
  members?: number;
}

export default function MessagesWebScreen() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [chats, setChats] = useState<Chat[]>([
    {
      id: "1",
      name: "Alex Rivera",
      lastMessage: "Thanks for the support!",
      lastMessageTime: new Date(Date.now() - 3600000),
      unreadCount: 2,
      isGroup: false,
    },
    {
      id: "2",
      name: "Creative Minds Group",
      lastMessage: "New project ideas coming soon",
      lastMessageTime: new Date(Date.now() - 7200000),
      unreadCount: 0,
      isGroup: true,
      members: 5,
    },
    {
      id: "3",
      name: "Maya Chen",
      lastMessage: "Let's collaborate!",
      lastMessageTime: new Date(Date.now() - 86400000),
      unreadCount: 0,
      isGroup: false,
    },
  ]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      senderId: "user1",
      senderName: "Alex Rivera",
      content: "Hey! How are you doing?",
      timestamp: new Date(Date.now() - 300000),
      isOwn: false,
    },
    {
      id: "2",
      senderId: "me",
      senderName: "You",
      content: "Doing great! Just working on the new features.",
      timestamp: new Date(Date.now() - 240000),
      isOwn: true,
    },
    {
      id: "3",
      senderId: "user1",
      senderName: "Alex Rivera",
      content: "That's awesome! Thanks for the support!",
      timestamp: new Date(Date.now() - 180000),
      isOwn: false,
    },
  ]);

  const [selectedChatId, setSelectedChatId] = useState<string>("1");
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedChat = chats.find((c) => c.id === selectedChatId);
  const filteredChats = chats.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;

    const newMessage: Message = {
      id: String(messages.length + 1),
      senderId: "me",
      senderName: "You",
      content: messageInput,
      timestamp: new Date(),
      isOwn: true,
    };

    setMessages([...messages, newMessage]);
    setMessageInput("");
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const ChatListItem = ({ chat }: { chat: Chat }) => (
    <Pressable
      onPress={() => setSelectedChatId(chat.id)}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        className={cn(
          "flex-row gap-3 p-3 rounded-lg border",
          selectedChatId === chat.id
            ? "bg-primary/10 border-primary"
            : "bg-transparent border-transparent hover:bg-surface"
        )}
      >
        {/* Avatar */}
        <View
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            chat.isGroup ? "bg-primary/20" : "bg-surface"
          )}
        >
          <Text className="text-lg font-bold text-primary">
            {chat.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Chat Info */}
        <View className="flex-1 justify-center min-w-0">
          <View className="flex-row justify-between items-center gap-2">
            <Text className="text-sm font-semibold text-foreground flex-1 truncate">
              {chat.name}
            </Text>
            <Text className="text-xs text-muted">{formatTime(chat.lastMessageTime)}</Text>
          </View>
          <Text className="text-xs text-muted truncate">{chat.lastMessage}</Text>
        </View>

        {/* Unread Badge */}
        {chat.unreadCount > 0 && (
          <View className="bg-primary rounded-full w-6 h-6 flex items-center justify-center">
            <Text className="text-white text-xs font-bold">{chat.unreadCount}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );

  const MessageBubble = ({ message }: { message: Message }) => (
    <View className={cn("flex-row gap-2 mb-3", message.isOwn && "justify-end")}>
      {!message.isOwn && (
        <View className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
          <Text className="text-xs font-bold text-primary">{message.senderName.charAt(0)}</Text>
        </View>
      )}

      <View
        className={cn(
          "max-w-xs px-3 py-2 rounded-lg",
          message.isOwn
            ? "bg-primary rounded-br-none"
            : "bg-surface rounded-bl-none border border-border"
        )}
      >
        {!message.isOwn && (
          <Text className="text-xs font-semibold text-muted mb-1">{message.senderName}</Text>
        )}
        <Text className={cn("text-sm", message.isOwn ? "text-white" : "text-foreground")}>
          {message.content}
        </Text>
        <Text className={cn("text-xs mt-1", message.isOwn ? "text-white/70" : "text-muted")}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
    </View>
  );

  // Mobile view
  if (!isDesktop) {
    return (
      <ScreenContainer>
        <WebHeader title="Messages" />
        <View className="flex-1 gap-4 p-4">
          {selectedChatId === null ? (
            <>
              <TextInput
                placeholder="Search messages..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="bg-surface border border-border rounded-lg px-4 py-2 text-foreground"
                placeholderTextColor={colors.muted}
              />
              <FlatList
                data={filteredChats}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ChatListItem chat={item} />}
                scrollEnabled={true}
              />
            </>
          ) : (
            <>
              <View className="flex-row items-center gap-2 pb-2 border-b border-border">
                <Pressable onPress={() => setSelectedChatId("")} className="p-2">
                  <Text className="text-primary text-lg">←</Text>
                </Pressable>
                <Text className="text-lg font-bold text-foreground">{selectedChat?.name}</Text>
              </View>

              <ScrollView className="flex-1">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </ScrollView>

              <View className="flex-row gap-2 pt-2 border-t border-border">
                <TextInput
                  placeholder="Type a message..."
                  value={messageInput}
                  onChangeText={setMessageInput}
                  className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-foreground"
                  placeholderTextColor={colors.muted}
                  multiline
                />
                <Pressable
                  onPress={handleSendMessage}
                  className="bg-primary rounded-lg p-3 justify-center"
                >
                  <Text className="text-white font-bold">Send</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScreenContainer>
    );
  }

  // Desktop view with sidebar
  return (
    <ScreenContainer>
      <WebHeader title="Messages" subtitle="Stay connected with creators" />
      <SidebarLayout
        sidebarWidth="normal"
        sidebar={
          <View className="flex-1 flex-col gap-4 p-4">
            <TextInput
              placeholder="Search messages..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="bg-background border border-border rounded-lg px-4 py-2 text-foreground text-sm"
              placeholderTextColor={colors.muted}
            />
            <ScrollView className="flex-1">
              {filteredChats.map((chat) => (
                <ChatListItem key={chat.id} chat={chat} />
              ))}
            </ScrollView>
          </View>
        }
        content={
          selectedChat ? (
            <View className="flex-1 flex-col bg-background">
              {/* Chat Header */}
              <View className="flex-row items-center justify-between gap-4 p-4 border-b border-border">
                <View className="flex-1">
                  <Text className="text-xl font-bold text-foreground">{selectedChat.name}</Text>
                  {selectedChat.isGroup && (
                    <Text className="text-sm text-muted">{selectedChat.members} members</Text>
                  )}
                </View>
                <View className="flex-row gap-2">
                  <Pressable className="p-2 hover:bg-surface rounded-lg">
                    <Text className="text-primary text-lg">📞</Text>
                  </Pressable>
                  <Pressable className="p-2 hover:bg-surface rounded-lg">
                    <Text className="text-primary text-lg">ℹ️</Text>
                  </Pressable>
                </View>
              </View>

              {/* Messages */}
              <ScrollView className="flex-1 p-4">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </ScrollView>

              {/* Input */}
              <View className="flex-row gap-3 p-4 border-t border-border">
                <TextInput
                  placeholder="Type your message..."
                  value={messageInput}
                  onChangeText={setMessageInput}
                  className="flex-1 bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                  placeholderTextColor={colors.muted}
                  multiline
                />
                <Pressable
                  onPress={handleSendMessage}
                  className="bg-primary rounded-lg px-6 py-3 justify-center"
                >
                  <Text className="text-white font-bold">Send</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-muted text-lg">Select a chat to start messaging</Text>
            </View>
          )
        }
      />
    </ScreenContainer>
  );
}
