/**
 * Admin Content Generation Portal
 * Voice-to-post feature for creating content with affiliate links
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import * as Audio from 'expo-audio';
import * as Haptics from 'expo-haptics';

interface ContentState {
  voiceInput: string;
  isRecording: boolean;
  recordingTime: number;
  generatedPost: string;
  selectedPlatforms: ('tiktok' | 'instagram' | 'twitter')[];
  showPreview: boolean;
  isProcessing: boolean;
  selectedAffiliateLinks: string[];
  contentTopic: string;
  contentCategory: string;
}

interface GeneratedContent {
  mainPost: string;
  tiktokCaption: string;
  instagramCaption: string;
  twitterCaption: string;
  affiliateLinks: string[];
}

const CONTENT_CATEGORIES = [
  'Wellness Tips',
  'Fitness Advice',
  'Mental Health',
  'Product Recommendations',
  'Educational Content',
  'Entertainment',
  'Community Updates',
];

export default function AdminContentPortalScreen() {
  const colors = useColors();
  const [state, setState] = useState<ContentState>({
    voiceInput: '',
    isRecording: false,
    recordingTime: 0,
    generatedPost: '',
    selectedPlatforms: [],
    showPreview: false,
    isProcessing: false,
    selectedAffiliateLinks: [],
    contentTopic: '',
    contentCategory: '',
  });

  const [recordingInstance, setRecordingInstance] = useState<any>(null);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  useEffect(() => {
    if (state.isRecording) {
      const interval = setInterval(() => {
        setState((prev) => ({
          ...prev,
          recordingTime: prev.recordingTime + 1,
        }));
      }, 1000);
      setTimerInterval(interval as any);
    } else if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [state.isRecording, timerInterval]);

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      const recording = new (Audio as any).Recording();
      await recording.prepareToRecordAsync((Audio as any).RecordingPresets.HIGH_QUALITY);
      await recording.startAsync();

      setRecordingInstance(recording);
      setState((prev) => ({
        ...prev,
        isRecording: true,
        recordingTime: 0,
      }));

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = async () => {
    if (!recordingInstance) return;

    try {
      await recordingInstance.stopAndUnloadAsync();
      const uri = recordingInstance.getURI();

      setState((prev) => ({
        ...prev,
        isRecording: false,
        voiceInput: uri || '',
      }));

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const generateContent = async () => {
    if (!state.contentTopic && !state.voiceInput) {
      alert('Please enter a topic or record a voice note');
      return;
    }

    setState((prev) => ({ ...prev, isProcessing: true }));

    try {
      // Simulate AI content generation
      // In production, this would call your AI service
      const mainPost = `💡 ${state.contentTopic || 'Topic'}\n\nThis is AI-generated content based on your input. Remember to add your affiliate links!\n\n#UR #CreatorEconomy`;

      const tiktokCaption = `Check this out! ${state.contentTopic} 🎬 #FYP #Creator`;

      const instagramCaption = `${state.contentTopic}\n\n✨ What do you think?\n\n#Creator #Community #Wellness`;

      const twitterCaption = `🧵 ${state.contentTopic} - Here's what you need to know...`;

      setGeneratedContent({
        mainPost,
        tiktokCaption,
        instagramCaption,
        twitterCaption,
        affiliateLinks: state.selectedAffiliateLinks,
      });

      setState((prev) => ({
        ...prev,
        generatedPost: mainPost,
        showPreview: true,
        isProcessing: false,
      }));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to generate content:', error);
      setState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const publishContent = async () => {
    if (!generatedContent) return;

    setState((prev) => ({ ...prev, isProcessing: true }));

    try {
      // In production, this would:
      // 1. Post to app community board
      // 2. Send to Zapier/Buffer for cross-posting
      // 3. Track affiliate links
      // 4. Log audit trail

      console.log('Publishing content:', {
        mainPost: generatedContent.mainPost,
        platforms: state.selectedPlatforms,
        affiliateLinks: generatedContent.affiliateLinks,
      });

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        showPreview: false,
        contentTopic: '',
        voiceInput: '',
        selectedPlatforms: [],
        selectedAffiliateLinks: [],
      }));

      alert('✅ Content published successfully!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to publish content:', error);
      setState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View className="px-4 py-6 border-b border-border">
          <Text className="text-3xl font-bold text-foreground mb-2">📝 Content Portal</Text>
          <Text className="text-sm text-muted">Create posts with AI assistance</Text>
        </View>

        {/* Voice Input Section */}
        <View className="px-4 py-6 gap-4">
          <Text className="text-lg font-semibold text-foreground">🎤 Voice Input</Text>

          {/* Recording Button */}
          <TouchableOpacity
            onPress={state.isRecording ? stopRecording : startRecording}
            style={{
              backgroundColor: state.isRecording ? '#EF4444' : colors.primary,
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              opacity: state.isProcessing ? 0.6 : 1,
            }}
            disabled={state.isProcessing}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
              {state.isRecording ? `⏹️ Stop Recording (${formatTime(state.recordingTime)})` : '🎙️ Start Recording'}
            </Text>
          </TouchableOpacity>

          {state.voiceInput && (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 12,
                borderLeftWidth: 4,
                borderLeftColor: colors.primary,
              }}
            >
              <Text style={{ color: colors.muted, fontSize: 12 }}>✓ Voice note recorded</Text>
            </View>
          )}
        </View>

        {/* Topic Input */}
        <View className="px-4 py-6 gap-3">
          <Text className="text-lg font-semibold text-foreground">📌 Topic</Text>

          <TextInput
            placeholder="What's your post about?"
            placeholderTextColor={colors.muted}
            value={state.contentTopic}
            onChangeText={(text) => setState((prev) => ({ ...prev, contentTopic: text }))}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 8,
              padding: 12,
              color: colors.foreground,
              borderWidth: 1,
              borderColor: colors.border,
              minHeight: 100,
              textAlignVertical: 'top',
            }}
            multiline
          />
        </View>

        {/* Category Selection */}
        <View className="px-4 py-6 gap-3">
          <Text className="text-lg font-semibold text-foreground">📂 Category</Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CONTENT_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                onPress={() =>
                  setState((prev) => ({
                    ...prev,
                    contentCategory: prev.contentCategory === category ? '' : category,
                  }))
                }
                style={{
                  backgroundColor:
                    state.contentCategory === category ? colors.primary : colors.surface,
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={{
                    color: state.contentCategory === category ? '#fff' : colors.foreground,
                    fontSize: 12,
                    fontWeight: '500',
                  }}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Platform Selection */}
        <View className="px-4 py-6 gap-3">
          <Text className="text-lg font-semibold text-foreground">📱 Cross-Post To</Text>

          <View style={{ gap: 8 }}>
            {(['tiktok', 'instagram', 'twitter'] as const).map((platform) => (
              <TouchableOpacity
                key={platform}
                onPress={() =>
                  setState((prev) => ({
                    ...prev,
                    selectedPlatforms: prev.selectedPlatforms.includes(platform)
                      ? prev.selectedPlatforms.filter((p) => p !== platform)
                      : [...prev.selectedPlatforms, platform],
                  }))
                }
                style={{
                  backgroundColor: state.selectedPlatforms.includes(platform)
                    ? colors.primary
                    : colors.surface,
                  borderRadius: 8,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={{
                    color: state.selectedPlatforms.includes(platform) ? '#fff' : colors.foreground,
                    fontSize: 14,
                    fontWeight: '500',
                    flex: 1,
                  }}
                >
                  {platform === 'tiktok' && '🎬 TikTok'}
                  {platform === 'instagram' && '📸 Instagram'}
                  {platform === 'twitter' && '𝕏 X/Twitter'}
                </Text>
                <Text
                  style={{
                    color: state.selectedPlatforms.includes(platform) ? '#fff' : colors.muted,
                    fontSize: 16,
                  }}
                >
                  {state.selectedPlatforms.includes(platform) ? '✓' : '○'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Generate Button */}
        <View className="px-4 py-6">
          <TouchableOpacity
            onPress={generateContent}
            disabled={state.isProcessing || (!state.contentTopic && !state.voiceInput)}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 8,
              padding: 14,
              alignItems: 'center',
              opacity: state.isProcessing || (!state.contentTopic && !state.voiceInput) ? 0.5 : 1,
            }}
          >
            {state.isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                ✨ Generate Content
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Preview Modal */}
      <Modal visible={state.showPreview} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 16,
              maxHeight: '80%',
            }}
          >
            <ScrollView>
              <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '600', marginBottom: 16 }}>
                📋 Preview
              </Text>

              {generatedContent && (
                <View style={{ gap: 16 }}>
                  {/* Main Post */}
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 8,
                      padding: 12,
                      borderLeftWidth: 4,
                      borderLeftColor: colors.primary,
                    }}
                  >
                    <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 8 }}>
                      MAIN POST
                    </Text>
                    <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 18 }}>
                      {generatedContent.mainPost}
                    </Text>
                  </View>

                  {/* Platform Captions */}
                  {state.selectedPlatforms.includes('tiktok') && (
                    <View
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: 8,
                        padding: 12,
                      }}
                    >
                      <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 8 }}>
                        🎬 TIKTOK CAPTION
                      </Text>
                      <Text style={{ color: colors.foreground, fontSize: 13 }}>
                        {generatedContent.tiktokCaption}
                      </Text>
                    </View>
                  )}

                  {state.selectedPlatforms.includes('instagram') && (
                    <View
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: 8,
                        padding: 12,
                      }}
                    >
                      <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 8 }}>
                        📸 INSTAGRAM CAPTION
                      </Text>
                      <Text style={{ color: colors.foreground, fontSize: 13 }}>
                        {generatedContent.instagramCaption}
                      </Text>
                    </View>
                  )}

                  {state.selectedPlatforms.includes('twitter') && (
                    <View
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: 8,
                        padding: 12,
                      }}
                    >
                      <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 8 }}>
                        𝕏 X/TWITTER CAPTION
                      </Text>
                      <Text style={{ color: colors.foreground, fontSize: 13 }}>
                        {generatedContent.twitterCaption}
                      </Text>
                    </View>
                  )}

                  {/* Affiliate Links */}
                  {generatedContent.affiliateLinks.length > 0 && (
                    <View
                      style={{
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        borderRadius: 8,
                        padding: 12,
                        borderLeftWidth: 4,
                        borderLeftColor: '#22c55e',
                      }}
                    >
                      <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                        🔗 Affiliate Links Included
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 11 }}>
                        {generatedContent.affiliateLinks.length} link(s) will be added
                      </Text>
                    </View>
                  )}

                  {/* Ad Disclosure */}
                  <View
                    style={{
                      backgroundColor: 'rgba(168, 85, 247, 0.1)',
                      borderRadius: 8,
                      padding: 12,
                      borderLeftWidth: 4,
                      borderLeftColor: '#a855f7',
                    }}
                  >
                    <Text style={{ color: colors.foreground, fontSize: 11, lineHeight: 16 }}>
                      📝 #Ad disclosures will be automatically added to comply with 2026 FTC guidelines
                    </Text>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={{ gap: 8, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={publishContent}
                  disabled={state.isProcessing}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 8,
                    padding: 14,
                    alignItems: 'center',
                    opacity: state.isProcessing ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                    ✅ Publish Content
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setState((prev) => ({ ...prev, showPreview: false }))}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 8,
                    padding: 14,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 14 }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
