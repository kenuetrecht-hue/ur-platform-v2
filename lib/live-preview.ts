/**
 * Live Preview System
 * Provides real-time preview of edits before export
 */

export interface PreviewFrame {
  timestamp: number;
  data: string; // base64 encoded image
}

export interface PreviewState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  fps: number;
}

export interface AudioPreviewState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  waveformData: number[];
}

export class LivePreviewService {
  private videoPreviewState: PreviewState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    fps: 30,
  };

  private audioPreviewState: AudioPreviewState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 100,
    waveformData: [],
  };

  private previewFrames: PreviewFrame[] = [];
  private previewCallbacks: ((state: PreviewState | AudioPreviewState) => void)[] = [];

  /**
   * Initialize video preview
   */
  initializeVideoPreview(duration: number, fps: number = 30): void {
    this.videoPreviewState = {
      isPlaying: false,
      currentTime: 0,
      duration,
      fps,
    };
    this.generateMockPreviewFrames(duration, fps);
  }

  /**
   * Initialize audio preview
   */
  initializeAudioPreview(duration: number, sampleRate: number = 44100): void {
    this.audioPreviewState = {
      isPlaying: false,
      currentTime: 0,
      duration,
      volume: 100,
      waveformData: this.generateMockWaveform(duration, sampleRate),
    };
  }

  /**
   * Play video preview
   */
  playVideoPreview(): void {
    this.videoPreviewState.isPlaying = true;
    this.notifyPreviewUpdate(this.videoPreviewState);
    this.simulatePlayback('video');
  }

  /**
   * Play audio preview
   */
  playAudioPreview(): void {
    this.audioPreviewState.isPlaying = true;
    this.notifyPreviewUpdate(this.audioPreviewState);
    this.simulatePlayback('audio');
  }

  /**
   * Pause video preview
   */
  pauseVideoPreview(): void {
    this.videoPreviewState.isPlaying = false;
    this.notifyPreviewUpdate(this.videoPreviewState);
  }

  /**
   * Pause audio preview
   */
  pauseAudioPreview(): void {
    this.audioPreviewState.isPlaying = false;
    this.notifyPreviewUpdate(this.audioPreviewState);
  }

  /**
   * Seek to time in video preview
   */
  seekVideoPreview(time: number): void {
    this.videoPreviewState.currentTime = Math.min(time, this.videoPreviewState.duration);
    this.notifyPreviewUpdate(this.videoPreviewState);
  }

  /**
   * Seek to time in audio preview
   */
  seekAudioPreview(time: number): void {
    this.audioPreviewState.currentTime = Math.min(time, this.audioPreviewState.duration);
    this.notifyPreviewUpdate(this.audioPreviewState);
  }

  /**
   * Get current video preview frame
   */
  getCurrentVideoFrame(): PreviewFrame | undefined {
    const frameIndex = Math.floor(
      (this.videoPreviewState.currentTime / this.videoPreviewState.duration) * 
      this.previewFrames.length
    );
    return this.previewFrames[frameIndex];
  }

  /**
   * Get audio waveform data
   */
  getAudioWaveform(): number[] {
    return this.audioPreviewState.waveformData;
  }

  /**
   * Set audio volume for preview
   */
  setAudioVolume(volume: number): void {
    this.audioPreviewState.volume = Math.max(0, Math.min(100, volume));
    this.notifyPreviewUpdate(this.audioPreviewState);
  }

  /**
   * Subscribe to preview updates
   */
  onPreviewUpdate(callback: (state: PreviewState | AudioPreviewState) => void): () => void {
    this.previewCallbacks.push(callback);
    return () => {
      this.previewCallbacks = this.previewCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Get current video preview state
   */
  getVideoPreviewState(): PreviewState {
    return { ...this.videoPreviewState };
  }

  /**
   * Get current audio preview state
   */
  getAudioPreviewState(): AudioPreviewState {
    return { ...this.audioPreviewState };
  }

  /**
   * Generate mock preview frames
   */
  private generateMockPreviewFrames(duration: number, fps: number): void {
    const frameCount = Math.ceil(duration * fps);
    this.previewFrames = Array.from({ length: frameCount }, (_, i) => ({
      timestamp: i / fps,
      data: this.generateMockFrameData(i, frameCount),
    }));
  }

  /**
   * Generate mock frame data (base64 encoded)
   */
  private generateMockFrameData(frameIndex: number, totalFrames: number): string {
    // Mock: return a simple color gradient based on frame position
    const progress = frameIndex / totalFrames;
    const hue = Math.floor(progress * 360);
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Crect fill='hsl(${hue},100%,50%)' width='320' height='180'/%3E%3C/svg%3E`;
  }

  /**
   * Generate mock waveform data
   */
  private generateMockWaveform(duration: number, sampleRate: number): number[] {
    const samples = Math.ceil(duration * sampleRate);
    return Array.from({ length: samples }, () => Math.random() * 100);
  }

  /**
   * Simulate playback
   */
  private simulatePlayback(type: 'video' | 'audio'): void {
    const state = type === 'video' ? this.videoPreviewState : this.audioPreviewState;
    const duration = state.duration;
    const startTime = Date.now();

    const interval = setInterval(() => {
      if (!state.isPlaying) {
        clearInterval(interval);
        return;
      }

      const elapsed = (Date.now() - startTime) / 1000;
      state.currentTime = Math.min(elapsed, duration);

      this.notifyPreviewUpdate(state);

      if (state.currentTime >= duration) {
        state.isPlaying = false;
        state.currentTime = 0;
        clearInterval(interval);
        this.notifyPreviewUpdate(state);
      }
    }, 100);
  }

  /**
   * Notify all subscribers of preview update
   */
  private notifyPreviewUpdate(state: PreviewState | AudioPreviewState): void {
    this.previewCallbacks.forEach(callback => callback(state));
  }

  /**
   * Get preview statistics
   */
  getPreviewStats() {
    return {
      videoFrames: this.previewFrames.length,
      audioSamples: this.audioPreviewState.waveformData.length,
      videoDuration: this.videoPreviewState.duration,
      audioDuration: this.audioPreviewState.duration,
      videoFps: this.videoPreviewState.fps,
    };
  }
}

export default new LivePreviewService();
