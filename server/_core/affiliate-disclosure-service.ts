/** Server re-exports — core logic lives in lib/affiliate-disclosure.ts for client + server sharing. */
export {
  applyAffiliateDisclosures,
  isAffiliateOrAdUrl,
  messageContainsAffiliateLink,
  AI_AFFILIATE_SYSTEM_RULE,
  type DisclosureChannel,
} from "../../lib/affiliate-disclosure";
