import { useState } from "react";
import { TabPageScroll } from "@/components/tab-page-scroll";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { consolidatedNavigation } from "@/lib/consolidated-navigation";
import { FairShowFeedPanel } from "@/components/fair-show-feed-panel";
import { AiFreeBoardPanel } from "@/components/ai-free-board-panel";
import { PlatformSearchPanel } from "@/components/platform-search-panel";
import { HubTabBar } from "@/components/hub-tab-bar";
import { HubDoorGrid, HubDoorTile } from "@/components/hub-door-tile";
import { DISCOVER_HUB_TABS } from "@/lib/home-hub";

const DISCOVER_ICONS: Record<string, string> = {
  creators: "👥",
  "trending-creators": "🔥",
  categories: "🏷️",
  marketplace: "🛍️",
  search: "🔍",
  "trending-content": "📈",
  "ai-board": "🤖",
  affiliates: "🔗",
};

export default function DiscoverScreen() {
  const router = useRouter();
  const [hubTab, setHubTab] = useState("board");
  const discoverTab = consolidatedNavigation.getTab("discover");
  const subMenu = discoverTab?.subMenu ?? [];

  return (
    <ScreenContainer className="bg-background">
      <TabScreenHeader compact icon="🧭" title="Discover" />
      <HubTabBar tabs={DISCOVER_HUB_TABS} activeId={hubTab} onSelect={setHubTab} />
      <TabPageScroll>
        {hubTab === "board" ? (
          <>
            <PlatformSearchPanel compact />
            <AiFreeBoardPanel compact />
          </>
        ) : null}

        {hubTab === "show" ? <FairShowFeedPanel /> : null}

        {hubTab === "go" ? (
          <HubDoorGrid>
            <HubDoorTile emoji="🤖" label="AIs" onPress={() => router.push("/ais")} />
            <HubDoorTile emoji="🏙️" label="UR World" onPress={() => router.push("/world")} />
            {subMenu.map((item) => (
              <HubDoorTile
                key={item.id}
                emoji={DISCOVER_ICONS[item.id] ?? "✨"}
                label={item.label}
                onPress={() => {
                  if (item.id === "marketplace" || item.id === "affiliates") {
                    router.push("/shop");
                  } else if (item.id === "search") {
                    router.push("/discover/search");
                  } else if (item.id === "ai-board") {
                    router.push("/discover/ai-board");
                  } else if (
                    item.id === "trending-content" ||
                    item.id === "trending-creators" ||
                    item.id === "categories" ||
                    item.id === "creators"
                  ) {
                    router.push("/discover/fair-show");
                  } else {
                    router.push("/ais");
                  }
                }}
              />
            ))}
          </HubDoorGrid>
        ) : null}
      </TabPageScroll>
    </ScreenContainer>
  );
}
