/**
 * Video Editor Service - Phase 2
 * Handles video cropping, trimming, effects, and processing
 */

export interface VideoFile {
  id: string;
  uri: string;
  name: string;
  duration: number;
  width: number;
  height: number;
  fileSize: number;
  createdAt: string;
}

export interface VideoEditOperation {
  id: string;
  type: "crop" | "trim" | "effect" | "overlay" | "transition";
  startTime?: number;
  endTime?: number;
  cropBox?: CropBox;
  effect?: VideoEffect;
  overlay?: OverlayConfig;
  transition?: TransitionConfig;
}

export interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VideoEffect {
  name: string;
  intensity: number; // 0-1
  params?: Record<string, any>;
}

export interface OverlayConfig {
  type: "text" | "image" | "watermark";
  content: string;
  position: "top-left" | "top-center" | "top-right" | "center" | "bottom-left" | "bottom-center" | "bottom-right";
  opacity: number;
  duration: number;
}

export interface TransitionConfig {
  type: "fade" | "slide" | "zoom" | "wipe";
  duration: number;
  easing: string;
}

export interface EditedVideo {
  id: string;
  originalId: string;
  operations: VideoEditOperation[];
  preview: string;
  status: "pending" | "processing" | "completed" | "failed";
  outputUri?: string;
  error?: string;
}

class VideoEditor {
  private videos: Map<string, VideoFile> = new Map();
  private editedVideos: Map<string, EditedVideo> = new Map();
  private processingQueue: string[] = [];

  /**
   * Import a video file
   */
  async importVideo(uri: string, name: string, metadata: Partial<VideoFile>): Promise<VideoFile> {
    const video: VideoFile = {
      id: `video-${Date.now()}`,
      uri,
      name,
      duration: metadata.duration || 0,
      width: metadata.width || 1920,
      height: metadata.height || 1080,
      fileSize: metadata.fileSize || 0,
      createdAt: new Date().toISOString(),
    };

    this.videos.set(video.id, video);
    return video;
  }

  /**
   * Get video by ID
   */
  getVideo(videoId: string): VideoFile | undefined {
    return this.videos.get(videoId);
  }

  /**
   * List all videos
   */
  listVideos(): VideoFile[] {
    return Array.from(this.videos.values());
  }

  /**
   * Create a new edit session
   */
  createEditSession(videoId: string): EditedVideo {
    const video = this.videos.get(videoId);
    if (!video) {
      throw new Error(`Video ${videoId} not found`);
    }

    const edited: EditedVideo = {
      id: `edit-${Date.now()}`,
      originalId: videoId,
      operations: [],
      preview: video.uri,
      status: "pending",
    };

    this.editedVideos.set(edited.id, edited);
    return edited;
  }

  /**
   * Add crop operation
   */
  async cropVideo(editId: string, cropBox: CropBox): Promise<EditedVideo> {
    const edited = this.editedVideos.get(editId);
    if (!edited) {
      throw new Error(`Edit session ${editId} not found`);
    }

    const operation: VideoEditOperation = {
      id: `op-${Date.now()}`,
      type: "crop",
      cropBox,
    };

    edited.operations.push(operation);
    edited.status = "pending";

    return edited;
  }

  /**
   * Add trim operation (cut start/end)
   */
  async trimVideo(editId: string, startTime: number, endTime: number): Promise<EditedVideo> {
    const edited = this.editedVideos.get(editId);
    if (!edited) {
      throw new Error(`Edit session ${editId} not found`);
    }

    const operation: VideoEditOperation = {
      id: `op-${Date.now()}`,
      type: "trim",
      startTime,
      endTime,
    };

    edited.operations.push(operation);
    edited.status = "pending";

    return edited;
  }

  /**
   * Add visual effect
   */
  async addEffect(editId: string, effect: VideoEffect): Promise<EditedVideo> {
    const edited = this.editedVideos.get(editId);
    if (!edited) {
      throw new Error(`Edit session ${editId} not found`);
    }

    const operation: VideoEditOperation = {
      id: `op-${Date.now()}`,
      type: "effect",
      effect,
    };

    edited.operations.push(operation);
    edited.status = "pending";

    return edited;
  }

  /**
   * Add overlay (text, image, watermark)
   */
  async addOverlay(editId: string, overlay: OverlayConfig): Promise<EditedVideo> {
    const edited = this.editedVideos.get(editId);
    if (!edited) {
      throw new Error(`Edit session ${editId} not found`);
    }

    const operation: VideoEditOperation = {
      id: `op-${Date.now()}`,
      type: "overlay",
      overlay,
    };

    edited.operations.push(operation);
    edited.status = "pending";

    return edited;
  }

  /**
   * Add transition between clips
   */
  async addTransition(editId: string, transition: TransitionConfig): Promise<EditedVideo> {
    const edited = this.editedVideos.get(editId);
    if (!edited) {
      throw new Error(`Edit session ${editId} not found`);
    }

    const operation: VideoEditOperation = {
      id: `op-${Date.now()}`,
      type: "transition",
      transition,
    };

    edited.operations.push(operation);
    edited.status = "pending";

    return edited;
  }

  /**
   * Get edit session
   */
  getEditSession(editId: string): EditedVideo | undefined {
    return this.editedVideos.get(editId);
  }

  /**
   * Preview the edited video
   */
  async generatePreview(editId: string): Promise<string> {
    const edited = this.editedVideos.get(editId);
    if (!edited) {
      throw new Error(`Edit session ${editId} not found`);
    }

    // Mock preview generation
    const previewUrl = `preview-${editId}-${Date.now()}`;
    edited.preview = previewUrl;

    return previewUrl;
  }

  /**
   * Export/render the edited video
   */
  async exportVideo(editId: string): Promise<string> {
    const edited = this.editedVideos.get(editId);
    if (!edited) {
      throw new Error(`Edit session ${editId} not found`);
    }

    // Add to processing queue
    this.processingQueue.push(editId);
    edited.status = "processing";

    // Simulate processing
    return new Promise((resolve) => {
      setTimeout(() => {
        const outputUri = `exported-${editId}-${Date.now()}.mp4`;
        edited.outputUri = outputUri;
        edited.status = "completed";
        this.processingQueue = this.processingQueue.filter((id) => id !== editId);
        resolve(outputUri);
      }, 2000);
    });
  }

  /**
   * Get processing status
   */
  getProcessingStatus(editId: string): string {
    const edited = this.editedVideos.get(editId);
    return edited?.status || "unknown";
  }

  /**
   * Undo last operation
   */
  undoOperation(editId: string): EditedVideo | undefined {
    const edited = this.editedVideos.get(editId);
    if (!edited || edited.operations.length === 0) {
      return edited;
    }

    edited.operations.pop();
    edited.status = "pending";

    return edited;
  }

  /**
   * Clear all operations
   */
  resetEdit(editId: string): EditedVideo | undefined {
    const edited = this.editedVideos.get(editId);
    if (!edited) {
      return undefined;
    }

    edited.operations = [];
    edited.status = "pending";

    return edited;
  }

  /**
   * Delete edit session
   */
  deleteEditSession(editId: string): boolean {
    return this.editedVideos.delete(editId);
  }

  /**
   * Get operation history
   */
  getOperationHistory(editId: string): VideoEditOperation[] {
    const edited = this.editedVideos.get(editId);
    return edited?.operations || [];
  }
}

export default VideoEditor;
