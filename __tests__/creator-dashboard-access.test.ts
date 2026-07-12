import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Creator Dashboard Access Tests
 * Tests role-based access control and creator-only features
 */

class MockCreatorAuthService {
  private users: Map<string, any> = new Map();
  private currentUser: any = null;

  registerFirstCreator(userId: string, username: string, email: string) {
    const profile = {
      creatorId: `creator-first-${Date.now()}`,
      userId,
      username,
      email,
      role: 'admin',
      isVerified: true,
      joinedAt: new Date(),
      permissions: [
        'view_dashboard',
        'create_projects',
        'edit_own_projects',
        'export_content',
        'collaborate',
        'share_projects',
        'advanced_effects',
        'monetize_content',
        'manage_team',
        'access_analytics',
        'manage_users',
        'system_admin',
      ],
      accessLevel: 'admin',
    };
    this.users.set(userId, profile);
    return profile;
  }

  registerRegularUser(userId: string, username: string, email: string) {
    const profile = {
      userId,
      username,
      email,
      role: 'user',
      isVerified: false,
      joinedAt: new Date(),
      permissions: [],
      accessLevel: 'none',
    };
    this.users.set(userId, profile);
    return profile;
  }

  isCreator(userId: string): boolean {
    const profile = this.users.get(userId);
    return profile ? profile.role === 'creator' || profile.role === 'admin' : false;
  }

  isAdmin(userId: string): boolean {
    const profile = this.users.get(userId);
    return profile ? profile.role === 'admin' : false;
  }

  getAccessControl(userId: string) {
    const profile = this.users.get(userId);

    if (!profile || profile.role === 'user') {
      return {
        canAccessVideoEditor: false,
        canAccessAudioProducer: false,
        canAccessContentGenerator: false,
        canAccessDashboard: false,
        canCollaborate: false,
        canMonetize: false,
      };
    }

    return {
      canAccessVideoEditor: true,
      canAccessAudioProducer: true,
      canAccessContentGenerator: true,
      canAccessDashboard: true,
      canCollaborate: true,
      canMonetize: profile.role === 'admin',
    };
  }

  getVisibleTabs(userId: string): string[] {
    const isCreator = this.isCreator(userId);

    if (!isCreator) {
      return ['home', 'discover', 'messages', 'wallet', 'stickers', 'profile'];
    }

    return [
      'home',
      'discover',
      'messages',
      'wallet',
      'stickers',
      'profile',
      'creator-dashboard',
    ];
  }

  isTabVisible(userId: string, tabName: string): boolean {
    const visibleTabs = this.getVisibleTabs(userId);
    return visibleTabs.includes(tabName);
  }

  getCurrentUser() {
    return this.currentUser;
  }
}

class MockCreatorDashboard {
  private sessions: Map<string, any> = new Map();
  private stats: Map<string, any> = new Map();

  initializeDashboard(userId: string) {
    if (!this.stats.has(userId)) {
      this.stats.set(userId, {
        userId,
        totalProjects: 0,
        totalEarnings: 0,
        collaborators: 0,
        views: 0,
      });
    }
    return this.stats.get(userId);
  }

  createVideoSession(userId: string) {
    const sessionId = `video-${Date.now()}-${Math.random()}`;
    this.sessions.set(sessionId, {
      id: sessionId,
      userId,
      type: 'video',
      createdAt: new Date(),
    });
    return sessionId;
  }

  createAudioSession(userId: string) {
    const sessionId = `audio-${Date.now()}-${Math.random()}`;
    this.sessions.set(sessionId, {
      id: sessionId,
      userId,
      type: 'audio',
      createdAt: new Date(),
    });
    return sessionId;
  }

  createContentItem(userId: string) {
    const itemId = `content-${Date.now()}-${Math.random()}`;
    this.sessions.set(itemId, {
      id: itemId,
      userId,
      type: 'content',
      createdAt: new Date(),
    });
    return itemId;
  }

  getUserSessions(userId: string) {
    return Array.from(this.sessions.values()).filter((s) => s.userId === userId);
  }

  getDashboardStats(userId: string) {
    return this.initializeDashboard(userId);
  }
}

