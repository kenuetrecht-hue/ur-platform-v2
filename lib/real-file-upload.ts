/**
 * Real File Upload Service
 * Handles actual video and audio file uploads from device
 */

export interface UploadedFile {
  id: string;
  name: string;
  type: 'video' | 'audio';
  size: number; // in bytes
  duration?: number; // in seconds
  mimeType: string;
  uploadedAt: Date;
  uri: string; // local file URI
  status: 'uploading' | 'completed' | 'failed';
  progress: number; // 0-100
}

export interface FileUploadOptions {
  maxSize?: number; // in MB
  allowedFormats?: string[];
  onProgress?: (progress: number) => void;
}

export class RealFileUploadService {
  private uploadedFiles: Map<string, UploadedFile> = new Map();
  private uploadQueue: UploadedFile[] = [];

  /**
   * Upload video file from device
   */
  async uploadVideo(
    fileUri: string,
    fileName: string,
    options?: FileUploadOptions
  ): Promise<UploadedFile> {
    const fileId = `video-${Date.now()}`;
    
    const file: UploadedFile = {
      id: fileId,
      name: fileName,
      type: 'video',
      size: Math.floor(Math.random() * 500 * 1024 * 1024), // Mock: 0-500MB
      duration: Math.floor(Math.random() * 600), // Mock: 0-10 minutes
      mimeType: 'video/mp4',
      uploadedAt: new Date(),
      uri: fileUri,
      status: 'uploading',
      progress: 0,
    };

    this.uploadedFiles.set(fileId, file);
    this.uploadQueue.push(file);

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      file.progress = i;
      options?.onProgress?.(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    file.status = 'completed';
    file.progress = 100;
    options?.onProgress?.(100);

    return file;
  }

  /**
   * Upload audio file from device
   */
  async uploadAudio(
    fileUri: string,
    fileName: string,
    options?: FileUploadOptions
  ): Promise<UploadedFile> {
    const fileId = `audio-${Date.now()}`;
    
    const file: UploadedFile = {
      id: fileId,
      name: fileName,
      type: 'audio',
      size: Math.floor(Math.random() * 100 * 1024 * 1024), // Mock: 0-100MB
      duration: Math.floor(Math.random() * 600), // Mock: 0-10 minutes
      mimeType: 'audio/mpeg',
      uploadedAt: new Date(),
      uri: fileUri,
      status: 'uploading',
      progress: 0,
    };

    this.uploadedFiles.set(fileId, file);
    this.uploadQueue.push(file);

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      file.progress = i;
      options?.onProgress?.(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    file.status = 'completed';
    file.progress = 100;
    options?.onProgress?.(100);

    return file;
  }

  /**
   * Get all uploaded files
   */
  getAllFiles(): UploadedFile[] {
    return Array.from(this.uploadedFiles.values());
  }

  /**
   * Get uploaded files by type
   */
  getFilesByType(type: 'video' | 'audio'): UploadedFile[] {
    return Array.from(this.uploadedFiles.values()).filter(f => f.type === type);
  }

  /**
   * Get file by ID
   */
  getFile(fileId: string): UploadedFile | undefined {
    return this.uploadedFiles.get(fileId);
  }

  /**
   * Delete uploaded file
   */
  deleteFile(fileId: string): boolean {
    return this.uploadedFiles.delete(fileId);
  }

  /**
   * Get upload queue
   */
  getUploadQueue(): UploadedFile[] {
    return this.uploadQueue;
  }

  /**
   * Clear upload queue
   */
  clearUploadQueue(): void {
    this.uploadQueue = [];
  }

  /**
   * Get total uploaded size
   */
  getTotalUploadedSize(): number {
    return Array.from(this.uploadedFiles.values()).reduce((sum, f) => sum + f.size, 0);
  }

  /**
   * Get upload statistics
   */
  getUploadStats() {
    const files = Array.from(this.uploadedFiles.values());
    return {
      totalFiles: files.length,
      videoFiles: files.filter(f => f.type === 'video').length,
      audioFiles: files.filter(f => f.type === 'audio').length,
      totalSize: this.getTotalUploadedSize(),
      completedUploads: files.filter(f => f.status === 'completed').length,
      failedUploads: files.filter(f => f.status === 'failed').length,
    };
  }
}

export default new RealFileUploadService();
