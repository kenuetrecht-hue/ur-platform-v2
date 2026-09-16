import type { HubTabItem } from "@/components/hub-tab-bar";
import type { Href } from "expo-router";

export const HOME_HUB_TABS: HubTabItem[] = [
  { id: "start", label: "Start", emoji: "🏠" },
  { id: "daily", label: "Why back", emoji: "☀️" },
  { id: "board", label: "Free board", emoji: "🆓" },
  { id: "studios", label: "Studios", emoji: "🎬" },
  { id: "doors", label: "Doors", emoji: "🚪" },
];

export const HOME_HUB_TAB_ROWS = [
  HOME_HUB_TABS.filter((tab) => tab.id === "start" || tab.id === "daily" || tab.id === "board"),
  HOME_HUB_TABS.filter((tab) => tab.id === "studios" || tab.id === "doors"),
];

export type HomeHubTabId = "start" | "daily" | "board" | "studios" | "doors";

export function isHomeHubTabId(value: string): value is HomeHubTabId {
  return HOME_HUB_TABS.some((tab) => tab.id === value);
}

export type HomeDoor = {
  id: string;
  label: string;
  emoji: string;
  href: Href;
};

export const HOME_STUDIO_DOORS: HomeDoor[] = [
  { id: "world", label: "UR World", emoji: "🏙️", href: "/world" },
  { id: "music", label: "Music Studio", emoji: "🎚️", href: "/music-studio" },
  { id: "cartoon", label: "Cartoon Studio", emoji: "🎬", href: "/cartoon-studio" },
  { id: "lab3d", label: "3D Workspace", emoji: "⬡", href: "/3d-workspace" },
  { id: "playroom", label: "AI Playroom", emoji: "🎮", href: "/playroom" },
];

export const HOME_MAIN_DOORS: HomeDoor[] = [
  { id: "ais", label: "AIs", emoji: "🤖", href: "/ais" },
  { id: "social", label: "Social", emoji: "🌐", href: "/(tabs)/messages" },
  { id: "create", label: "Create", emoji: "✏️", href: "/(tabs)/create" },
  { id: "discover", label: "Discover", emoji: "🧭", href: "/(tabs)/discover" },
  { id: "shop", label: "Shop", emoji: "🛍️", href: "/shop" },
  { id: "emanual", label: "E-manual", emoji: "📘", href: "/e-manual" },
  { id: "contentmate", label: "ContentMate", emoji: "✨", href: { pathname: "/ais", params: { group: "platform", ai: "contentmate" } } },
  { id: "techbuilder", label: "TechBuilder", emoji: "💻", href: { pathname: "/ais", params: { group: "platform", ai: "ai-coder-001", surface: "build" } } },
  { id: "author", label: "Author Muse", emoji: "📚", href: { pathname: "/ais", params: { group: "creative", ai: "ai-author-001" } } },
  { id: "songwriter", label: "Songwriter", emoji: "✍️", href: { pathname: "/ais", params: { group: "creative", ai: "ai-songwriter-001" } } },
  { id: "musician", label: "Musician", emoji: "🎵", href: { pathname: "/ais", params: { group: "creative", ai: "ai-musician-001" } } },
  { id: "poet", label: "Poet", emoji: "🪶", href: { pathname: "/ais", params: { group: "creative", ai: "ai-poet-001" } } },
  { id: "logo", label: "Logo & Brand", emoji: "🎨", href: { pathname: "/ais", params: { group: "creative", ai: "ai-logo-brand-001" } } },
  { id: "gameforge", label: "GameForge", emoji: "🕹️", href: { pathname: "/ais", params: { group: "tech", ai: "ai-game-dev-001", surface: "build" } } },
  { id: "legal", label: "Legal Masters", emoji: "⚖️", href: { pathname: "/ais", params: { group: "legalMasters", ai: "ai-attorney-criminal-001" } } },
  { id: "credit", label: "Credit Attorney", emoji: "📑", href: { pathname: "/ais", params: { group: "legalMasters", ai: "ai-attorney-credit-001" } } },
  { id: "merch", label: "Merch 3D Lab", emoji: "👕", href: { pathname: "/3d-workspace", params: { project: "merchandise" } } },
  { id: "blueprint", label: "Blueprint Reader", emoji: "📐", href: { pathname: "/(tabs)/ais", params: { ai: "ai-blueprint-reader-001" } } },
  { id: "cnc", label: "CNC & Mill", emoji: "🛠️", href: { pathname: "/(tabs)/ais", params: { ai: "ai-cnc-master-001" } } },
  { id: "culinary", label: "Culinary Arts", emoji: "👨‍🍳", href: { pathname: "/(tabs)/ais", params: { ai: "ai-culinary-001" } } },
  { id: "creator", label: "Creator Dashboard", emoji: "🎬", href: "/creator-dashboard" },
  { id: "jobsite", label: "Jobsite", emoji: "🏗️", href: "/jobsite" },
  { id: "affiliate", label: "Affiliate", emoji: "🔗", href: "/affiliate-dashboard" },
];

export const CREATE_HUB_TABS: HubTabItem[] = [
  { id: "make", label: "Make", emoji: "✏️" },
  { id: "talk", label: "Talk", emoji: "💬" },
];

export const DISCOVER_HUB_TABS: HubTabItem[] = [
  { id: "board", label: "Board", emoji: "🔍" },
  { id: "show", label: "Show", emoji: "🎪" },
  { id: "go", label: "Go", emoji: "🧭" },
];

export const PROFILE_HUB_TABS: HubTabItem[] = [
  { id: "you", label: "You", emoji: "👤" },
  { id: "rewards", label: "Rewards", emoji: "🎁" },
  { id: "more", label: "More", emoji: "⋯" },
];
