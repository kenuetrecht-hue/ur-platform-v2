import { describe, it, expect, beforeEach } from 'vitest';

// Inline implementations for testing
class WebSocketSyncService {
  private clients = new Map();
  private projectSubscriptions = new Map();
  private messageQueue = new Map();
  private changeLog = [];

  registerClient(clientId, userId, projectId) {
    const client = { id: clientId, userId, projectId, isConnected: true, lastHeartbeat: Date.now() };
    this.clients.set(clientId, client);
    if (!this.projectSubscriptions.has(projectId)) {
      this.projectSubscriptions.set(projectId, new Set());
    }
    this.projectSubscriptions.get(projectId).add(clientId);
    if (!this.messageQueue.has(clientId)) {
      this.messageQueue.set(clientId, []);
    }
    return client;
  }

  disconnectClient(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return false;
    client.isConnected = false;
    const subscribers = this.projectSubscriptions.get(client.projectId);
    if (subscribers) subscribers.delete(clientId);
    return true;
  }

  broadcastUpdate(projectId, userId, data) {
    const message = {
      id: `msg_${Date.now()}_${Math.random()}`,
      type: 'update',
      projectId,
      userId,
      data,
      timestamp: Date.now(),
    };
    const subscribers = this.projectSubscriptions.get(projectId) || new Set();
    let deliveredCount = 0;
    for (const clientId of subscribers) {
      const client = this.clients.get(clientId);
      if (client && client.isConnected) {
        const queue = this.messageQueue.get(clientId) || [];
        queue.push(message);
        this.messageQueue.set(clientId, queue);
        deliveredCount++;
      }
    }
    this.changeLog.push({
      id: message.id,
      projectId,
      userId,
      changeType: 'edit',
      resource: data.resource,
      newValue: data,
      timestamp: Date.now(),
    });
    return deliveredCount;
  }

  sendNotification(userId, title, message) {
    const notification = {
      id: `notif_${Date.now()}_${Math.random()}`,
      type: 'notification',
      projectId: '',
      userId,
      data: { title, message },
      timestamp: Date.now(),
    };
    let deliveredCount = 0;
    for (const [clientId, client] of this.clients.entries()) {
      if (client.userId === userId && client.isConnected) {
        const queue = this.messageQueue.get(clientId) || [];
        queue.push(notification);
        this.messageQueue.set(clientId, queue);
        deliveredCount++;
      }
    }
    return deliveredCount;
  }

  broadcastPresence(projectId) {
    const subscribers = this.projectSubscriptions.get(projectId) || new Set();
    const presence = {};
    for (const clientId of subscribers) {
      const client = this.clients.get(clientId);
      if (client && client.isConnected) {
        presence[client.userId] = { clientId, isOnline: true, lastSeen: client.lastHeartbeat };
      }
    }
    const message = {
      id: `presence_${Date.now()}`,
      type: 'presence',
      projectId,
      userId: 'system',
      data: presence,
      timestamp: Date.now(),
    };
    for (const clientId of subscribers) {
      const queue = this.messageQueue.get(clientId) || [];
      queue.push(message);
      this.messageQueue.set(clientId, queue);
    }
    return presence;
  }

  getPendingMessages(clientId) {
    const messages = this.messageQueue.get(clientId) || [];
    this.messageQueue.set(clientId, []);
    return messages;
  }

  getActiveClients(projectId) {
    const subscribers = this.projectSubscriptions.get(projectId) || new Set();
    const activeClients = [];
    for (const clientId of subscribers) {
      const client = this.clients.get(clientId);
      if (client && client.isConnected) activeClients.push(client);
    }
    return activeClients;
  }

  getStats() {
    let connectedClients = 0;
    for (const client of this.clients.values()) {
      if (client.isConnected) connectedClients++;
    }
    return {
      totalClients: this.clients.size,
      connectedClients,
      activeProjects: this.projectSubscriptions.size,
    };
  }
}

class MobileCompanionService {
  private devices = new Map();
  private offlineProjects = new Map();
  private syncQueues = new Map();
  private syncHistory = [];

