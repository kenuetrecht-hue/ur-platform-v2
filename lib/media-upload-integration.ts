/**
 * Media Upload Integration Service
 * Handles media uploads for creator dashboard with progress tracking and CDN delivery
 */

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number; // 0-100
  status: 'uploading' | 'transcoding' | 'complete' | 'error';
  cdnUrl?: string;
  error?: string;
  startTime: number;
  estimatedTime?: number;
}

export interface MediaFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
  uploadedAt: Date;
  cdnUrl: string;
  status: 'processing' | 'ready' | 'failed';
  creatorId: string;
}

class MediaUploadIntegration {
  private uploadProgress: Map<string, UploadProgress> = new Map();
  private mediaFiles: Map<string, MediaFile> = new Map();

  /**
   * Initiate media upload to S3
   */
  async uploadMedia(file: File, creatorId: string): Promise<UploadProgress> {
    const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const progress: UploadProgress = {
      fileId,
      fileName: file.name,
      progress: 0,
      status: 'uploading',
      startTime: Date.now(),
    };

    this.uploadProgress.set(fileId, progress);

    try {
      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('creatorId', creatorId);

      // Upload to /api/media/upload endpoint
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          progress.progress = Math.round(percentComplete);
          this.uploadProgress.set(fileId, { ...progress });
        }
      });

      // Handle completion
      return new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          const currentProgress = this.uploadProgress.get(fileId);
          if (!currentProgress) return;
          
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            currentProgress.status = 'transcoding';
            currentProgress.progress = 100;
            this.uploadProgress.set(fileId, { ...currentProgress });

            // Poll for transcoding completion
            this.pollTranscodingStatus(fileId, response.jobId, creatorId)
              .then(() => resolve(currentProgress))
              .catch(reject);
          } else {
            currentProgress.status = 'error';
            currentProgress.error = `Upload failed: ${xhr.status}`;
            this.uploadProgress.set(fileId, { ...currentProgress });
            reject(new Error(currentProgress.error));
          }
        });

        xhr.addEventListener('error', () => {
          const currentProgress = this.uploadProgress.get(fileId);
          if (currentProgress) {
            currentProgress.status = 'error';
            currentProgress.error = 'Network error during upload';
            this.uploadProgress.set(fileId, { ...currentProgress });
            reject(new Error(currentProgress.error));
          }
        });

        xhr.open('POST', '/api/media/upload');
        xhr.send(formData);
      });
    } catch (error) {
      const currentProgress = this.uploadProgress.get(fileId);
      if (currentProgress) {
        currentProgress.status = 'error';
        currentProgress.error = error instanceof Error ? error.message : 'Unknown error';
        this.uploadProgress.set(fileId, { ...currentProgress });
      }
      throw error;
    }
  }

  /**
   * Poll MediaConvert job status
   */
  private async pollTranscodingStatus(
    fileId: string,
    jobId: string,
    creatorId: string,
    maxAttempts: number = 120
  ): Promise<void> {
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const response = await fetch('/api/media/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId }),
          });

          const data = await response.json();
          const progress = this.uploadProgress.get(fileId);

          if (!progress) {
            reject(new Error('Upload progress not found'));
            return;
          }

          if (data.status === 'COMPLETE') {
            progress.status = 'complete';
            progress.progress = 100;
            progress.cdnUrl = data.cdnUrl;

            // Store media file
            const mediaFile: MediaFile = {
              id: fileId,
              fileName: progress.fileName,
              fileSize: 0,
              mimeType: 'video/mp4',
              uploadedAt: new Date(),
              cdnUrl: data.cdnUrl,
              status: 'ready',
              creatorId,
            };
            this.mediaFiles.set(fileId, mediaFile);

            this.uploadProgress.set(fileId, progress);
            resolve();
          } else if (data.status === 'FAILED') {
            progress.status = 'error';
            progress.error = 'Transcoding failed';
            this.uploadProgress.set(fileId, progress);
            reject(new Error('Transcoding failed'));
          } else {
            // Still processing
            progress.progress = Math.min(100, 50 + (attempts / maxAttempts) * 50);
            this.uploadProgress.set(fileId, progress);

            attempts++;
            if (attempts >= maxAttempts) {
              progress.status = 'error';
              progress.error = 'Transcoding timeout';
              this.uploadProgress.set(fileId, progress);
              reject(new Error('Transcoding timeout'));
            } else {
              setTimeout(poll, 5000); // Poll every 5 seconds
            }
          }
        } catch (error) {
          const currentProgress = this.uploadProgress.get(fileId);
          if (currentProgress) {
            currentProgress.status = 'error';
            currentProgress.error = error instanceof Error ? error.message : 'Poll error';
            this.uploadProgress.set(fileId, currentProgress);
          }
          reject(error);
        }
      };

      poll();
    });
  }

  /**
   * Get upload progress
   */
  getProgress(fileId: string): UploadProgress | undefined {
    return this.uploadProgress.get(fileId);
  }

  /**
   * Get all media files for creator
   */
  getCreatorMedia(creatorId: string): MediaFile[] {
    return Array.from(this.mediaFiles.values()).filter(
      (file) => file.creatorId === creatorId
    );
  }

  /**
   * Delete media file
   */
  async deleteMedia(fileId: string): Promise<void> {
    const mediaFile = this.mediaFiles.get(fileId);
    if (!mediaFile) {
      throw new Error('Media file not found');
    }

    // Call delete endpoint
    const response = await fetch('/api/media/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, cdnUrl: mediaFile.cdnUrl }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete media');
    }

    this.mediaFiles.delete(fileId);
  }
}

export const mediaUploadIntegration = new MediaUploadIntegration();
