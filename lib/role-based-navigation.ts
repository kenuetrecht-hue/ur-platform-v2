/**
 * Role-Based Navigation Service
 * Manages tab visibility and navigation based on user roles
 */

export type UserRole = 'admin' | 'content_creator' | 'regular_user' | 'ai_creator';

export interface NavigationTab {
  id: string;
  name: string;
  icon: string;
  route: string;
  requiredRoles: UserRole[];
  badge?: number;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  isContentCreator: boolean;
  isAdmin: boolean;
  isAICreator: boolean;
}

export class RoleBasedNavigationService {
  private allTabs: NavigationTab[] = [
    {
      id: 'home',
      name: 'Home',
      icon: 'house.fill',
      route: '/home',
      requiredRoles: ['admin', 'content_creator', 'regular_user', 'ai_creator'],
    },
    {
      id: 'create',
      name: 'Create',
      icon: 'pencil.circle.fill',
      route: '/create',
      requiredRoles: ['admin', 'content_creator', 'ai_creator'],
    },
    {
      id: 'discover',
      name: 'Discover',
      icon: 'compass.fill',
      route: '/discover',
      requiredRoles: ['admin', 'content_creator', 'regular_user', 'ai_creator'],
    },
    {
      id: 'messages',
      name: 'Messages',
      icon: 'message.fill',
      route: '/messages',
      requiredRoles: ['admin', 'content_creator', 'regular_user', 'ai_creator'],
      badge: 0,
    },
    {
      id: 'profile',
      name: 'Profile',
      icon: 'person.fill',
      route: '/profile',
      requiredRoles: ['admin', 'content_creator', 'regular_user', 'ai_creator'],
    },
  ];

  private userRole: UserRole = 'regular_user';
  private userProfile: UserProfile | null = null;

  /**
   * Set the current user profile
   */
  setUserProfile(profile: UserProfile): void {
    this.userProfile = profile;
    this.userRole = profile.role;
  }

  /**
   * Get the current user role
   */
  getUserRole(): UserRole {
    return this.userRole;
  }

  /**
   * Get the current user profile
   */
  getUserProfile(): UserProfile | null {
    return this.userProfile;
  }

  /**
   * Get visible tabs based on user role
   */
  getVisibleTabs(): NavigationTab[] {
    return this.allTabs.filter((tab) =>
      tab.requiredRoles.includes(this.userRole)
    );
  }

  /**
   * Check if a specific tab is visible for the current user
   */
  isTabVisible(tabId: string): boolean {
    const tab = this.allTabs.find((t) => t.id === tabId);
    if (!tab) return false;
    return tab.requiredRoles.includes(this.userRole);
  }

  /**
   * Get tabs for a specific role
   */
  getTabsForRole(role: UserRole): NavigationTab[] {
    return this.allTabs.filter((tab) => tab.requiredRoles.includes(role));
  }

  /**
   * Check if user is a content creator
   */
  isContentCreator(): boolean {
    return this.userProfile?.isContentCreator ?? false;
  }

  /**
   * Check if user is an admin
   */
  isAdmin(): boolean {
    return this.userProfile?.isAdmin ?? false;
  }

  /**
   * Check if user is an AI creator
   */
  isAICreator(): boolean {
    return this.userProfile?.isAICreator ?? false;
  }

  /**
   * Get creator-specific tabs (only for content creators and AI creators)
   */
  getCreatorTabs(): NavigationTab[] {
    if (!this.isContentCreator() && !this.isAICreator()) {
      return [];
    }
    return this.allTabs.filter((tab) =>
      ['create', 'analytics', 'earnings'].includes(tab.id)
    );
  }

  /**
   * Get regular user tabs (for non-creators)
   */
  getRegularUserTabs(): NavigationTab[] {
    if (this.isContentCreator() || this.isAICreator()) {
      return [];
    }
    return this.allTabs.filter((tab) =>
      ['home', 'discover', 'messages', 'profile'].includes(tab.id)
    );
  }

  /**
   * Update tab badge count
   */
  updateTabBadge(tabId: string, count: number): void {
    const tab = this.allTabs.find((t) => t.id === tabId);
    if (tab) {
      tab.badge = count > 0 ? count : undefined;
    }
  }

  /**
   * Get all tabs (admin only)
   */
  getAllTabs(): NavigationTab[] {
    if (!this.isAdmin()) {
      return this.getVisibleTabs();
    }
    return this.allTabs;
  }

  /**
   * Promote user to content creator
   */
  promoteToContentCreator(): void {
    if (this.userProfile) {
      this.userProfile.isContentCreator = true;
      this.userProfile.role = 'content_creator';
      this.userRole = 'content_creator';
    }
  }

  /**
   * Demote user from content creator
   */
  demoteFromContentCreator(): void {
    if (this.userProfile) {
      this.userProfile.isContentCreator = false;
      this.userProfile.role = 'regular_user';
      this.userRole = 'regular_user';
    }
  }

  /**
   * Get navigation summary for current user
   */
  getNavigationSummary(): {
    visibleTabCount: number;
    isCreator: boolean;
    isAdmin: boolean;
    tabs: NavigationTab[];
  } {
    return {
      visibleTabCount: this.getVisibleTabs().length,
      isCreator: this.isContentCreator(),
      isAdmin: this.isAdmin(),
      tabs: this.getVisibleTabs(),
    };
  }
}

export const roleBasedNavigationService = new RoleBasedNavigationService();
