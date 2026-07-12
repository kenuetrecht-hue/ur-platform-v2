/**
 * Consolidated Navigation Service
 * Manages 4-5 main tabs with intelligent sub-menus
 */

export interface NavigationTab {
  id: string;
  name: string;
  icon: string;
  route: string;
  badge?: number;
  subMenu?: NavigationMenuItem[];
}

export interface NavigationMenuItem {
  id: string;
  label: string;
  icon?: string;
  route: string;
  action?: () => void;
}

export interface NavigationState {
  activeTab: string;
  activeSubMenu?: string;
  history: string[];
}

/**
 * Consolidated Navigation Service
 */
export class ConsolidatedNavigationService {
  private tabs: Map<string, NavigationTab> = new Map();
  private navigationState: NavigationState = {
    activeTab: "home",
    history: ["home"],
  };

  constructor() {
    this.initializeTabs();
  }

  /**
   * Initialize main tabs and sub-menus
   */
  private initializeTabs(): void {
    // Home Tab
    this.tabs.set("home", {
      id: "home",
      name: "Home",
      icon: "house.fill",
      route: "/home",
      subMenu: [
        { id: "trending", label: "Trending Now", route: "/home/trending" },
        { id: "following", label: "Following Feed", route: "/home/following" },
        { id: "recommended", label: "Recommended", route: "/home/recommended" },
        { id: "categories", label: "Categories", route: "/home/categories" },
      ],
    });

    // Create Tab
    this.tabs.set("create", {
      id: "create",
      name: "Create",
      icon: "pencil.circle.fill",
      route: "/create",
      subMenu: [
        { id: "video", label: "New Video", icon: "film", route: "/create/video" },
        { id: "audio", label: "New Audio", icon: "waveform.circle", route: "/create/audio" },
        { id: "image", label: "New Image", icon: "photo", route: "/create/image" },
        { id: "text", label: "New Text", icon: "doc.text", route: "/create/text" },
        { id: "ai", label: "AI Assistant", icon: "sparkles", route: "/create/ai" },
        { id: "templates", label: "Templates", icon: "square.grid.2x2", route: "/create/templates" },
        { id: "calendar", label: "Calendar", icon: "calendar", route: "/create/calendar" },
        { id: "drafts", label: "Drafts", icon: "doc", route: "/create/drafts" },
      ],
    });

    // Discover Tab
    this.tabs.set("discover", {
      id: "discover",
      name: "Discover",
      icon: "compass.fill",
      route: "/discover",
      subMenu: [
        { id: "creators", label: "All Creators", route: "/discover/creators" },
        { id: "trending-creators", label: "Trending Creators", route: "/discover/trending-creators" },
        { id: "categories", label: "By Category", route: "/discover/categories" },
        { id: "marketplace", label: "Marketplace", route: "/discover/marketplace" },
        { id: "search", label: "Search", route: "/discover/search" },
        { id: "trending-content", label: "Trending Content", route: "/discover/trending-content" },
        { id: "affiliates", label: "Affiliate Products", route: "/discover/affiliates" },
      ],
    });

    // Messages Tab
    this.tabs.set("messages", {
      id: "messages",
      name: "Messages",
      icon: "bubble.right.fill",
      route: "/messages",
      badge: 0,
      subMenu: [
        { id: "direct", label: "Direct Messages", route: "/messages/direct" },
        { id: "notifications", label: "Notifications", route: "/messages/notifications" },
        { id: "collaboration", label: "Collaboration Requests", route: "/messages/collaboration" },
        { id: "alerts", label: "System Alerts", route: "/messages/alerts" },
        { id: "announcements", label: "Announcements", route: "/messages/announcements" },
      ],
    });

    // Profile Tab
    this.tabs.set("profile", {
      id: "profile",
      name: "Profile",
      icon: "person.fill",
      route: "/profile",
      subMenu: [
        { id: "dashboard", label: "Dashboard", route: "/profile/dashboard" },
        { id: "analytics", label: "Analytics", route: "/profile/analytics" },
        { id: "earnings", label: "Earnings", route: "/profile/earnings" },
        { id: "settings", label: "Settings", route: "/profile/settings" },
        { id: "account", label: "Account", route: "/profile/account" },
        { id: "admin", label: "Admin Panel", route: "/profile/admin" },
        { id: "help", label: "Help & Support", route: "/profile/help" },
      ],
    });
  }

  /**
   * Get all main tabs
   */
  getAllTabs(): NavigationTab[] {
    return Array.from(this.tabs.values());
  }

  /**
   * Get specific tab
   */
  getTab(tabId: string): NavigationTab | null {
    return this.tabs.get(tabId) || null;
  }

  /**
   * Get sub-menu for tab
   */
  getSubMenu(tabId: string): NavigationMenuItem[] {
    const tab = this.tabs.get(tabId);
    return tab?.subMenu || [];
  }

  /**
   * Navigate to tab
   */
  navigateToTab(tabId: string): NavigationState {
    const tab = this.tabs.get(tabId);
    if (!tab) return this.navigationState;

    this.navigationState.activeTab = tabId;
    this.navigationState.activeSubMenu = undefined;
    this.navigationState.history.push(tab.route);

    return this.navigationState;
  }

