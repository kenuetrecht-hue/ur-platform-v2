import { Redirect } from "expo-router";

/** Legacy route — AI Hub now lives on the main AIs tab. */
export default function AIHubRedirect() {
  return <Redirect href="/ais" />;
}
