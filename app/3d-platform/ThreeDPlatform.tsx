import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';

interface Avatar {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
}

interface Message {
  sender: string;
  text: string;
  timestamp: Date;
}

export function ThreeDPlatform() {
  const [avatars, setAvatars] = useState<Avatar[]>([
    {
      id: 'user',
      name: 'You',
      position: { x: 0, y: 1, z: 0 },
    },
  ]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      setMessages([
        ...messages,
        {
          sender: 'You',
          text: inputMessage,
          timestamp: new Date(),
        },
      ]);
      setInputMessage('');
    }
  };

  return (
    <ScreenContainer className="p-0">
      <View className="flex-1 bg-surface">
        {/* 3D Viewport */}
        <View className="flex-1 bg-background justify-center items-center">
          <Text className="text-xl font-bold text-foreground">
            3D Collaborative Workspace
          </Text>
          <Text className="text-muted mt-2">
            Avatars Online: {avatars.length}
          </Text>

          {/* Avatar List */}
          <ScrollView className="mt-4 w-full max-h-32">
            {avatars.map((avatar) => (
              <View key={avatar.id} className="p-2 border-b border-border">
                <Text className="text-primary font-semibold">
                  {avatar.name}
                </Text>
                <Text className="text-muted text-xs">
                  Position: ({avatar.position.x}, {avatar.position.y}, {avatar.position.z})
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Chat Section */}
        <View className="flex-1 bg-surface p-4">
          <Text className="text-foreground font-bold mb-2">
            Chat in 3D Space
          </Text>

          {/* Messages */}
          <ScrollView className="flex-1 mb-4">
            {messages.map((msg, idx) => (
              <View key={idx} className="mb-3">
                <Text className="text-primary font-semibold">
                  {msg.sender}
                </Text>
                <Text className="text-foreground mt-1">
                  {msg.text}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Input */}
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 bg-background text-foreground px-3 py-2 rounded border border-border"
              placeholder="Type a message..."
              placeholderTextColor="#9BA1A6"
              value={inputMessage}
              onChangeText={setInputMessage}
            />
            <Pressable
              onPress={handleSendMessage}
              className="bg-primary px-4 py-2 rounded justify-center"
            >
              <Text className="text-background font-semibold">Send</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

export default ThreeDPlatform;