  /**
   * Navigate to sub-menu item
   */
  navigateToSubMenu(tabId: string, subMenuId: string): NavigationState {
    const tab = this.tabs.get(tabId);
    if (!tab || !tab.subMenu) return this.navigationState;

    const subMenuItem = tab.subMenu.find((item) => item.id === subMenuId);
    if (!subMenuItem) return this.navigationState;

    this.navigationState.activeTab = tabId;
    this.navigationState.activeSubMenu = subMenuId;
    this.navigationState.history.push(subMenuItem.route);

    return this.navigationState;
  }

  /**
   * Get current navigation state
   */
  getCurrentState(): NavigationState {
    return this.navigationState;
  }

  /**
   * Go back in navigation history
   */
  goBack(): NavigationState {
    if (this.navigationState.history.length > 1) {
      this.navigationState.history.pop();
      const previousRoute = this.navigationState.history[this.navigationState.history.length - 1];

      // Find which tab this route belongs to
      for (const [tabId, tab] of this.tabs) {
        if (tab.route === previousRoute) {
          this.navigationState.activeTab = tabId;
          this.navigationState.activeSubMenu = undefined;
          return this.navigationState;
        }

        // Check sub-menu
        if (tab.subMenu) {
          const subItem = tab.subMenu.find((item) => item.route === previousRoute);
          if (subItem) {
            this.navigationState.activeTab = tabId;
            this.navigationState.activeSubMenu = subItem.id;
            return this.navigationState;
          }
        }
      }
    }

    return this.navigationState;
  }

  /**
   * Get breadcrumb navigation
   */
  getBreadcrumbs(): string[] {
    const breadcrumbs: string[] = [];

    for (const route of this.navigationState.history) {
      // Find tab or sub-menu item for this route
      for (const [tabId, tab] of this.tabs) {
        if (tab.route === route) {
          breadcrumbs.push(tab.name);
          break;
        }

        if (tab.subMenu) {
          const subItem = tab.subMenu.find((item) => item.route === route);
          if (subItem) {
            breadcrumbs.push(`${tab.name} > ${subItem.label}`);
            break;
          }
        }
      }
    }

    return breadcrumbs;
  }

  /**
   * Update badge count for tab
   */
  setBadgeCount(tabId: string, count: number): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.badge = count > 0 ? count : undefined;
    }
  }

  /**
   * Get tab with badge
   */
  getTabsWithBadges(): { tabId: string; count: number }[] {
    const badged: { tabId: string; count: number }[] = [];

    for (const [tabId, tab] of this.tabs) {
      if (tab.badge && tab.badge > 0) {
        badged.push({ tabId, count: tab.badge });
      }
    }

    return badged;
  }

  /**
   * Get route for tab
   */
  getRouteForTab(tabId: string): string {
    const tab = this.tabs.get(tabId);
    return tab?.route || "/home";
  }

  /**
   * Get route for sub-menu item
   */
  getRouteForSubMenu(tabId: string, subMenuId: string): string {
    const tab = this.tabs.get(tabId);
    if (!tab || !tab.subMenu) return this.getRouteForTab(tabId);

    const subItem = tab.subMenu.find((item) => item.id === subMenuId);
    return subItem?.route || this.getRouteForTab(tabId);
  }

  /**
   * Check if tab is active
   */
  isTabActive(tabId: string): boolean {
    return this.navigationState.activeTab === tabId;
  }

  /**
   * Check if sub-menu item is active
   */
  isSubMenuActive(tabId: string, subMenuId: string): boolean {
    return this.navigationState.activeTab === tabId && this.navigationState.activeSubMenu === subMenuId;
  }

  /**
   * Get navigation structure as JSON
   */
  getNavigationStructure(): Record<string, any> {
    const structure: Record<string, any> = {};

    for (const [tabId, tab] of this.tabs) {
      structure[tabId] = {
        name: tab.name,
        icon: tab.icon,
        route: tab.route,
        subMenu: tab.subMenu?.map((item) => ({
          id: item.id,
          label: item.label,
          route: item.route,
        })),
      };
    }

    return structure;
  }

  /**
   * Reset navigation to home
   */
  resetNavigation(): void {
    this.navigationState = {
      activeTab: "home",
      history: ["home"],
    };
  }

  /**
   * Get quick access items (most frequently used)
   */
  getQuickAccessItems(): NavigationMenuItem[] {
    const quickAccess: NavigationMenuItem[] = [];

    // Add frequently used items
    const createTab = this.tabs.get("create");
    if (createTab?.subMenu) {
      quickAccess.push(createTab.subMenu[0]); // New Video
      quickAccess.push(createTab.subMenu[1]); // New Audio
      quickAccess.push(createTab.subMenu[4]); // AI Assistant
    }

    return quickAccess;
  }

  /**
   * Search navigation items
   */
  searchNavigation(query: string): NavigationMenuItem[] {
    const results: NavigationMenuItem[] = [];
    const lowerQuery = query.toLowerCase();

    for (const tab of this.tabs.values()) {
      if (tab.subMenu) {
        for (const item of tab.subMenu) {
          if (item.label.toLowerCase().includes(lowerQuery)) {
            results.push(item);
          }
        }
      }
    }

    return results;
  }
}

// Export singleton instance
export const consolidatedNavigation = new ConsolidatedNavigationService();