describe('Creator Dashboard Access Control', () => {
  let authService: MockCreatorAuthService;
  let dashboard: MockCreatorDashboard;
  const firstCreatorId = 'first-creator-001';
  const regularUserId = 'regular-user-001';

  beforeEach(() => {
    authService = new MockCreatorAuthService();
    dashboard = new MockCreatorDashboard();
  });

  describe('Creator Authentication', () => {
    it('should register first creator with admin access', () => {
      const profile = authService.registerFirstCreator(
        firstCreatorId,
        'First Creator',
        'creator@urplatform.com'
      );

      expect(profile.role).toBe('admin');
      expect(profile.isVerified).toBe(true);
      expect(profile.accessLevel).toBe('admin');
    });

    it('should register regular user without creator access', () => {
      const profile = authService.registerRegularUser(
        regularUserId,
        'Regular User',
        'user@urplatform.com'
      );

      expect(profile.role).toBe('user');
      expect(profile.isVerified).toBe(false);
      expect(profile.accessLevel).toBe('none');
    });

    it('should identify creator correctly', () => {
      authService.registerFirstCreator(firstCreatorId, 'First Creator', 'creator@urplatform.com');
      authService.registerRegularUser(regularUserId, 'Regular User', 'user@urplatform.com');

      expect(authService.isCreator(firstCreatorId)).toBe(true);
      expect(authService.isCreator(regularUserId)).toBe(false);
    });

    it('should identify admin correctly', () => {
      authService.registerFirstCreator(firstCreatorId, 'First Creator', 'creator@urplatform.com');
      authService.registerRegularUser(regularUserId, 'Regular User', 'user@urplatform.com');

      expect(authService.isAdmin(firstCreatorId)).toBe(true);
      expect(authService.isAdmin(regularUserId)).toBe(false);
    });
  });

  describe('Access Control', () => {
    it('should grant creator full tool access', () => {
      authService.registerFirstCreator(firstCreatorId, 'First Creator', 'creator@urplatform.com');
      const access = authService.getAccessControl(firstCreatorId);

      expect(access.canAccessVideoEditor).toBe(true);
      expect(access.canAccessAudioProducer).toBe(true);
      expect(access.canAccessContentGenerator).toBe(true);
      expect(access.canAccessDashboard).toBe(true);
      expect(access.canCollaborate).toBe(true);
      expect(access.canMonetize).toBe(true);
    });

    it('should deny regular user tool access', () => {
      authService.registerRegularUser(regularUserId, 'Regular User', 'user@urplatform.com');
      const access = authService.getAccessControl(regularUserId);

      expect(access.canAccessVideoEditor).toBe(false);
      expect(access.canAccessAudioProducer).toBe(false);
      expect(access.canAccessContentGenerator).toBe(false);
      expect(access.canAccessDashboard).toBe(false);
      expect(access.canCollaborate).toBe(false);
      expect(access.canMonetize).toBe(false);
    });
  });

  describe('Tab Visibility', () => {
    it('should show creator dashboard only to creators', () => {
      authService.registerFirstCreator(firstCreatorId, 'First Creator', 'creator@urplatform.com');
      authService.registerRegularUser(regularUserId, 'Regular User', 'user@urplatform.com');

      expect(authService.isTabVisible(firstCreatorId, 'creator-dashboard')).toBe(true);
      expect(authService.isTabVisible(regularUserId, 'creator-dashboard')).toBe(false);
    });

    it('should hide production tools from regular users', () => {
      authService.registerRegularUser(regularUserId, 'Regular User', 'user@urplatform.com');

      expect(authService.isTabVisible(regularUserId, 'video-editor')).toBe(false);
      expect(authService.isTabVisible(regularUserId, 'audio-producer')).toBe(false);
      expect(authService.isTabVisible(regularUserId, 'content-generator')).toBe(false);
    });

    it('should show all public tabs to all users', () => {
      authService.registerFirstCreator(firstCreatorId, 'First Creator', 'creator@urplatform.com');
      authService.registerRegularUser(regularUserId, 'Regular User', 'user@urplatform.com');

      const publicTabs = ['home', 'discover', 'messages', 'wallet', 'stickers', 'profile'];

      publicTabs.forEach((tab) => {
        expect(authService.isTabVisible(firstCreatorId, tab)).toBe(true);
        expect(authService.isTabVisible(regularUserId, tab)).toBe(true);
      });
    });

    it('should return correct visible tabs for creator', () => {
      authService.registerFirstCreator(firstCreatorId, 'First Creator', 'creator@urplatform.com');
      const visibleTabs = authService.getVisibleTabs(firstCreatorId);

      expect(visibleTabs).toContain('creator-dashboard');
      expect(visibleTabs).toContain('home');
      expect(visibleTabs).toContain('discover');
      expect(visibleTabs.length).toBe(7); // 6 public + 1 creator dashboard
    });

    it('should return correct visible tabs for regular user', () => {
      authService.registerRegularUser(regularUserId, 'Regular User', 'user@urplatform.com');
      const visibleTabs = authService.getVisibleTabs(regularUserId);

      expect(visibleTabs).not.toContain('creator-dashboard');
      expect(visibleTabs.length).toBe(6); // Only public tabs
    });
  });

  describe('Creator Dashboard Features', () => {
    it('should initialize dashboard for creator', () => {
      authService.registerFirstCreator(firstCreatorId, 'First Creator', 'creator@urplatform.com');
      const stats = dashboard.getDashboardStats(firstCreatorId);

      expect(stats.userId).toBe(firstCreatorId);
      expect(stats.totalProjects).toBe(0);
      expect(stats.totalEarnings).toBe(0);
    });

    it('should create video session in dashboard', () => {
      authService.registerFirstCreator(firstCreatorId, 'First Creator', 'creator@urplatform.com');
      const sessionId = dashboard.createVideoSession(firstCreatorId);

      expect(sessionId).toBeDefined();
      const sessions = dashboard.getUserSessions(firstCreatorId);
      expect(sessions.length).toBe(1);
      expect(sessions[0].type).toBe('video');
    });

    it('should create audio session in dashboard', () => {
      authService.registerFirstCreator(firstCreatorId, 'First Creator', 'creator@urplatform.com');
      const sessionId = dashboard.createAudioSession(firstCreatorId);

      expect(sessionId).toBeDefined();
      const sessions = dashboard.getUserSessions(firstCreatorId);
      expect(sessions.length).toBe(1);
      expect(sessions[0].type).toBe('audio');
    });

    it('should create content item in dashboard', () => {
      authService.registerFirstCreator(firstCreatorId, 'First Creator', 'creator@urplatform.com');
      const itemId = dashboard.createContentItem(firstCreatorId);

      expect(itemId).toBeDefined();
      const sessions = dashboard.getUserSessions(firstCreatorId);
      expect(sessions.length).toBe(1);
      expect(sessions[0].type).toBe('content');
    });

    it('should manage multiple sessions in dashboard', () => {
      authService.registerFirstCreator(firstCreatorId, 'First Creator', 'creator@urplatform.com');

      dashboard.createVideoSession(firstCreatorId);
      dashboard.createAudioSession(firstCreatorId);
      dashboard.createContentItem(firstCreatorId);

      const sessions = dashboard.getUserSessions(firstCreatorId);
      expect(sessions.length).toBe(3);
      expect(sessions.filter((s) => s.type === 'video').length).toBe(1);
      expect(sessions.filter((s) => s.type === 'audio').length).toBe(1);
      expect(sessions.filter((s) => s.type === 'content').length).toBe(1);
    });
  });

  describe('End-to-End Creator Workflow', () => {
    it('should complete full creator workflow', () => {
      // 1. Register first creator
      const creatorProfile = authService.registerFirstCreator(
        firstCreatorId,
        'First Creator',
        'creator@urplatform.com'
      );
      expect(creatorProfile.role).toBe('admin');

      // 2. Verify creator access
      expect(authService.isCreator(firstCreatorId)).toBe(true);
      expect(authService.isAdmin(firstCreatorId)).toBe(true);

      // 3. Check access control
      const access = authService.getAccessControl(firstCreatorId);
      expect(access.canAccessDashboard).toBe(true);

      // 4. Verify dashboard visibility
      expect(authService.isTabVisible(firstCreatorId, 'creator-dashboard')).toBe(true);

      // 5. Initialize dashboard
      const stats = dashboard.getDashboardStats(firstCreatorId);
      expect(stats.userId).toBe(firstCreatorId);

      // 6. Create production sessions
      const videoId = dashboard.createVideoSession(firstCreatorId);
      const audioId = dashboard.createAudioSession(firstCreatorId);
      const contentId = dashboard.createContentItem(firstCreatorId);

      expect(videoId).toBeDefined();
      expect(audioId).toBeDefined();
      expect(contentId).toBeDefined();

      // 7. Verify all sessions
      const sessions = dashboard.getUserSessions(firstCreatorId);
      expect(sessions.length).toBe(3);
    });

    it('should prevent regular user from accessing creator features', () => {
      // 1. Register regular user
      const userProfile = authService.registerRegularUser(
        regularUserId,
        'Regular User',
        'user@urplatform.com'
      );
      expect(userProfile.role).toBe('user');

      // 2. Verify no creator access
      expect(authService.isCreator(regularUserId)).toBe(false);
      expect(authService.isAdmin(regularUserId)).toBe(false);

      // 3. Check access control
      const access = authService.getAccessControl(regularUserId);
      expect(access.canAccessDashboard).toBe(false);
      expect(access.canAccessVideoEditor).toBe(false);

      // 4. Verify dashboard not visible
      expect(authService.isTabVisible(regularUserId, 'creator-dashboard')).toBe(false);

      // 5. Verify production tools not visible
      expect(authService.isTabVisible(regularUserId, 'video-editor')).toBe(false);
      expect(authService.isTabVisible(regularUserId, 'audio-producer')).toBe(false);
      expect(authService.isTabVisible(regularUserId, 'content-generator')).toBe(false);
    });

    it('should isolate creator data', () => {
      // 1. Register two creators
      authService.registerFirstCreator(firstCreatorId, 'First Creator', 'creator1@urplatform.com');
      const secondCreatorId = 'second-creator-001';
      authService.registerFirstCreator(secondCreatorId, 'Second Creator', 'creator2@urplatform.com');

      // 2. Create sessions for first creator
      dashboard.createVideoSession(firstCreatorId);
      dashboard.createAudioSession(firstCreatorId);

      // 3. Create sessions for second creator
      dashboard.createVideoSession(secondCreatorId);

      // 4. Verify data isolation
      const firstCreatorSessions = dashboard.getUserSessions(firstCreatorId);
      const secondCreatorSessions = dashboard.getUserSessions(secondCreatorId);

      expect(firstCreatorSessions.length).toBe(2);
      expect(secondCreatorSessions.length).toBe(1);
      expect(firstCreatorSessions.every((s) => s.userId === firstCreatorId)).toBe(true);
      expect(secondCreatorSessions.every((s) => s.userId === secondCreatorId)).toBe(true);
    });
  });
});
