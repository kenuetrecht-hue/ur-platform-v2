import React, { useState, useEffect } from 'react';
import { ScrollView, Text, View, TouchableOpacity, Alert, TextInput } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { PersonalAIChat } from '@/components/personal-ai-chat';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';

export default function CreatorDashboardScreen() {
  const [creatorInfo, setCreatorInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'video' | 'audio' | 'content'>('overview');
  const [videoSessions, setVideoSessions] = useState<any[]>([]);
  const [audioSessions, setAudioSessions] = useState<any[]>([]);
  const [contentItems, setContentItems] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalEarnings: 0,
    collaborators: 0,
    views: 0,
  });

  // Video Editor State
  const [videoEditorOpen, setVideoEditorOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [videoEdits, setVideoEdits] = useState({ crop: false, trim: false, effects: false });

  // Audio Producer State
  const [audioEditorOpen, setAudioEditorOpen] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState<any>(null);
  const [audioMix, setAudioMix] = useState({ volume: 100, reverb: 0, delay: 0 });

  // Content Generator State
  const [contentEditorOpen, setContentEditorOpen] = useState(false);
  const [chartType, setChartType] = useState('bar');
  const [chartTitle, setChartTitle] = useState('');

  // Personal AI State
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const colors = useColors();

  useEffect(() => {
    // Initialize creator dashboard
    setCreatorInfo({
      name: 'First Creator',
      email: 'creator@urplatform.com',
      role: 'admin',
      joinedAt: new Date(),
      verified: true,
    });

    // Load mock stats
    setStats({
      totalProjects: 12,
      totalEarnings: 2500,
      collaborators: 3,
      views: 15420,
    });
  }, []);

  // VIDEO EDITOR FUNCTIONS
  const handleCreateVideoSession = () => {
    const sessionId = `video-${Date.now()}`;
    const newSession = { 
      id: sessionId, 
      name: 'New Video Project', 
      createdAt: new Date(),
      duration: 0,
      effects: [],
      status: 'editing'
    };
    setVideoSessions([...videoSessions, newSession]);
    setSelectedVideo(newSession);
    setVideoEditorOpen(true);
    Alert.alert('Success', 'Video session created');
  };

  const handleEditVideo = (session: any) => {
    setSelectedVideo(session);
    setVideoEditorOpen(true);
  };

  const handleApplyVideoEdits = () => {
    if (selectedVideo) {
      const updated = {
        ...selectedVideo,
        effects: Object.keys(videoEdits).filter(k => videoEdits[k as keyof typeof videoEdits]),
        status: 'edited'
      };
      setVideoSessions(videoSessions.map(s => s.id === selectedVideo.id ? updated : s));
      setVideoEditorOpen(false);
      Alert.alert('Success', 'Video edits applied');
    }
  };

  const handleExportVideo = (session: any) => {
    Alert.alert('Export', `Exporting ${session.name}...`);
  };

  // AUDIO PRODUCER FUNCTIONS
  const handleCreateAudioSession = () => {
    const sessionId = `audio-${Date.now()}`;
    const newSession = { 
      id: sessionId, 
      name: 'New Audio Mix', 
      createdAt: new Date(),
      tracks: [],
      status: 'mixing'
    };
    setAudioSessions([...audioSessions, newSession]);
    setSelectedAudio(newSession);
    setAudioEditorOpen(true);
    Alert.alert('Success', 'Audio session created');
  };

  const handleEditAudio = (session: any) => {
    setSelectedAudio(session);
    setAudioEditorOpen(true);
  };

  const handleApplyAudioMix = () => {
    if (selectedAudio) {
      const updated = {
        ...selectedAudio,
        volume: audioMix.volume,
        reverb: audioMix.reverb,
        delay: audioMix.delay,
        status: 'mixed'
      };
      setAudioSessions(audioSessions.map(s => s.id === selectedAudio.id ? updated : s));
      setAudioEditorOpen(false);
      Alert.alert('Success', 'Audio mix applied');
    }
  };

  const handleExportAudio = (session: any) => {
    Alert.alert('Export', `Exporting ${session.name}...`);
  };

  // CONTENT GENERATOR FUNCTIONS
  const handleCreateContent = () => {
    const itemId = `content-${Date.now()}`;
    const newItem = { 
      id: itemId, 
      name: chartTitle || 'New Chart', 
      type: chartType,
      createdAt: new Date(),
      status: 'created'
    };
    setContentItems([...contentItems, newItem]);
    setContentEditorOpen(false);
    setChartTitle('');
    Alert.alert('Success', 'Content created');
  };

  const handleDeleteContent = (itemId: string) => {
    setContentItems(contentItems.filter(item => item.id !== itemId));
    Alert.alert('Success', 'Content deleted');
  };

  const handleAICommand = (commandType: string) => {
    // Switch to the appropriate tab based on AI command
    if (commandType === 'video') {
      setActiveTab('video');
    } else if (commandType === 'audio') {
      setActiveTab('audio');
    } else if (commandType === 'content') {
      setActiveTab('content');
    }
    setAiChatOpen(false);
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="gap-4">
          {/* Header with AI Button */}
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1 gap-2">
              <Text className="text-3xl font-bold text-foreground">👑 Creator Dashboard</Text>
              <Text className="text-sm text-muted">Private workspace - Only you can access this</Text>
            </View>
            <TouchableOpacity
              onPress={() => setAiChatOpen(true)}
              className="bg-primary rounded-full p-3 active:opacity-80"
            >
              <Text className="text-white text-2xl">🤖</Text>
            </TouchableOpacity>
          </View>

          {/* Creator Info Card */}
          {creatorInfo && (
            <View className="bg-primary rounded-lg p-4 gap-2">
              <Text className="text-white font-semibold">{creatorInfo.name}</Text>
              <Text className="text-white/80 text-sm">{creatorInfo.email}</Text>
              <View className="flex-row gap-2 mt-2">
                <View className="bg-white/20 rounded px-2 py-1">
                  <Text className="text-white text-xs font-semibold">{creatorInfo.role.toUpperCase()}</Text>
                </View>
                {creatorInfo.verified && (
                  <View className="bg-white/20 rounded px-2 py-1">
                    <Text className="text-white text-xs font-semibold">✓ VERIFIED</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Stats Overview */}
          <View className="grid grid-cols-2 gap-3">
            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-xs text-muted font-semibold">Projects</Text>
              <Text className="text-2xl font-bold text-foreground mt-1">{stats.totalProjects}</Text>
            </View>
            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-xs text-muted font-semibold">Earnings</Text>
              <Text className="text-2xl font-bold text-foreground mt-1">${stats.totalEarnings}</Text>
            </View>
            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-xs text-muted font-semibold">Collaborators</Text>
              <Text className="text-2xl font-bold text-foreground mt-1">{stats.collaborators}</Text>
            </View>
            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-xs text-muted font-semibold">Views</Text>
              <Text className="text-2xl font-bold text-foreground mt-1">{stats.views.toLocaleString()}</Text>
            </View>
          </View>

          {/* Tab Navigation */}
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setActiveTab('overview')}
              className={`flex-1 p-3 rounded-lg ${activeTab === 'overview' ? 'bg-primary' : 'bg-surface border border-border'}`}
            >
              <Text className={`text-center font-semibold text-sm ${activeTab === 'overview' ? 'text-white' : 'text-foreground'}`}>
                Overview
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('video')}
              className={`flex-1 p-3 rounded-lg ${activeTab === 'video' ? 'bg-primary' : 'bg-surface border border-border'}`}
            >
              <Text className={`text-center font-semibold text-sm ${activeTab === 'video' ? 'text-white' : 'text-foreground'}`}>
                🎬 Video
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('audio')}
              className={`flex-1 p-3 rounded-lg ${activeTab === 'audio' ? 'bg-primary' : 'bg-surface border border-border'}`}
            >
              <Text className={`text-center font-semibold text-sm ${activeTab === 'audio' ? 'text-white' : 'text-foreground'}`}>
                🎵 Audio
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('content')}
              className={`flex-1 p-3 rounded-lg ${activeTab === 'content' ? 'bg-primary' : 'bg-surface border border-border'}`}
            >
              <Text className={`text-center font-semibold text-sm ${activeTab === 'content' ? 'text-white' : 'text-foreground'}`}>
                📊 Content
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <View className="gap-3">
              <Text className="text-lg font-semibold text-foreground">Quick Actions</Text>
              <TouchableOpacity className="bg-blue-500 rounded-lg p-4 active:opacity-80">
                <Text className="text-white font-semibold text-center">📈 View Analytics</Text>
              </TouchableOpacity>
              <TouchableOpacity className="bg-green-500 rounded-lg p-4 active:opacity-80">
                <Text className="text-white font-semibold text-center">💰 Manage Earnings</Text>
              </TouchableOpacity>
              <TouchableOpacity className="bg-purple-500 rounded-lg p-4 active:opacity-80">
                <Text className="text-white font-semibold text-center">👥 Manage Collaborators</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* VIDEO EDITOR TAB */}
          {activeTab === 'video' && (
            <View className="gap-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-semibold text-foreground">🎬 Video Editor</Text>
                <Text className="text-sm text-muted">{videoSessions.length} projects</Text>
              </View>
              <TouchableOpacity
                onPress={handleCreateVideoSession}
                className="bg-primary rounded-lg p-4 active:opacity-80"
              >
                <Text className="text-white font-semibold text-center">+ New Video Project</Text>
              </TouchableOpacity>

              {videoEditorOpen && selectedVideo && (
                <View className="bg-surface rounded-lg p-4 border-2 border-primary gap-3">
                  <Text className="font-semibold text-foreground">Editing: {selectedVideo.name}</Text>
                  
                  {/* Video Editing Tools */}
                  <View className="gap-2">
                    <TouchableOpacity
                      onPress={() => setVideoEdits({...videoEdits, crop: !videoEdits.crop})}
                      className={`p-3 rounded ${videoEdits.crop ? 'bg-primary' : 'bg-border'}`}
                    >
                      <Text className={`text-center font-semibold ${videoEdits.crop ? 'text-white' : 'text-foreground'}`}>
                        ✂️ Crop {videoEdits.crop ? '✓' : ''}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setVideoEdits({...videoEdits, trim: !videoEdits.trim})}
                      className={`p-3 rounded ${videoEdits.trim ? 'bg-primary' : 'bg-border'}`}
                    >
                      <Text className={`text-center font-semibold ${videoEdits.trim ? 'text-white' : 'text-foreground'}`}>
                        ⏱️ Trim {videoEdits.trim ? '✓' : ''}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setVideoEdits({...videoEdits, effects: !videoEdits.effects})}
                      className={`p-3 rounded ${videoEdits.effects ? 'bg-primary' : 'bg-border'}`}
                    >
                      <Text className={`text-center font-semibold ${videoEdits.effects ? 'text-white' : 'text-foreground'}`}>
                        ✨ Effects {videoEdits.effects ? '✓' : ''}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Action Buttons */}
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={handleApplyVideoEdits}
                      className="flex-1 bg-green-500 rounded p-3"
                    >
                      <Text className="text-white font-semibold text-center">✓ Apply Edits</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setVideoEditorOpen(false)}
                      className="flex-1 bg-red-500 rounded p-3"
                    >
                      <Text className="text-white font-semibold text-center">✕ Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {videoSessions.map((session) => (
                <View key={session.id} className="bg-surface rounded-lg p-4 border border-border gap-2">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="font-semibold text-foreground">{session.name}</Text>
                      <Text className="text-xs text-muted mt-1">Status: {session.status}</Text>
                      <Text className="text-xs text-muted">Created: {session.createdAt.toLocaleDateString()}</Text>
                    </View>
                    <View className="bg-primary rounded px-2 py-1">
                      <Text className="text-white text-xs font-semibold">{session.effects.length} edits</Text>
                    </View>
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleEditVideo(session)}
                      className="flex-1 bg-blue-500 rounded p-2"
                    >
                      <Text className="text-white font-semibold text-center text-sm">Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleExportVideo(session)}
                      className="flex-1 bg-green-500 rounded p-2"
                    >
                      <Text className="text-white font-semibold text-center text-sm">Export</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* AUDIO PRODUCER TAB */}
          {activeTab === 'audio' && (
            <View className="gap-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-semibold text-foreground">🎵 Audio Producer</Text>
                <Text className="text-sm text-muted">{audioSessions.length} projects</Text>
              </View>
              <TouchableOpacity
                onPress={handleCreateAudioSession}
                className="bg-primary rounded-lg p-4 active:opacity-80"
              >
                <Text className="text-white font-semibold text-center">+ New Audio Mix</Text>
              </TouchableOpacity>

              {audioEditorOpen && selectedAudio && (
                <View className="bg-surface rounded-lg p-4 border-2 border-primary gap-3">
                  <Text className="font-semibold text-foreground">Mixing: {selectedAudio.name}</Text>
                  
                  {/* Audio Mixing Controls */}
                  <View className="gap-3">
                    <View className="gap-1">
                      <Text className="text-sm font-semibold text-foreground">Volume: {audioMix.volume}%</Text>
                      <View className="flex-row gap-2">
                        <TouchableOpacity onPress={() => setAudioMix({...audioMix, volume: Math.max(0, audioMix.volume - 10)})} className="flex-1 bg-border p-2 rounded">
                          <Text className="text-center text-foreground">-</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setAudioMix({...audioMix, volume: Math.min(100, audioMix.volume + 10)})} className="flex-1 bg-border p-2 rounded">
                          <Text className="text-center text-foreground">+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View className="gap-1">
                      <Text className="text-sm font-semibold text-foreground">Reverb: {audioMix.reverb}%</Text>
                      <View className="flex-row gap-2">
                        <TouchableOpacity onPress={() => setAudioMix({...audioMix, reverb: Math.max(0, audioMix.reverb - 10)})} className="flex-1 bg-border p-2 rounded">
                          <Text className="text-center text-foreground">-</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setAudioMix({...audioMix, reverb: Math.min(100, audioMix.reverb + 10)})} className="flex-1 bg-border p-2 rounded">
                          <Text className="text-center text-foreground">+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View className="gap-1">
                      <Text className="text-sm font-semibold text-foreground">Delay: {audioMix.delay}%</Text>
                      <View className="flex-row gap-2">
                        <TouchableOpacity onPress={() => setAudioMix({...audioMix, delay: Math.max(0, audioMix.delay - 10)})} className="flex-1 bg-border p-2 rounded">
                          <Text className="text-center text-foreground">-</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setAudioMix({...audioMix, delay: Math.min(100, audioMix.delay + 10)})} className="flex-1 bg-border p-2 rounded">
                          <Text className="text-center text-foreground">+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={handleApplyAudioMix}
                      className="flex-1 bg-green-500 rounded p-3"
                    >
                      <Text className="text-white font-semibold text-center">✓ Apply Mix</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setAudioEditorOpen(false)}
                      className="flex-1 bg-red-500 rounded p-3"
                    >
                      <Text className="text-white font-semibold text-center">✕ Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {audioSessions.map((session) => (
                <View key={session.id} className="bg-surface rounded-lg p-4 border border-border gap-2">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="font-semibold text-foreground">{session.name}</Text>
                      <Text className="text-xs text-muted mt-1">Status: {session.status}</Text>
                      <Text className="text-xs text-muted">Created: {session.createdAt.toLocaleDateString()}</Text>
                    </View>
                    <View className="bg-primary rounded px-2 py-1">
                      <Text className="text-white text-xs font-semibold">{session.tracks?.length || 0} tracks</Text>
                    </View>
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleEditAudio(session)}
                      className="flex-1 bg-blue-500 rounded p-2"
                    >
                      <Text className="text-white font-semibold text-center text-sm">Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleExportAudio(session)}
                      className="flex-1 bg-green-500 rounded p-2"
                    >
                      <Text className="text-white font-semibold text-center text-sm">Export</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* CONTENT GENERATOR TAB */}
          {activeTab === 'content' && (
            <View className="gap-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-semibold text-foreground">📊 Content Generator</Text>
                <Text className="text-sm text-muted">{contentItems.length} items</Text>
              </View>
              <TouchableOpacity
                onPress={() => setContentEditorOpen(!contentEditorOpen)}
                className="bg-primary rounded-lg p-4 active:opacity-80"
              >
                <Text className="text-white font-semibold text-center">+ Create Content</Text>
              </TouchableOpacity>

              {contentEditorOpen && (
                <View className="bg-surface rounded-lg p-4 border-2 border-primary gap-3">
                  <Text className="font-semibold text-foreground">Create New Content</Text>
                  
                  {/* Chart Type Selection */}
                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-foreground">Chart Type:</Text>
                    {['bar', 'line', 'pie', 'area', 'scatter'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setChartType(type)}
                        className={`p-3 rounded ${chartType === type ? 'bg-primary' : 'bg-border'}`}
                      >
                        <Text className={`text-center font-semibold capitalize ${chartType === type ? 'text-white' : 'text-foreground'}`}>
                          {type} Chart {chartType === type ? '✓' : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Chart Title */}
                  <View className="gap-1">
                    <Text className="text-sm font-semibold text-foreground">Chart Title:</Text>
                    <TextInput
                      placeholder="Enter chart title..."
                      value={chartTitle}
                      onChangeText={setChartTitle}
                      className="bg-background border border-border rounded p-3 text-foreground"
                      placeholderTextColor="#999"
                    />
                  </View>

                  {/* Action Buttons */}
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={handleCreateContent}
                      className="flex-1 bg-green-500 rounded p-3"
                    >
                      <Text className="text-white font-semibold text-center">✓ Create</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setContentEditorOpen(false)}
                      className="flex-1 bg-red-500 rounded p-3"
                    >
                      <Text className="text-white font-semibold text-center">✕ Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {contentItems.map((item) => (
                <View key={item.id} className="bg-surface rounded-lg p-4 border border-border gap-2">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="font-semibold text-foreground">{item.name}</Text>
                      <Text className="text-xs text-muted mt-1">Type: {item.type} chart</Text>
                      <Text className="text-xs text-muted">Created: {item.createdAt.toLocaleDateString()}</Text>
                    </View>
                    <View className="bg-primary rounded px-2 py-1">
                      <Text className="text-white text-xs font-semibold">{item.status}</Text>
                    </View>
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity className="flex-1 bg-blue-500 rounded p-2">
                      <Text className="text-white font-semibold text-center text-sm">Preview</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-1 bg-green-500 rounded p-2">
                      <Text className="text-white font-semibold text-center text-sm">Export</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteContent(item.id)}
                      className="flex-1 bg-red-500 rounded p-2"
                    >
                      <Text className="text-white font-semibold text-center text-sm">Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Personal AI Chat Modal */}
      <PersonalAIChat
        visible={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
        onCommandExecute={handleAICommand}
      />
    </ScreenContainer>
  );
}
