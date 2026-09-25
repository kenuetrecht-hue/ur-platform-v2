/**
 * Stripe review hold for the unfinished merch storefront.
 *
 * The shop still has placeholder pictures and a "Simulated buy" button.
 * Stripe rejects a site that looks unfinished or that hides what is actually sold.
 * While this is false, Home, Discover, search, and /shop do not show that store.
 * The shop code itself is still in the repo.
 *
 * RESTORE AFTER STRIPE VERIFIES THE ACCOUNT:
 * Set STOREFRONT_VISIBLE to true. That puts the Shop door, Discover marketplace
 * link, search results, and /shop catalog back exactly as they were.
 */
export const STOREFRONT_VISIBLE = false;
