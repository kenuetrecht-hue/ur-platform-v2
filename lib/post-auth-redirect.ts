import type { Href } from "expo-router";

/** Same post-logout destination on website and native app. */
export function getPostLogoutHref(): Href {
  return "/login";
}
