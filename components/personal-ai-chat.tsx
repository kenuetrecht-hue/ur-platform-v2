import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { IconSymbol } from './ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

interface PersonalAIChatProps {
  visible: boolean;
  onClose: () => void;
  onCommandExecute?: (command: string) => void;
}

export function PersonalAIChat({
  visible,
  onClose,
  onCommandExecute,
}: PersonalAIChatProps) {
  const colors = useColors();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your Personal AI Assistant. I can help you with video editing, audio production, content generation, and more. What would you like to do?',
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const parseCommand = (text: string) => {
    const lowerText = text.toLowerCase();

    // Video commands
    if (lowerText.includes('crop') || lowerText.includes('video')) {
      return { type: 'video', action: 'crop', description: 'Crop video' };
    }
    if (lowerText.includes('trim')) {
      return { type: 'video', action: 'trim', description: 'Trim video' };
    }
    if (lowerText.includes('effect')) {
      return { type: 'video', action: 'effects', description: 'Add effects' };
    }

    // Audio commands
    if (lowerText.includes('mix') || lowerText.includes('audio')) {
      return { type: 'audio', action: 'mix', description: 'Mix audio tracks' };
    }
    if (lowerText.includes('reverb')) {
      return { type: 'audio', action: 'reverb', description: 'Add reverb' };
    }
    if (lowerText.includes('volume')) {
      return { type: 'audio', action: 'volume', description: 'Adjust volume' };
    }

    // Content commands
    if (lowerText.includes('chart') || lowerText.includes('graph')) {
      return { type: 'content', action: 'chart', description: 'Create chart' };
    }
    if (lowerText.includes('generate')) {
      return { type: 'content', action: 'generate', description: 'Generate content' };
    }

    return null;
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Simulate AI processing
    setTimeout(() => {
      const command = parseCommand(inputText);

      if (command) {
        // Execute command
        onCommandExecute?.(command.type);

        const aiResponse: Message = {
          id: `msg-${Date.now()}`,
          text: `I'm executing: ${command.description}. Opening the ${command.type} editor for you...`,
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiResponse]);
      } else {
        // General response
        const responses = [
          'I can help you with that! Try asking me to crop a video, mix audio, or generate a chart.',
          'That\'s interesting! Would you like me to help with video editing, audio production, or content generation?',
          'I\'m here to help with your creative projects. What production task can I assist with?',
          'Let me know what you\'d like to create or edit, and I\'ll help you get it done!',
        ];

        const aiResponse: Message = {
          id: `msg-${Date.now()}`,
          text: responses[Math.floor(Math.random() * responses.length)],
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiResponse]);
      }

      setIsLoading(false);
    }, 800);
  };

  const suggestedCommands = [
    { text: 'Crop a video', icon: 'scissors' as const },
    { text: 'Mix audio tracks', icon: 'waveform' as const },
    { text: 'Create a chart', icon: 'chart.bar.fill' as const },
    { text: 'Generate content', icon: 'sparkles' as const },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View
        style={{ flex: 1, backgroundColor: colors.background }}
        className="flex-1"
      >
        {/* Header */}
        <View
          className="flex-row items-center justify-between p-4 border-b"
          style={{ borderBottomColor: colors.border }}
        >
          <Text className="text-lg font-bold text-foreground">
            Personal AI Assistant
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="p-2"
            style={{ opacity: 0.7 }}
          >
            <IconSymbol
              name="xmark"
              size={24}
              color={colors.foreground}
            />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 p-4"
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              className={cn(
                'mb-3 flex-row',
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <View
                className={cn(
                  'max-w-xs rounded-lg p-3',
                  message.sender === 'user'
                    ? 'bg-primary'
                    : 'bg-surface border border-border'
                )}
              >
                <Text
                  className={cn(
                    'text-sm',
                    message.sender === 'user'
                      ? 'text-background'
                      : 'text-foreground'
                  )}
                >
                  {message.text}
                </Text>
                <Text
                  className={cn(
                    'text-xs mt-1',
                    message.sender === 'user'
                      ? 'text-background opacity-70'
                      : 'text-muted'
                  )}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))}

          {isLoading && (
            <View className="flex-row items-center gap-2 mb-3">
              <ActivityIndicator color={colors.primary} size="small" />
              <Text className="text-sm text-muted">AI is thinking...</Text>
            </View>
          )}
        </ScrollView>

        {/* Suggested Commands */}
        {messages.length <= 1 && (
          <View className="px-4 pb-4">
            <Text className="text-sm text-muted mb-3">Quick commands:</Text>
            <View className="flex-row flex-wrap gap-2">
              {suggestedCommands.map((cmd, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    setInputText(cmd.text);
                  }}
                  className="bg-surface border border-border rounded-full px-3 py-2"
                >
                  <Text className="text-xs text-foreground">{cmd.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Input */}
        <View
          className="flex-row items-center gap-2 p-4 border-t"
          style={{ borderTopColor: colors.border }}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything..."
            placeholderTextColor={colors.muted}
            className="flex-1 bg-surface text-foreground rounded-full px-4 py-2"
            editable={!isLoading}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
            className="bg-primary p-3 rounded-full"
            style={{ opacity: !inputText.trim() || isLoading ? 0.5 : 1 }}
          >
            <IconSymbol
              name="paperplane.fill"
              size={18}
              color={colors.background}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
