import React, { useState } from 'react';
import { ScrollView, Text, View, TouchableOpacity, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';

export default function ContentGeneratorScreen() {
  const [charts, setCharts] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  const handleCreateChart = () => {
    const chartTypes = ['line', 'bar', 'pie', 'area', 'scatter'];
    const type = chartTypes[Math.floor(Math.random() * chartTypes.length)];
    const chartId = `chart-${Date.now()}`;
    const newChart = {
      id: chartId,
      type,
      title: `${type.toUpperCase()} Chart`,
      data: [10, 20, 30, 40, 50],
      createdAt: new Date(),
    };
    setCharts([...charts, newChart]);
    setSelectedChart(chartId);
    setStatus(`✓ Created ${type} chart`);
  };

  const handleUpdateChartData = () => {
    if (!selectedChart) {
      Alert.alert('Error', 'Please create a chart first');
      return;
    }
    const chart = charts.find((c) => c.id === selectedChart);
    if (chart) {
      chart.data = [Math.random() * 100, Math.random() * 100, Math.random() * 100, Math.random() * 100, Math.random() * 100];
      setStatus('✓ Chart data updated');
    }
  };

  const handleExportChart = () => {
    if (!selectedChart) {
      Alert.alert('Error', 'Please create a chart first');
      return;
    }
    setStatus(`✓ Chart exported: chart.png`);
  };

  const handleCreateTemplate = () => {
    const templateId = `template-${Date.now()}`;
    setStatus(`✓ Created template: ${templateId}`);
  };

  const handleGenerateImage = () => {
    const imageId = `image-${Date.now()}`;
    const newImage = {
      id: imageId,
      type: 'thumbnail',
      size: '1080x1080',
      createdAt: new Date(),
    };
    setImages([...images, newImage]);
    setStatus(`✓ Generated image: ${imageId}`);
  };

  const handleDeleteImage = () => {
    if (images.length === 0) {
      Alert.alert('Error', 'No images to delete');
      return;
    }
    const imageId = images[0].id;
    setImages(images.slice(1));
    setStatus(`✓ Deleted image: ${imageId}`);
  };

  const currentChart = charts.find((c) => c.id === selectedChart);

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="gap-4">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">📊 Content Generator</Text>
            <Text className="text-sm text-muted">Create charts, templates, and images</Text>
          </View>

          {/* Status Card */}
          <View className="bg-surface rounded-lg p-4 gap-2 border border-border">
            <Text className="text-xs font-semibold text-muted uppercase">Status</Text>
            <Text className="text-base text-foreground font-medium">{status || '👋 Ready to generate'}</Text>
          </View>

          {/* Charts Section */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">📈 Charts</Text>
            <TouchableOpacity
              onPress={handleCreateChart}
              className="bg-primary rounded-lg p-4 active:opacity-80"
            >
              <Text className="text-white font-semibold text-center">+ Create Chart</Text>
            </TouchableOpacity>

            {selectedChart && (
              <>
                <TouchableOpacity
                  onPress={handleUpdateChartData}
                  className="bg-blue-500 rounded-lg p-4 active:opacity-80"
                >
                  <Text className="text-white font-semibold text-center">🔄 Update Data</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleExportChart}
                  className="bg-green-500 rounded-lg p-4 active:opacity-80"
                >
                  <Text className="text-white font-semibold text-center">📤 Export Chart</Text>
                </TouchableOpacity>
              </>
            )}

            {currentChart && (
              <View className="bg-surface rounded-lg p-4 gap-3 border border-border">
                <Text className="text-sm font-semibold text-foreground">Current Chart</Text>
                <View className="gap-2">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-muted">Type:</Text>
                    <Text className="text-sm text-foreground font-medium">{currentChart.type.toUpperCase()}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-muted">Title:</Text>
                    <Text className="text-sm text-foreground font-medium">{currentChart.title}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-muted">Data Points:</Text>
                    <Text className="text-sm text-foreground font-medium">{currentChart.data.length}</Text>
                  </View>
                </View>
              </View>
            )}

            {charts.length > 0 && (
              <View className="bg-surface rounded-lg p-4 gap-3 border border-border">
                <Text className="text-sm font-semibold text-foreground">Charts ({charts.length})</Text>
                {charts.map((chart) => (
                  <TouchableOpacity
                    key={chart.id}
                    onPress={() => setSelectedChart(chart.id)}
                    className={`p-3 rounded-lg border ${
                      selectedChart === chart.id
                        ? 'bg-primary border-primary'
                        : 'bg-background border-border'
                    }`}
                  >
                    <Text
                      className={`font-medium ${
                        selectedChart === chart.id ? 'text-white' : 'text-foreground'
                      }`}
                    >
                      {chart.title}
                    </Text>
                    <Text
                      className={`text-xs mt-1 ${
                        selectedChart === chart.id ? 'text-white/70' : 'text-muted'
                      }`}
                    >
                      {chart.type} • {chart.data.length} points
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Images Section */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">🖼️ Images & Templates</Text>
            <TouchableOpacity
              onPress={handleCreateTemplate}
              className="bg-purple-500 rounded-lg p-4 active:opacity-80"
            >
              <Text className="text-white font-semibold text-center">+ Create Template</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleGenerateImage}
              className="bg-orange-500 rounded-lg p-4 active:opacity-80"
            >
              <Text className="text-white font-semibold text-center">✨ Generate Image</Text>
            </TouchableOpacity>

            {images.length > 0 && (
              <>
                <TouchableOpacity
                  onPress={handleDeleteImage}
                  className="bg-red-500 rounded-lg p-4 active:opacity-80"
                >
                  <Text className="text-white font-semibold text-center">🗑️ Delete Image</Text>
                </TouchableOpacity>

                <View className="bg-surface rounded-lg p-4 gap-3 border border-border">
                  <Text className="text-sm font-semibold text-foreground">Generated Images ({images.length})</Text>
                  {images.map((image) => (
                    <View key={image.id} className="p-3 rounded-lg bg-background border border-border">
                      <Text className="text-foreground font-medium">{image.type}</Text>
                      <Text className="text-xs text-muted mt-1">{image.size}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Empty State */}
          {charts.length === 0 && images.length === 0 && (
            <View className="bg-surface rounded-lg p-6 gap-2 items-center justify-center border border-border">
              <Text className="text-3xl">📊</Text>
              <Text className="text-sm font-semibold text-foreground">No content yet</Text>
              <Text className="text-xs text-muted text-center">
                Create charts and images to get started
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
