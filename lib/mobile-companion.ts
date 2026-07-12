/**
 * Mobile App Companion Service
 * Manages native iOS/Android app synchronization with web platform
 * Handles offline-first content creation and mobile-optimized editing
 */

interface MobileDevice {
  id: string;
  userId: string;
  platform: 'ios' | 'android';
  appVersion: string;
  isOnline: boolean;
  lastSync: number;
}

interface OfflineProject {
  id: string;
  userId: string;
  title: string;
  content: Record<string, unknown>;
  isSynced: boolean;
  lastModified: number;
  createdAt: number;
}

interface SyncQueue {
  id: string;
  deviceId: string;
  action: 'create' | 'update' | 'delete';
  resource: string;
  data: Record<string, unknown>;
  timestamp: number;
  isSynced: boolean;
}

export class MobileCompanionService {
  private devices: Map<string, MobileDevice> = new Map();
  private offlineProjects: Map<string, OfflineProject> = new Map();
  private syncQueues: Map<string, SyncQueue[]> = new Map();
  private syncHistory: SyncQueue[] = [];

  /**
   * Register a mobile device
   */
  registerDevice(
    deviceId: string,
    userId: string,
    platform: 'ios' | 'android',
    appVersion: string
  ): MobileDevice {
    const device: MobileDevice = {
      id: deviceId,
      userId,
      platform,
      appVersion,
      isOnline: true,
      lastSync: Date.now(),
    };

    this.devices.set(deviceId, device);

    // Initialize sync queue for this device
    if (!this.syncQueues.has(deviceId)) {
      this.syncQueues.set(deviceId, []);
    }

    return device;
  }

  /**
   * Create an offline project on mobile device
   */
  createOfflineProject(
    projectId: string,
    userId: string,
    title: string,
    content: Record<string, unknown>
  ): OfflineProject {
    const project: OfflineProject = {
      id: projectId,
      userId,
      title,
      content,
      isSynced: false,
      lastModified: Date.now(),
      createdAt: Date.now(),
    };

    this.offlineProjects.set(projectId, project);
    return project;
  }

  /**
   * Update an offline project
   */
  updateOfflineProject(
    projectId: string,
    content: Record<string, unknown>
  ): OfflineProject | null {
    const project = this.offlineProjects.get(projectId);
    if (!project) return null;

    project.content = { ...project.content, ...content };
    project.lastModified = Date.now();
    project.isSynced = false;

    return project;
  }

  /**
   * Queue a sync action for a device
   */
  queueSyncAction(
    deviceId: string,
    action: 'create' | 'update' | 'delete',
    resource: string,
    data: Record<string, unknown>
  ): SyncQueue {
    const syncItem: SyncQueue = {
      id: `sync_${Date.now()}_${Math.random()}`,
      deviceId,
      action,
      resource,
      data,
      timestamp: Date.now(),
      isSynced: false,
    };

    const queue = this.syncQueues.get(deviceId) || [];
    queue.push(syncItem);
    this.syncQueues.set(deviceId, queue);

    return syncItem;
  }

  /**
   * Sync device with server
   */
  syncDevice(deviceId: string): Record<string, unknown> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return { success: false, error: 'Device not found' };
    }

    const queue = this.syncQueues.get(deviceId) || [];
    const syncedItems: SyncQueue[] = [];

    for (const item of queue) {
      // Mark as synced
      item.isSynced = true;
      syncedItems.push(item);
      this.syncHistory.push(item);

      // Update offline project if applicable
      if (item.resource === 'project') {
        const projectId = item.data.projectId as string;
        const project = this.offlineProjects.get(projectId);
        if (project) {
          project.isSynced = true;
        }
      }
    }

    // Clear synced items from queue
    this.syncQueues.set(deviceId, []);

    // Update device sync status
    device.lastSync = Date.now();
    device.isOnline = true;

    return {
      success: true,
      deviceId,
      syncedCount: syncedItems.length,
      timestamp: Date.now(),
    };
  }

  /**
   * Get pending sync items for a device
   */
  getPendingSyncItems(deviceId: string): SyncQueue[] {
    return this.syncQueues.get(deviceId) || [];
  }

  /**
   * Mark device as offline
   */
  setDeviceOffline(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    device.isOnline = false;
    return true;
  }

  /**
   * Get offline projects for a user
   */
  getUserOfflineProjects(userId: string): OfflineProject[] {
    const projects: OfflineProject[] = [];

    for (const project of this.offlineProjects.values()) {
      if (project.userId === userId) {
        projects.push(project);
      }
    }

    return projects;
  }

  /**
   * Get user's mobile devices
   */
  getUserDevices(userId: string): MobileDevice[] {
    const userDevices: MobileDevice[] = [];

    for (const device of this.devices.values()) {
      if (device.userId === userId) {
        userDevices.push(device);
      }
    }

    return userDevices;
  }

  /**
   * Push notification to mobile device
   */
  pushNotification(
    deviceId: string,
    title: string,
    message: string
  ): Record<string, unknown> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return { success: false, error: 'Device not found' };
    }

    return {
      success: true,
      deviceId,
      platform: device.platform,
      title,
      message,
      timestamp: Date.now(),
    };
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): Record<string, unknown> {
    let onlineDevices = 0;
    let offlineDevices = 0;
    let totalPendingSync = 0;

    for (const device of this.devices.values()) {
      if (device.isOnline) {
        onlineDevices++;
      } else {
        offlineDevices++;
      }
    }

    for (const queue of this.syncQueues.values()) {
      totalPendingSync += queue.filter((item) => !item.isSynced).length;
    }

    return {
      totalDevices: this.devices.size,
      onlineDevices,
      offlineDevices,
      offlineProjects: this.offlineProjects.size,
      pendingSyncItems: totalPendingSync,
      totalSyncedItems: this.syncHistory.length,
    };
  }

  /**
   * Get sync history
   */
  getSyncHistory(limit: number = 100): SyncQueue[] {
    return this.syncHistory.slice(-limit);
  }

  /**
   * Delete offline project
   */
  deleteOfflineProject(projectId: string): boolean {
    return this.offlineProjects.delete(projectId);
  }

  /**
   * Clear sync history for a device
   */
  clearDeviceSyncHistory(deviceId: string): number {
    const initialLength = this.syncHistory.length;
    this.syncHistory = this.syncHistory.filter(
      (item) => item.deviceId !== deviceId
    );
    return initialLength - this.syncHistory.length;
  }

  /**
   * Get app version compatibility
   */
  checkAppCompatibility(
    appVersion: string
  ): Record<string, unknown> {
    const minVersion = '1.0.0';
    const latestVersion = '2.0.0';

    const isCompatible = appVersion >= minVersion;
    const needsUpdate = appVersion < latestVersion;

    return {
      appVersion,
      isCompatible,
      needsUpdate,
      minVersion,
      latestVersion,
    };
  }
}
