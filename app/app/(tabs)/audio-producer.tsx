import React, { useState } from 'react';
import { ScrollView, Text, View, TouchableOpacity, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';

export default function AudioProducerScreen() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  const handleCreateSession = () => {
    const sessionId = `audio-${Date.now()}`;
    const newSession = {
      id: sessionId,
      name: 'New Mix',
      tracks: [],
      effects: [],
      createdAt: new Date(),
    };
    setSessions([...sessions, newSession]);
    setSelectedSession(sessionId);
    setStatus(`✓ Created audio session`);
  };

  const handleAddTrack = () => {
    if (!selectedSession) {
      Alert.alert('Error', 'Please create a session first');
      return;
    }
    const session = sessions.find((s) => s.id === selectedSession);
    if (session) {
      const trackNum = session.tracks.length + 1;
      session.tracks.push({
        id: `track-${trackNum}`,
        name: `Track ${trackNum}`,
        volume: 1.0,
        muted: false,
      });
      setStatus(`✓ Added track ${trackNum}`);
    }
  };

  const handleAddEffect = () => {
    if (!selectedSession) {
      Alert.alert('Error', 'Please create a session first');
      return;
    }
    const session = sessions.find((s) => s.id === selectedSession);
    if (session) {
      const effects = ['Reverb', 'Delay', 'Compression', 'EQ', 'Chorus'];
      const effect = effects[Math.floor(Math.random() * effects.length)];
      session.effects.push({ type: effect, intensity: 0.5 });
      setStatus(`✓ Added effect: ${effect}`);
    }
  };

  const handleMix = () => {
    if (!selectedSession) {
      Alert.alert('Error', 'Please create a session first');
      return;
    }
    setStatus('✓ Mixing audio...');
  };

  const handleExport = () => {
    if (!selectedSession) {
      Alert.alert('Error', 'Please create a session first');
      return;
    }
    setStatus('✓ Export started: output.wav');
  };

  const currentSession = sessions.find((s) => s.id === selectedSession);

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="gap-4">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">🎵 Audio Producer</Text>
            <Text className="text-sm text-muted">Mix and produce professional audio</Text>
          </View>

          {/* Status Card */}
          <View className="bg-surface rounded-lg p-4 gap-2 border border-border">
            <Text className="text-xs font-semibold text-muted uppercase">Status</Text>
            <Text className="text-base text-foreground font-medium">{status || '👋 Ready to create'}</Text>
          </View>

          {/* Main Actions */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={handleCreateSession}
              className="bg-primary rounded-lg p-4 active:opacity-80"
            >
              <Text className="text-white font-semibold text-center">+ New Mix Session</Text>
            </TouchableOpacity>

            {selectedSession && (
              <>
                <View className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">Production Tools</Text>
                  <TouchableOpacity
                    onPress={handleAddTrack}
                    className="bg-blue-500 rounded-lg p-4 active:opacity-80"
                  >
                    <Text className="text-white font-semibold text-center">🎚️ Add Track</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleAddEffect}
                    className="bg-purple-500 rounded-lg p-4 active:opacity-80"
                  >
                    <Text className="text-white font-semibold text-center">✨ Add Effect</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleMix}
                    className="bg-green-500 rounded-lg p-4 active:opacity-80"
                  >
                    <Text className="text-white font-semibold text-center">🎛️ Mix Audio</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleExport}
                    className="bg-orange-500 rounded-lg p-4 active:opacity-80"
                  >
                    <Text className="text-white font-semibold text-center">📤 Export</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Current Session Details */}
          {currentSession && (
            <View className="bg-surface rounded-lg p-4 gap-3 border border-border">
              <Text className="text-sm font-semibold text-foreground">Session Details</Text>
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted">Tracks:</Text>
                  <Text className="text-sm text-foreground font-medium">{currentSession.tracks.length}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted">Effects:</Text>
                  <Text className="text-sm text-foreground font-medium">{currentSession.effects.length}</Text>
                </View>
              </View>

              {currentSession.tracks.length > 0 && (
                <View className="gap-2 pt-2 border-t border-border">
                  <Text className="text-xs font-semibold text-muted">Tracks</Text>
                  {currentSession.tracks.map((track: any) => (
                    <Text key={track.id} className="text-xs text-foreground">
                      • {track.name} ({Math.round(track.volume * 100)}%)
                    </Text>
                  ))}
                </View>
              )}

              {currentSession.effects.length > 0 && (
                <View className="gap-2 pt-2 border-t border-border">
                  <Text className="text-xs font-semibold text-muted">Effects</Text>
                  {currentSession.effects.map((effect: any, idx: number) => (
                    <Text key={idx} className="text-xs text-foreground">
                      • {effect.type} ({Math.round(effect.intensity * 100)}%)
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
                    {session.name}
                  </Text>
                  <Text
                    className={`text-xs mt-1 ${
                      selectedSession === session.id ? 'text-white/70' : 'text-muted'
                    }`}
                  >
                    {session.tracks.length} tracks • {session.effects.length} effects
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Empty State */}
          {sessions.length === 0 && (
            <View className="bg-surface rounded-lg p-6 gap-2 items-center justify-center border border-border">
              <Text className="text-3xl">🎧</Text>
              <Text className="text-sm font-semibold text-foreground">No sessions yet</Text>
              <Text className="text-xs text-muted text-center">
                Create a new session to start mixing audio
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
