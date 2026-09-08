/**
 * Free creator posts vs paid income — followers are interest, subscribers are the paycheck.
 */

export const CREATOR_FREE_CONTENT_INCOME_RULE =
  "Creators are not paid for free videos, photos, or posts. Free content is advertising — a way to show the community who you are and point people toward paid merchandise, a paid channel subscription, or paid classes. Views on free posts are not a paycheck.";

export const CREATOR_FREE_CONTENT_INCOME_RULE_SHORT =
  "Free posts do not pay the creator. They advertise paid merch, paid subscriptions, and paid classes.";

export const CREATOR_PAID_INCOME_GOAL =
  "A creator's real income on UR is paid subscribers — people who pay for the channel, classes, or merchandise. That is the goal: turn interest into paying subscribers.";

export const CREATOR_FOLLOWER_DEFINITION =
  "A follower is someone interested in the creator's free content who is not paying. Follow is free. Followers can watch free posts, share them, and rate videos. They have not bought a subscription.";

export const CREATOR_PAID_SUBSCRIBER_DEFINITION =
  "A paid subscriber is someone who pays for the creator's information — the channel, classes, or other paid offers. That money is the creator's true income. Followers are not subscribers.";

export const CREATOR_AUDIENCE_GOAL_RULE =
  `${CREATOR_FOLLOWER_DEFINITION} ${CREATOR_PAID_SUBSCRIBER_DEFINITION} ${CREATOR_PAID_INCOME_GOAL}`;

export const CREATOR_FREE_CONTENT_POST_NOTICE =
  "This post is free for everyone. You do not get paid when people watch or like it. Use it to advertise your paid merch, paid subscription, or paid classes, or to share useful information and gain views. Paid subscribers are how you get paid.";

export const CREATOR_FREE_VIDEO_SHARE_NOTICE =
  "This is free creator content on UR Platform. Sharing it is allowed. Do not reupload it as your own. Free videos do not pay the creator — they advertise paid subscriptions, merch, and classes.";

export const CREATOR_PAID_VIDEO_NO_SHARE =
  "Paid classes and paid replays cannot be shared as free videos. Buy a ticket or subscribe to watch.";

export const VIDEO_STAR_RATING_HINT =
  "Rate this video 1 to 5 stars after you watch. One rating per person. The creator can see the average.";

export const CREATOR_FREE_SHAREABLE_KINDS = ["social_video", "cartoon"] as const;
export type CreatorFreeShareableKind = (typeof CREATOR_FREE_SHAREABLE_KINDS)[number];

export function isFreeShareableVideoKind(kind: string): kind is CreatorFreeShareableKind {
  return (CREATOR_FREE_SHAREABLE_KINDS as readonly string[]).includes(kind);
}
