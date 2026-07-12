import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Modal } from 'react-native';
import { cn } from '@/lib/utils';
import { useColors } from '@/hooks/use-colors';
import type { CrisisResource } from '@/lib/crisis-service';

interface CrisisResponseModalProps {
  visible: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resources: CrisisResource[];
  onClose: () => void;
  onContactCounselor: () => void;
  onCall911: () => void;
}

/**
 * Crisis Response Modal
 * Displays crisis resources and immediate help options
 */
export function CrisisResponseModal({
  visible,
  severity,
  resources,
  onClose,
  onContactCounselor,
  onCall911,
}: CrisisResponseModalProps) {
  const colors = useColors();
  const [selectedResource, setSelectedResource] = useState<CrisisResource | null>(null);

  const getSeverityColor = () => {
    switch (severity) {
      case 'critical':
        return colors.error;
      case 'high':
        return colors.warning;
      default:
        return colors.primary;
    }
  };

  const handleCallHotline = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleTextLine = (textCode: string) => {
    // Extract phone number from text code (e.g., "HOME to 741741" -> "741741")
    const phoneMatch = textCode.match(/(\d+)$/);
    if (phoneMatch) {
      Linking.openURL(`sms:${phoneMatch[1]}`);
    }
  };

  const handleVisitWebsite = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 justify-center items-center p-4">
        <View className="bg-background rounded-2xl max-w-md w-full max-h-screen overflow-hidden">
          {/* Header */}
          <View className="bg-error p-6 border-b border-border">
            <Text className="text-2xl font-bold text-white mb-2">We&apos;re Here to Help</Text>
            <Text className="text-sm text-white/80">
              You&apos;re not alone. Reach out to someone right now.
            </Text>
          </View>

          {/* Content */}
          <ScrollView className="flex-1 p-6">
            {/* Immediate Action Buttons */}
            <View className="gap-3 mb-6">
              <Pressable
                onPress={onCall911}
                className="bg-error rounded-lg p-4 active:opacity-80"
              >
                <Text className="text-white font-bold text-center">🚨 Call 911 (Emergency)</Text>
              </Pressable>

              <Pressable
                onPress={onContactCounselor}
                className="bg-primary rounded-lg p-4 active:opacity-80"
              >
                <Text className="text-white font-bold text-center">💬 Chat with Counselor</Text>
              </Pressable>
            </View>

            {/* Resources */}
            <Text className="text-lg font-bold text-foreground mb-3">Crisis Resources</Text>

            <View className="gap-3">
              {resources.map((resource, index) => (
                <Pressable
                  key={index}
                  onPress={() => setSelectedResource(resource)}
                  className="bg-surface rounded-lg p-4 border border-border active:opacity-80"
                >
                  <Text className="font-semibold text-foreground mb-1">{resource.name}</Text>
                  <Text className="text-sm text-muted mb-2">{resource.description}</Text>

                  <View className="gap-2">
                    {resource.phone && (
                      <Pressable
                        onPress={() => handleCallHotline(resource.phone!)}
                        className="bg-primary/10 rounded px-3 py-2"
                      >
                        <Text className="text-primary font-semibold text-sm">
                          📞 Call {resource.phone}
                        </Text>
                      </Pressable>
                    )}

                    {resource.textCode && (
                      <Pressable
                        onPress={() => handleTextLine(resource.textCode!)}
                        className="bg-primary/10 rounded px-3 py-2"
                      >
                        <Text className="text-primary font-semibold text-sm">
                          💬 {resource.textCode}
                        </Text>
                      </Pressable>
                    )}

                    {resource.website && (
                      <Pressable
                        onPress={() => handleVisitWebsite(resource.website!)}
                        className="bg-primary/10 rounded px-3 py-2"
                      >
                        <Text className="text-primary font-semibold text-sm">
                          🌐 Visit Website
                        </Text>
                      </Pressable>
                    )}

                    {resource.available24_7 && (
                      <Text className="text-xs text-success">✓ Available 24/7</Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Disclaimer */}
            <View className="mt-6 p-4 bg-warning/10 rounded-lg border border-warning">
              <Text className="text-xs text-foreground">
                If you&apos;re in immediate danger, please call 911 or go to your nearest emergency room.
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="border-t border-border p-4">
            <Pressable
              onPress={onClose}
              className="bg-surface rounded-lg p-3 border border-border active:opacity-80"
            >
              <Text className="text-foreground font-semibold text-center">I&apos;m Safe, Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
