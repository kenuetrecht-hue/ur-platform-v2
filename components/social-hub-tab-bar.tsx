import { HubTabBar, type HubTabItem } from "@/components/hub-tab-bar";

export type SocialHubTab = "feed" | "friends" | "mail" | "creators" | "activity";

const TABS: HubTabItem[] = [
  { id: "feed", label: "Feed", icon: "sparkles" },
  { id: "friends", label: "Friends", icon: "person.2.fill" },
  { id: "mail", label: "Mail", icon: "envelope.fill" },
  { id: "creators", label: "Creators", icon: "star.fill" },
  { id: "activity", label: "Activity", icon: "chart.bar.fill" },
];

type Props = {
  active: SocialHubTab;
  onChange: (tab: SocialHubTab) => void;
  messageBadge?: number;
  pendingFriends?: number;
};

export function SocialHubTabBar({
  active,
  onChange,
  messageBadge = 0,
  pendingFriends = 0,
}: Props) {
  return (
    <HubTabBar
      tabs={TABS}
      activeId={active}
      onSelect={(id) => onChange(id as SocialHubTab)}
      badgeFor={(id) => {
        if (id === "mail") return messageBadge;
        if (id === "friends") return pendingFriends;
        return 0;
      }}
    />
  );
}
