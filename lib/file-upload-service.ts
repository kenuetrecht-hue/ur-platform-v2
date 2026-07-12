/**
 * File Upload Service
 * Handles media file uploads for creators (video, audio, images)
 */

export interface UploadedFile {
  id: string;
  creatorId: string;
  filename: string;
  fileType: 'video' | 'audio' | 'image';
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  url: string;
  duration?: number; // For video/audio
  width?: number; // For images
  height?: number; // For images
  status: 'uploading' | 'completed' | 'failed';
  progress: number; // 0-100
}

export interface UploadProgress {
  fileId: string;
  progress: number;
  bytesUploaded: number;
  totalBytes: number;
  speed: number; // bytes per second
  estimatedTimeRemaining: number; // seconds
}

export class FileUploadService {
  private uploads: Map<string, UploadedFile> = new Map();
  private uploadProgress: Map<string, UploadProgress> = new Map();
  private creatorFiles: Map<string, string[]> = new Map(); // creatorId -> fileIds

  /**
   * Initialize upload for a file
   */
  initializeUpload(
    creatorId: string,
    filename: string,
    fileType: 'video' | 'audio' | 'image',
    fileSize: number,
    mimeType: string
  ): string {
    const fileId = `file-${Date.now()}-${Math.random()}`;
    const uploadedFile: UploadedFile = {
      id: fileId,
      creatorId,
      filename,
      fileType,
      fileSize,
      mimeType,
      uploadedAt: new Date(),
      url: `https://storage.urplatform.com/${creatorId}/${fileId}`,
      status: 'uploading',
      progress: 0,
    };

    this.uploads.set(fileId, uploadedFile);

    if (!this.creatorFiles.has(creatorId)) {
      this.creatorFiles.set(creatorId, []);
    }
    this.creatorFiles.get(creatorId)!.push(fileId);

    this.uploadProgress.set(fileId, {
      fileId,
      progress: 0,
      bytesUploaded: 0,
      totalBytes: fileSize,
      speed: 0,
      estimatedTimeRemaining: 0,
    });

    return fileId;
  }

  /**
   * Update upload progress
   */
  updateProgress(fileId: string, bytesUploaded: number, speed: number): UploadProgress {
    const file = this.uploads.get(fileId);
    if (!file) throw new Error(`File ${fileId} not found`);

    const progress = Math.round((bytesUploaded / file.fileSize) * 100);
    const estimatedTimeRemaining = speed > 0 ? (file.fileSize - bytesUploaded) / speed : 0;

    const progressData: UploadProgress = {
      fileId,
      progress,
      bytesUploaded,
      totalBytes: file.fileSize,
      speed,
      estimatedTimeRemaining,
    };

    this.uploadProgress.set(fileId, progressData);
    file.progress = progress;

    return progressData;
  }

  /**
   * Complete upload
   */
  completeUpload(fileId: string, metadata?: { duration?: number; width?: number; height?: number }): UploadedFile {
    const file = this.uploads.get(fileId);
    if (!file) throw new Error(`File ${fileId} not found`);

    file.status = 'completed';
    file.progress = 100;

    if (metadata) {
      if (metadata.duration) file.duration = metadata.duration;
      if (metadata.width) file.width = metadata.width;
      if (metadata.height) file.height = metadata.height;
    }

    return file;
  }

  /**
   * Fail upload
   */
  failUpload(fileId: string, reason: string): UploadedFile {
    const file = this.uploads.get(fileId);
    if (!file) throw new Error(`File ${fileId} not found`);

    file.status = 'failed';
    return file;
  }

  /**
   * Get file by ID
   */
  getFile(fileId: string): UploadedFile | undefined {
    return this.uploads.get(fileId);
  }

  /**
   * Get all files for a creator
   */
  getCreatorFiles(creatorId: string, fileType?: 'video' | 'audio' | 'image'): UploadedFile[] {
    const fileIds = this.creatorFiles.get(creatorId) || [];
    const files = fileIds
      .map((id) => this.uploads.get(id))
      .filter((f) => f !== undefined) as UploadedFile[];

    if (fileType) {
      return files.filter((f) => f.fileType === fileType);
    }
    return files;
  }

  /**
   * Delete file
   */
  deleteFile(fileId: string): boolean {
    const file = this.uploads.get(fileId);
    if (!file) return false;

    this.uploads.delete(fileId);
    this.uploadProgress.delete(fileId);

    const creatorFiles = this.creatorFiles.get(file.creatorId);
    if (creatorFiles) {
      const index = creatorFiles.indexOf(fileId);
      if (index > -1) {
        creatorFiles.splice(index, 1);
      }
    }

    return true;
  }

  /**
   * Get upload statistics
   */
  getUploadStats(creatorId: string) {
    const files = this.getCreatorFiles(creatorId);
    const totalSize = files.reduce((sum, f) => sum + f.fileSize, 0);
    const completed = files.filter((f) => f.status === 'completed').length;
    const failed = files.filter((f) => f.status === 'failed').length;
    const uploading = files.filter((f) => f.status === 'uploading').length;

    return {
      totalFiles: files.length,
      totalSize,
      completed,
      failed,
      uploading,
      byType: {
        video: files.filter((f) => f.fileType === 'video').length,
        audio: files.filter((f) => f.fileType === 'audio').length,
        image: files.filter((f) => f.fileType === 'image').length,
      },
    };
  }

  /**
   * Validate file before upload
   */
  validateFile(filename: string, fileType: 'video' | 'audio' | 'image', fileSize: number): { valid: boolean; error?: string } {
    // Check file size limits
    const maxSizes = {
      video: 5 * 1024 * 1024 * 1024, // 5GB
      audio: 500 * 1024 * 1024, // 500MB
      image: 100 * 1024 * 1024, // 100MB
    };

    if (fileSize > maxSizes[fileType]) {
      return {
        valid: false,
        error: `File size exceeds limit for ${fileType} (max ${maxSizes[fileType] / 1024 / 1024}MB)`,
      };
    }

    // Check filename
    if (!filename || filename.length === 0) {
      return { valid: false, error: 'Filename is required' };
    }

    if (filename.length > 255) {
      return { valid: false, error: 'Filename is too long (max 255 characters)' };
    }

    return { valid: true };
  }

  /**
   * Get upload progress
   */
  getProgress(fileId: string): UploadProgress | undefined {
    return this.uploadProgress.get(fileId);
  }

  /**
   * Cancel upload
   */
  cancelUpload(fileId: string): boolean {
    const file = this.uploads.get(fileId);
    if (!file) return false;

    if (file.status === 'uploading') {
      this.deleteFile(fileId);
      return true;
    }

    return false;
  }

  /**
   * Get total storage used by creator
   */
  getTotalStorageUsed(creatorId: string): number {
    const files = this.getCreatorFiles(creatorId);
    return files.reduce((sum, f) => sum + f.fileSize, 0);
  }

  /**
   * Check if creator has storage available
   */
  hasStorageAvailable(creatorId: string, additionalSize: number): boolean {
    const storageLimit = 100 * 1024 * 1024 * 1024; // 100GB per creator
    const used = this.getTotalStorageUsed(creatorId);
    return used + additionalSize <= storageLimit;
  }
}