  registerDevice(deviceId, userId, platform, appVersion) {
    const device = {
      id: deviceId,
      userId,
      platform,
      appVersion,
      isOnline: true,
      lastSync: Date.now(),
    };
    this.devices.set(deviceId, device);
    if (!this.syncQueues.has(deviceId)) {
      this.syncQueues.set(deviceId, []);
    }
    return device;
  }

  createOfflineProject(projectId, userId, title, content) {
    const project = {
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

  updateOfflineProject(projectId, content) {
    const project = this.offlineProjects.get(projectId);
    if (!project) return null;
    project.content = { ...project.content, ...content };
    project.lastModified = Date.now();
    project.isSynced = false;
    return project;
  }

  queueSyncAction(deviceId, action, resource, data) {
    const syncItem = {
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

  syncDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) return { success: false };
    const queue = this.syncQueues.get(deviceId) || [];
    for (const item of queue) {
      item.isSynced = true;
      this.syncHistory.push(item);
    }
    this.syncQueues.set(deviceId, []);
    device.lastSync = Date.now();
    device.isOnline = true;
    return { success: true, syncedCount: queue.length };
  }

  getPendingSyncItems(deviceId) {
    return this.syncQueues.get(deviceId) || [];
  }

  getUserOfflineProjects(userId) {
    const projects = [];
    for (const project of this.offlineProjects.values()) {
      if (project.userId === userId) projects.push(project);
    }
    return projects;
  }

  getSyncStats() {
    let onlineDevices = 0;
    for (const device of this.devices.values()) {
      if (device.isOnline) onlineDevices++;
    }
    return {
      totalDevices: this.devices.size,
      onlineDevices,
      offlineProjects: this.offlineProjects.size,
    };
  }
}

describe('WebSocket Real-Time Sync', () => {
  let wsService;

  beforeEach(() => {
    wsService = new WebSocketSyncService();
  });

  it('should register a client', () => {
    const client = wsService.registerClient('client_1', 'user_1', 'project_1');
    expect(client.id).toBe('client_1');
    expect(client.userId).toBe('user_1');
    expect(client.isConnected).toBe(true);
  });

  it('should broadcast updates to subscribers', () => {
    wsService.registerClient('client_1', 'user_1', 'project_1');
    wsService.registerClient('client_2', 'user_2', 'project_1');

    const delivered = wsService.broadcastUpdate('project_1', 'user_1', {
      resource: 'video',
      action: 'crop',
    });

    expect(delivered).toBe(2);
  });

  it('should send notifications to specific users', () => {
    wsService.registerClient('client_1', 'user_1', 'project_1');
    wsService.registerClient('client_2', 'user_1', 'project_2');

    const delivered = wsService.sendNotification('user_1', 'Update', 'Your video is ready');

    expect(delivered).toBe(2);
  });

  it('should broadcast presence information', () => {
    wsService.registerClient('client_1', 'user_1', 'project_1');
    wsService.registerClient('client_2', 'user_2', 'project_1');

    const presence = wsService.broadcastPresence('project_1');

    expect(Object.keys(presence).length).toBe(2);
    expect(presence.user_1).toBeDefined();
    expect(presence.user_2).toBeDefined();
  });

  it('should get pending messages for a client', () => {
    wsService.registerClient('client_1', 'user_1', 'project_1');
    wsService.broadcastUpdate('project_1', 'user_1', { resource: 'audio' });

    const messages = wsService.getPendingMessages('client_1');

    expect(messages.length).toBeGreaterThan(0);
  });

  it('should disconnect a client', () => {
    wsService.registerClient('client_1', 'user_1', 'project_1');
    const disconnected = wsService.disconnectClient('client_1');

    expect(disconnected).toBe(true);
  });

  it('should get active clients for a project', () => {
    wsService.registerClient('client_1', 'user_1', 'project_1');
    wsService.registerClient('client_2', 'user_2', 'project_1');
    wsService.disconnectClient('client_2');

    const activeClients = wsService.getActiveClients('project_1');

    expect(activeClients.length).toBe(1);
  });

  it('should track connection statistics', () => {
    wsService.registerClient('client_1', 'user_1', 'project_1');
    wsService.registerClient('client_2', 'user_2', 'project_1');

    const stats = wsService.getStats();

    expect(stats.totalClients).toBe(2);
    expect(stats.connectedClients).toBe(2);
  });
});

describe('Mobile App Companion', () => {
  let mobileService;

  beforeEach(() => {
    mobileService = new MobileCompanionService();
  });

  it('should register a mobile device', () => {
    const device = mobileService.registerDevice('device_1', 'user_1', 'ios', '1.0.0');

    expect(device.id).toBe('device_1');
    expect(device.platform).toBe('ios');
    expect(device.isOnline).toBe(true);
  });

  it('should create an offline project', () => {
    const project = mobileService.createOfflineProject('proj_1', 'user_1', 'My Video', {
      duration: 60,
    });

    expect(project.id).toBe('proj_1');
    expect(project.isSynced).toBe(false);
  });

  it('should update an offline project', () => {
    mobileService.createOfflineProject('proj_1', 'user_1', 'My Video', { duration: 60 });
    const updated = mobileService.updateOfflineProject('proj_1', { duration: 120 });

    expect(updated.content.duration).toBe(120);
    expect(updated.isSynced).toBe(false);
  });

  it('should queue sync actions', () => {
    const syncItem = mobileService.queueSyncAction('device_1', 'create', 'project', {
      projectId: 'proj_1',
    });

    expect(syncItem.action).toBe('create');
    expect(syncItem.isSynced).toBe(false);
  });

  it('should sync device with server', () => {
    mobileService.registerDevice('device_1', 'user_1', 'ios', '1.0.0');
    mobileService.queueSyncAction('device_1', 'create', 'project', { projectId: 'proj_1' });
    mobileService.queueSyncAction('device_1', 'update', 'project', { projectId: 'proj_1' });

    const result = mobileService.syncDevice('device_1');

    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(2);
  });

  it('should get pending sync items', () => {
    mobileService.registerDevice('device_1', 'user_1', 'ios', '1.0.0');
    mobileService.queueSyncAction('device_1', 'create', 'project', { projectId: 'proj_1' });

    const pending = mobileService.getPendingSyncItems('device_1');

    expect(pending.length).toBe(1);
  });

  it('should get user offline projects', () => {
    mobileService.createOfflineProject('proj_1', 'user_1', 'Video 1', {});
    mobileService.createOfflineProject('proj_2', 'user_1', 'Video 2', {});
    mobileService.createOfflineProject('proj_3', 'user_2', 'Video 3', {});

    const projects = mobileService.getUserOfflineProjects('user_1');

    expect(projects.length).toBe(2);
  });

  it('should track sync statistics', () => {
    mobileService.registerDevice('device_1', 'user_1', 'ios', '1.0.0');
    mobileService.registerDevice('device_2', 'user_1', 'android', '1.0.0');
    mobileService.createOfflineProject('proj_1', 'user_1', 'Video', {});

    const stats = mobileService.getSyncStats();

    expect(stats.totalDevices).toBe(2);
    expect(stats.onlineDevices).toBe(2);
    expect(stats.offlineProjects).toBe(1);
  });
});

describe('Integration: WebSocket + Mobile', () => {
  it('should sync mobile changes to web in real-time', () => {
    const wsService = new WebSocketSyncService();
    const mobileService = new MobileCompanionService();

    // Register web client
    wsService.registerClient('web_client_1', 'user_1', 'project_1');

    // Register mobile device
    mobileService.registerDevice('mobile_1', 'user_1', 'ios', '1.0.0');

    // Create offline project on mobile
    mobileService.createOfflineProject('project_1', 'user_1', 'My Video', {});

    // Queue sync action
    mobileService.queueSyncAction('mobile_1', 'update', 'project', {
      projectId: 'project_1',
      changes: { duration: 120 },
    });

    // Sync mobile to server
    const syncResult = mobileService.syncDevice('mobile_1');
    expect(syncResult.success).toBe(true);

    // Broadcast to web clients
    const delivered = wsService.broadcastUpdate('project_1', 'user_1', {
      resource: 'project',
      changes: { duration: 120 },
    });

    expect(delivered).toBe(1);

    // Web client receives update
    const messages = wsService.getPendingMessages('web_client_1');
    expect(messages.length).toBeGreaterThan(0);
  });
});
