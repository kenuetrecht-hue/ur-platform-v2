import { describe, it, expect, beforeEach } from "vitest";
import { ConsolidatedNavigationService } from "../lib/consolidated-navigation";

describe("Consolidated Navigation Service", () => {
  let navigation: ConsolidatedNavigationService;

  beforeEach(() => {
    navigation = new ConsolidatedNavigationService();
  });

  describe("Tab Management", () => {
    it("should initialize all 5 main tabs", () => {
      const tabs = navigation.getAllTabs();
      expect(tabs).toHaveLength(5);
      expect(tabs.map((t) => t.id)).toContain("home");
      expect(tabs.map((t) => t.id)).toContain("create");
      expect(tabs.map((t) => t.id)).toContain("discover");
      expect(tabs.map((t) => t.id)).toContain("messages");
      expect(tabs.map((t) => t.id)).toContain("profile");
    });

    it("should get specific tab by id", () => {
      const homeTab = navigation.getTab("home");
      expect(homeTab).not.toBeNull();
      expect(homeTab?.name).toBe("Home");
      expect(homeTab?.icon).toBe("house.fill");
    });

    it("should get sub-menu for tab", () => {
      const createSubMenu = navigation.getSubMenu("create");
      expect(createSubMenu.length).toBeGreaterThan(0);
      expect(createSubMenu[0].label).toBe("New Video");
    });

    it("should return empty array for non-existent tab sub-menu", () => {
      const subMenu = navigation.getSubMenu("non-existent");
      expect(subMenu).toEqual([]);
    });
  });

  describe("Navigation State", () => {
    it("should start at home tab", () => {
      const state = navigation.getCurrentState();
      expect(state.activeTab).toBe("home");
      expect(state.activeSubMenu).toBeUndefined();
    });

    it("should navigate to different tabs", () => {
      navigation.navigateToTab("create");
      const state = navigation.getCurrentState();
      expect(state.activeTab).toBe("create");
    });

    it("should navigate to sub-menu items", () => {
      navigation.navigateToSubMenu("create", "video");
      const state = navigation.getCurrentState();
      expect(state.activeTab).toBe("create");
      expect(state.activeSubMenu).toBe("video");
    });

    it("should maintain navigation history", () => {
      navigation.navigateToTab("create");
      navigation.navigateToSubMenu("create", "video");
      navigation.navigateToTab("discover");

      const state = navigation.getCurrentState();
      expect(state.history.length).toBeGreaterThan(1);
    });
  });

  describe("Navigation Routes", () => {
    it("should get correct route for tab", () => {
      const route = navigation.getRouteForTab("home");
      expect(route).toBe("/home");
    });

    it("should get correct route for sub-menu item", () => {
      const route = navigation.getRouteForSubMenu("create", "video");
      expect(route).toBe("/create/video");
    });

    it("should return home route for invalid tab", () => {
      const route = navigation.getRouteForTab("invalid");
      expect(route).toBe("/home");
    });
  });

  describe("Active State Checking", () => {
    it("should check if tab is active", () => {
      navigation.navigateToTab("create");
      expect(navigation.isTabActive("create")).toBe(true);
      expect(navigation.isTabActive("home")).toBe(false);
    });

    it("should check if sub-menu item is active", () => {
      navigation.navigateToSubMenu("create", "video");
      expect(navigation.isSubMenuActive("create", "video")).toBe(true);
      expect(navigation.isSubMenuActive("create", "audio")).toBe(false);
    });
  });

  describe("Navigation History", () => {
    it("should go back in navigation history", () => {
      navigation.navigateToTab("create");
      navigation.navigateToTab("discover");
      
      // Before going back, should be at discover
      expect(navigation.isTabActive("discover")).toBe(true);
      
      navigation.goBack();

      const state = navigation.getCurrentState();
      // After going back, should be at create
      expect(state.activeTab).toBe("create");
    });

    it("should not go back beyond home", () => {
      const initialState = navigation.getCurrentState();
      navigation.goBack();

      const state = navigation.getCurrentState();
      expect(state.activeTab).toBe(initialState.activeTab);
    });

    it("should get breadcrumbs", () => {
      navigation.navigateToTab("create");
      navigation.navigateToSubMenu("create", "video");

      const breadcrumbs = navigation.getBreadcrumbs();
      expect(breadcrumbs.length).toBeGreaterThan(0);
    });
  });

  describe("Badge Management", () => {
    it("should set badge count for tab", () => {
      navigation.setBadgeCount("messages", 5);
      const tab = navigation.getTab("messages");
      expect(tab?.badge).toBe(5);
    });

    it("should get tabs with badges", () => {
      navigation.setBadgeCount("messages", 3);
      navigation.setBadgeCount("profile", 1);

      const badged = navigation.getTabsWithBadges();
      expect(badged.length).toBeGreaterThanOrEqual(2);
    });

    it("should clear badge when set to 0", () => {
      navigation.setBadgeCount("messages", 5);
      navigation.setBadgeCount("messages", 0);

      const tab = navigation.getTab("messages");
      expect(tab?.badge).toBeUndefined();
    });
  });

  describe("Navigation Structure", () => {
    it("should get complete navigation structure", () => {
      const structure = navigation.getNavigationStructure();
      expect(Object.keys(structure)).toContain("home");
      expect(Object.keys(structure)).toContain("create");
      expect(Object.keys(structure)).toContain("discover");
      expect(Object.keys(structure)).toContain("messages");
      expect(Object.keys(structure)).toContain("profile");
    });

    it("should have sub-menus in structure", () => {
      const structure = navigation.getNavigationStructure();
      expect(structure.create.subMenu).toBeDefined();
      expect(structure.create.subMenu.length).toBeGreaterThan(0);
    });
  });

  describe("Reset Navigation", () => {
    it("should reset navigation to home", () => {
      navigation.navigateToTab("create");
      navigation.navigateToTab("discover");
      navigation.resetNavigation();

      const state = navigation.getCurrentState();
      expect(state.activeTab).toBe("home");
      expect(state.history).toEqual(["home"]);
    });
  });

  describe("Quick Access", () => {
    it("should get quick access items", () => {
      const quickAccess = navigation.getQuickAccessItems();
      expect(quickAccess.length).toBeGreaterThan(0);
      expect(quickAccess[0].label).toBe("New Video");
    });
  });

  describe("Search Navigation", () => {
    it("should search navigation items", () => {
      const results = navigation.searchNavigation("video");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].label).toContain("Video");
    });

    it("should find items by partial match", () => {
      const results = navigation.searchNavigation("new");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should return empty for no matches", () => {
      const results = navigation.searchNavigation("xyz123");
      expect(results).toHaveLength(0);
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete user navigation flow", () => {
      // User starts at home
      expect(navigation.isTabActive("home")).toBe(true);

      // User navigates to create
      navigation.navigateToTab("create");
      expect(navigation.isTabActive("create")).toBe(true);

      // User selects video creation
      navigation.navigateToSubMenu("create", "video");
      expect(navigation.isSubMenuActive("create", "video")).toBe(true);

      // User navigates to discover
      navigation.navigateToTab("discover");
      expect(navigation.isTabActive("discover")).toBe(true);

      // User goes back to create
      navigation.goBack();
      expect(navigation.isTabActive("create")).toBe(true);
    });

    it("should handle multiple sub-menu navigations", () => {
      navigation.navigateToSubMenu("create", "video");
      expect(navigation.isSubMenuActive("create", "video")).toBe(true);

      navigation.navigateToSubMenu("create", "audio");
      expect(navigation.isSubMenuActive("create", "audio")).toBe(true);
      expect(navigation.isSubMenuActive("create", "video")).toBe(false);
    });

    it("should maintain state across multiple operations", () => {
      navigation.setBadgeCount("messages", 5);
      navigation.navigateToTab("create");
      navigation.navigateToSubMenu("create", "video");

      const state = navigation.getCurrentState();
      const tab = navigation.getTab("messages");

      expect(state.activeTab).toBe("create");
      expect(state.activeSubMenu).toBe("video");
      expect(tab?.badge).toBe(5);
    });
  });

  describe("All Tabs Accessibility", () => {
    it("should have all main tabs accessible", () => {
      const tabs = ["home", "create", "discover", "messages", "profile"];

      for (const tabId of tabs) {
        navigation.navigateToTab(tabId);
        expect(navigation.isTabActive(tabId)).toBe(true);
      }
    });

    it("should have all sub-menu items accessible", () => {
      const createTab = navigation.getTab("create");
      expect(createTab?.subMenu).toBeDefined();

      for (const subItem of createTab?.subMenu || []) {
        navigation.navigateToSubMenu("create", subItem.id);
        expect(navigation.isSubMenuActive("create", subItem.id)).toBe(true);
      }
    });
  });
});
