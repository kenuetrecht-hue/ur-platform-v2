/** Owner social posting — Ayrshare + Buffer, one publisher per network. */

export const SOCIAL_PUBLISHERS = ["ayrshare", "buffer"] as const;
export type SocialPublisherId = (typeof SOCIAL_PUBLISHERS)[number];

export const SOCIAL_NETWORKS = [
  "facebook",
  "instagram",
  "twitter",
  "linkedin",
  "tiktok",
  "youtube",
] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export const SOCIAL_NETWORK_LABEL: Record<SocialNetwork, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "X / Twitter",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
};

export const SOCIAL_ROUTE_ENV: Record<SocialNetwork, string> = {
  facebook: "SOCIAL_ROUTE_FACEBOOK",
  instagram: "SOCIAL_ROUTE_INSTAGRAM",
  twitter: "SOCIAL_ROUTE_TWITTER",
  linkedin: "SOCIAL_ROUTE_LINKEDIN",
  tiktok: "SOCIAL_ROUTE_TIKTOK",
  youtube: "SOCIAL_ROUTE_YOUTUBE",
};

export const BUFFER_PROFILE_ENV: Record<SocialNetwork, string> = {
  facebook: "BUFFER_FACEBOOK_PROFILE_ID",
  instagram: "BUFFER_INSTAGRAM_PROFILE_ID",
  twitter: "BUFFER_TWITTER_PROFILE_ID",
  linkedin: "BUFFER_LINKEDIN_PROFILE_ID",
  tiktok: "BUFFER_TIKTOK_PROFILE_ID",
  youtube: "BUFFER_YOUTUBE_PROFILE_ID",
};

export function isSocialPublisherId(value: string): value is SocialPublisherId {
  return (SOCIAL_PUBLISHERS as readonly string[]).includes(value);
}

export function isSocialNetwork(value: string): value is SocialNetwork {
  return (SOCIAL_NETWORKS as readonly string[]).includes(value);
}
