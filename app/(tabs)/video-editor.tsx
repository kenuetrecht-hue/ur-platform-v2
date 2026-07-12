import React, { useState } from 'react';
import { ScrollView, Text, View, TouchableOpacity, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';

export default function VideoEditorScreen() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  const handleCreateSession = () => {
    const sessionId = `session-${Date.now()}`;
    const newSession = {
      id: sessionId,
      fileName: 'sample-video.mp4',
      duration: 120,
      createdAt: new Date(),
      operations: [],
    };
    setSessions([...sessions, newSession]);
    setSelectedSession(sessionId);
    setStatus(`✓ Created session: ${sessionId}`);
  };

  const handleCrop = () => {
    if (!selectedSession) {
      Alert.alert('Error', 'Please create a session first');
      return;
    }
    const session = sessions.find((s) => s.id === selectedSession);
    if (session) {
      session.operations.push({ type: 'crop', start: 0, duration: 10 });
      setStatus('✓ Video cropped (0-10s)');
    }
  };

  const handleTrim = () => {
    if (!selectedSession) {
      Alert.alert('Error', 'Please create a session first');
      return;
    }
    const session = sessions.find((s) => s.id === selectedSession);
    if (session) {
      session.operations.push({ type: 'trim', start: 2, end: 8 });
      setStatus('✓ Video trimmed (2-8s)');
    }
  };

  const handleAddEffect = () => {
    if (!selectedSession) {
      Alert.alert('Error', 'Please create a session first');
      return;
    }
    const session = sessions.find((s) => s.id === selectedSession);
    if (session) {
      session.operations.push({ type: 'effect', name: 'brightness', intensity: 1.2 });
      setStatus('✓ Effect added: brightness');
    }
  };

  const handleExport = () => {
    if (!selectedSession) {
      Alert.alert('Error', 'Please create a session first');
      return;
    }
    setStatus('✓ Export started: output.mp4');
  };

  const currentSession = sessions.find((s) => s.id === selectedSession);

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="gap-4">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">🎬 Video Editor</Text>
            <Text className="text-sm text-muted">Create and edit videos with professional tools</Text>
          </View>

          {/* Status Card */}
          <View className="bg-surface rounded-lg p-4 gap-2 border border-border">
            <Text className="text-xs font-semibold text-muted uppercase">Status</Text>
            <Text className="text-base text-foreground font-medium">{status || '👋 Ready to start editing'}</Text>
          </View>

          {/* Main Actions */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={handleCreateSession}
              className="bg-primary rounded-lg p-4 active:opacity-80"
            >
              <Text className="text-white font-semibold text-center">+ Create Edit Session</Text>
            </TouchableOpacity>

            {selectedSession && (
              <>
                <View className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">Editing Tools</Text>
                  <TouchableOpacity
                    onPress={handleCrop}
                    className="bg-blue-500 rounded-lg p-4 active:opacity-80"
                  >
                    <Text className="text-white font-semibold text-center">✂️ Crop Video</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleTrim}
                    className="bg-green-500 rounded-lg p-4 active:opacity-80"
                  >
                    <Text className="text-white font-semibold text-center">📍 Trim Video</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleAddEffect}
                    className="bg-purple-500 rounded-lg p-4 active:opacity-80"
                  >
                    <Text className="text-white font-semibold text-center">✨ Add Effect</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleExport}
                    className="bg-orange-500 rounded-lg p-4 active:opacity-80"
                  >
                    <Text className="text-white font-semibold text-center">📤 Export Video</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Current Session Details */}
          {currentSession && (
            <View className="bg-surface rounded-lg p-4 gap-3 border border-border">
              <Text className="text-sm font-semibold text-foreground">Current Session</Text>
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted">File:</Text>
                  <Text className="text-sm text-foreground font-medium">{currentSession.fileName}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted">Duration:</Text>
                  <Text className="text-sm text-foreground font-medium">{currentSession.duration}s</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted">Operations:</Text>
                  <Text className="text-sm text-foreground font-medium">{currentSession.operations.length}</Text>
                </View>
              </View>

              {currentSession.operations.length > 0 && (
                <View className="gap-2 pt-2 border-t border-border">
                  <Text className="text-xs font-semibold text-muted">Applied Operations</Text>
                  {currentSession.operations.map((op: any, idx: number) => (
                    <Text key={idx} className="text-xs text-foreground">
                      • {op.type.toUpperCase()} {op.name ? `(${op.name})` : ''}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Sessions List */}
          {sessions.length > 0 && (
            <View className="bg-surface rounded-lg p-4 gap-3 border border-border">
              <Text className="text-sm font-semibold text-foreground">Sessions ({sessions.length})</Text>
              {sessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  onPress={() => setSelectedSession(session.id)}
                  className={`p-3 rounded-lg border ${
                    selectedSession === session.id
                      ? 'bg-primary border-primary'
                      : 'bg-background border-border'
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      selectedSession === session.id ? 'text-white' : 'text-foreground'
                    }`}
                  >
                    {session.fileName}
                  </Text>
                  <Text
                    className={`text-xs mt-1 ${
                      selectedSession === session.id ? 'text-white/70' : 'text-muted'
                    }`}
                  >
                    {session.operations.length} operations • {session.duration}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Empty State */}
          {sessions.length === 0 && (
            <View className="bg-surface rounded-lg p-6 gap-2 items-center justify-center border border-border">
              <Text className="text-3xl">🎥</Text>
              <Text className="text-sm font-semibold text-foreground">No sessions yet</Text>
              <Text className="text-xs text-muted text-center">
                Create a new session to start editing your videos
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
