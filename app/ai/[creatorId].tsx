import { Redirect, useLocalSearchParams } from "expo-router";
import { isOwnerOpsAiId } from "@/lib/owner-platform-ops-catalog";

/** Deep link — open the specialist on the main AIs tab (owner ops → Administration Dashboard). */
export default function CreatorChatRedirect() {
  const { creatorId } = useLocalSearchParams<{ creatorId: string }>();
  const id = typeof creatorId === "string" ? creatorId : "";

  if (!id) {
    return <Redirect href="/ais" />;
  }

  if (isOwnerOpsAiId(id)) {
    return <Redirect href={{ pathname: "/owner-ops", params: { ai: id } }} />;
  }

  return <Redirect href={{ pathname: "/ais", params: { ai: id } }} />;
}
