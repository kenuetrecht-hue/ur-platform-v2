/**
 * Creator Authentication & Role Management
 * Handles creator-only access control and role-based permissions
 */

export type UserRole = 'user' | 'creator' | 'admin';

export interface CreatorProfile {
  creatorId: string;
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  joinedAt: Date;
  permissions: string[];
  accessLevel: 'basic' | 'premium' | 'admin';
}

export interface AuthToken {
  token: string;
  userId: string;
  role: UserRole;
  expiresAt: Date;
}

export interface AccessControl {
  canAccessVideoEditor: boolean;
  canAccessAudioProducer: boolean;
  canAccessContentGenerator: boolean;
  canAccessDashboard: boolean;
  canCollaborate: boolean;
  canMonetize: boolean;
}

export class CreatorAuthService {
  private users: Map<string, CreatorProfile> = new Map();
  private tokens: Map<string, AuthToken> = new Map();
  private currentUser: CreatorProfile | null = null;
  private currentToken: AuthToken | null = null;

  /**
   * Register a new creator
   */
  registerCreator(
    userId: string,
    username: string,
    email: string,
    accessLevel: 'basic' | 'premium' | 'admin' = 'basic'
  ): CreatorProfile {
    const creatorId = `creator-${Date.now()}`;
    const profile: CreatorProfile = {
      creatorId,
      userId,
      username,
      email,
      role: 'creator',
      isVerified: accessLevel === 'admin',
      joinedAt: new Date(),
      permissions: this.getPermissionsForLevel(accessLevel),
      accessLevel,
    };

    this.users.set(userId, profile);
    return profile;
  }

  /**
   * Register first creator with admin access
   */
  registerFirstCreator(userId: string, username: string, email: string): CreatorProfile {
    const creatorId = `creator-first-${Date.now()}`;
    const profile: CreatorProfile = {
      creatorId,
      userId,
      username,
      email,
      role: 'admin',
      isVerified: true,
      joinedAt: new Date(),
      permissions: this.getPermissionsForLevel('admin'),
      accessLevel: 'admin',
    };

    this.users.set(userId, profile);
    return profile;
  }

  /**
   * Login creator
   */
  login(userId: string, password: string): AuthToken | null {
    const profile = this.users.get(userId);
    if (!profile || profile.role === 'user') {
      return null;
    }

    const token: AuthToken = {
      token: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      role: profile.role,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    this.tokens.set(token.token, token);
    this.currentUser = profile;
    this.currentToken = token;

    return token;
  }

  /**
   * Logout creator
   */
  logout(token: string): boolean {
    const authToken = this.tokens.get(token);
    if (!authToken) return false;

    this.tokens.delete(token);
    this.currentUser = null;
    this.currentToken = null;

    return true;
  }

  /**
   * Verify token
   */
  verifyToken(token: string): boolean {
    const authToken = this.tokens.get(token);
    if (!authToken) return false;

    if (new Date() > authToken.expiresAt) {
      this.tokens.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Get current user
   */
  getCurrentUser(): CreatorProfile | null {
    return this.currentUser;
  }

  /**
   * Get current token
   */
  getCurrentToken(): AuthToken | null {
    return this.currentToken;
  }

  /**
   * Check if user is creator
   */
  isCreator(userId: string): boolean {
    const profile = this.users.get(userId);
    return profile ? profile.role === 'creator' || profile.role === 'admin' : false;
  }

  /**
   * Check if user is admin
   */
  isAdmin(userId: string): boolean {
    const profile = this.users.get(userId);
    return profile ? profile.role === 'admin' : false;
  }

  /**
   * Get access control for user
   */
  getAccessControl(userId: string): AccessControl {
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

    const isAdmin = profile.role === 'admin';
    const isPremium = profile.accessLevel === 'premium' || isAdmin;

    return {
      canAccessVideoEditor: true,
      canAccessAudioProducer: true,
      canAccessContentGenerator: true,
      canAccessDashboard: true,
      canCollaborate: isPremium,
      canMonetize: isAdmin,
    };
  }

  /**
   * Get permissions for access level
   */
  private getPermissionsForLevel(level: 'basic' | 'premium' | 'admin'): string[] {
    const basePermissions = [
      'view_dashboard',
      'create_projects',
      'edit_own_projects',
      'export_content',
    ];

    const premiumPermissions = [
      ...basePermissions,
      'collaborate',
      'share_projects',
      'advanced_effects',
      'priority_support',
    ];

    const adminPermissions = [
      ...premiumPermissions,
      'monetize_content',
      'manage_team',
      'access_analytics',
      'manage_users',
      'system_admin',
    ];

    switch (level) {
      case 'basic':
        return basePermissions;
      case 'premium':
        return premiumPermissions;
      case 'admin':
        return adminPermissions;
    }
  }

  /**
   * Check permission
   */
  hasPermission(userId: string, permission: string): boolean {
    const profile = this.users.get(userId);
    return profile ? profile.permissions.includes(permission) : false;
  }

  /**
   * Upgrade creator
   */
  upgradeCreator(userId: string, newLevel: 'basic' | 'premium' | 'admin'): CreatorProfile | null {
    const profile = this.users.get(userId);
    if (!profile || profile.role === 'user') return null;

    profile.accessLevel = newLevel;
    profile.permissions = this.getPermissionsForLevel(newLevel);

    if (newLevel === 'admin') {
      profile.role = 'admin';
      profile.isVerified = true;
    }

    return profile;
  }

  /**
   * Get creator profile
   */
  getCreatorProfile(userId: string): CreatorProfile | null {
    return this.users.get(userId) || null;
  }

  /**
   * Get all creators
   */
  getAllCreators(): CreatorProfile[] {
    return Array.from(this.users.values()).filter((p) => p.role !== 'user');
  }

  /**
   * Verify creator email
   */
  verifyCreatorEmail(userId: string): boolean {
    const profile = this.users.get(userId);
    if (!profile) return false;

    profile.isVerified = true;
    return true;
  }

  /**
   * Check if creator can access tool
   */
  canAccessTool(userId: string, tool: 'video' | 'audio' | 'content'): boolean {
    const access = this.getAccessControl(userId);

    switch (tool) {
      case 'video':
        return access.canAccessVideoEditor;
      case 'audio':
        return access.canAccessAudioProducer;
      case 'content':
        return access.canAccessContentGenerator;
    }
  }

  /**
   * Check if creator can access dashboard
   */
  canAccessDashboard(userId: string): boolean {
    const access = this.getAccessControl(userId);
    return access.canAccessDashboard;
  }

  /**
   * Get dashboard visibility
   */
  shouldShowDashboard(userId: string): boolean {
    return this.isCreator(userId) && this.canAccessDashboard(userId);
  }

  /**
   * Get visible tabs for user
   */
  getVisibleTabs(userId: string): string[] {
    const isCreator = this.isCreator(userId);

    if (!isCreator) {
      // Regular users see: Home, Discover, Messages, Wallet, Stickers, Profile
      return ['home', 'discover', 'messages', 'wallet', 'stickers', 'profile'];
    }

    // Creators see: Home, Discover, Messages, Wallet, Stickers, Profile, Creator Dashboard
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

  /**
   * Check if tab is visible
   */
  isTabVisible(userId: string, tabName: string): boolean {
    const visibleTabs = this.getVisibleTabs(userId);
    return visibleTabs.includes(tabName);
  }
}

export const creatorAuthService = new CreatorAuthService();
