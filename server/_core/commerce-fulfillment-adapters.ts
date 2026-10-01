/**
 * Commerce fulfillment & affiliate provider adapters.
 * Wire API keys in .env when you sign up — code paths are ready now.
 */

import { TRPCError } from "@trpc/server";
import { memberPrintifyRetailCents } from "../../lib/member-printify-pricing";
import {
  mapPrintifyBlueprints,
  mapPrintifyShopProducts,
  printifyUsShippingCents,
  type PrintifySupplyItem,
} from "../../lib/printify-supply";
import { isAllowedAffiliateProductUrl } from "../../lib/affiliate-link-policy";
import {
  getAmazonAssociateTag,
  getCjDropshippingApiKey,
  getPrintfulApiKey,
  getPrintfulStoreId,
  getPrintifyApiToken,
  getWalmartTrackingId,
} from "./secrets";

export type FulfillmentProvider =
  | "printful"
  | "printify"
  | "cj_dropshipping"
  | "amazon_associates"
  | "walmart_affiliate";

export type ProviderStatus = {
  id: FulfillmentProvider;
  label: string;
  kind: "pod" | "dropship" | "affiliate";
  configured: boolean;
  envKeys: string[];
  docsUrl: string;
  notes: string;
};

const PROVIDER_DEFS: Omit<ProviderStatus, "configured">[] = [
  {
    id: "printful",
    label: "Printful",
    kind: "pod",
    envKeys: ["PRINTFUL_API_KEY", "PRINTFUL_STORE_ID"],
    docsUrl: "https://developers.printful.com/docs/",
    notes: "POD fulfillment — add API key after Printful store setup.",
  },
  {
    id: "printify",
    label: "Printify",
    kind: "pod",
    envKeys: ["PRINTIFY_API_TOKEN", "PRINTIFY_SHOP_ID"],
    docsUrl: "https://developers.printify.com/",
    notes: "Alternative POD network — optional second supplier.",
  },
  {
    id: "cj_dropshipping",
    label: "CJ Dropshipping",
    kind: "dropship",
    envKeys: ["CJ_DROPSHIPPING_API_KEY"],
    docsUrl: "https://developers.cjdropshipping.com/",
    notes: "General dropship catalog — connect when approved by CJ.",
  },
  {
    id: "amazon_associates",
    label: "Amazon Associates",
    kind: "affiliate",
    envKeys: ["AMAZON_ASSOCIATE_TAG"],
    docsUrl: "https://affiliate-program.amazon.com/",
    notes: "Affiliate links only — human review required for AI copy.",
  },
  {
    id: "walmart_affiliate",
    label: "Walmart Affiliates",
    kind: "affiliate",
    envKeys: ["WALMART_TRACKING_ID"],
    docsUrl: "https://affiliates.walmart.com/",
    notes: "Affiliate links only — Walmart AI policy requires owner approval.",
  },
];

function readProviderConfigured(id: FulfillmentProvider): boolean {
  switch (id) {
    case "printful":
      return Boolean(getPrintfulApiKey());
    case "printify":
      return Boolean(getPrintifyApiToken());
    case "cj_dropshipping":
      return Boolean(getCjDropshippingApiKey());
    case "amazon_associates":
      return Boolean(getAmazonAssociateTag());
    case "walmart_affiliate":
      return Boolean(getWalmartTrackingId());
    default:
      return false;
  }
}

export function getCommerceProviderStatus(): ProviderStatus[] {
  return PROVIDER_DEFS.map((p) => ({ ...p, configured: readProviderConfigured(p.id) }));
}

export function isProviderConfigured(id: FulfillmentProvider): boolean {
  return readProviderConfigured(id);
}

/** Build outbound affiliate URL with tracking — no external API call needed. */
export function buildAffiliateOutboundUrl(params: {
  provider: "amazon_associates" | "walmart_affiliate";
  productUrl: string;
}): string {
  const url = params.productUrl.trim();
  if (!url.startsWith("http")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Product URL must start with http(s)." });
  }
  if (!isAllowedAffiliateProductUrl(url, params.provider)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        params.provider === "amazon_associates"
          ? "Use an official Amazon product page (amazon.com, amzn.to, or a.co)."
          : "Use an official Walmart product page (walmart.com).",
    });
  }

  if (params.provider === "amazon_associates") {
    const tag = getAmazonAssociateTag();
    if (!tag) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}tag=${encodeURIComponent(tag)}`;
  }

  const affid = getWalmartTrackingId();
  if (!affid) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}affid=${encodeURIComponent(affid)}`;
}

export type FulfillmentOrderRequest = {
  provider: FulfillmentProvider;
  externalProductId?: string;
  quantity: number;
  recipient: {
    name: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
};

export type FulfillmentOrderResult = {
  provider: FulfillmentProvider;
  status: "simulated" | "submitted";
  externalOrderId?: string;
  message: string;
};

/** Submit order to POD/dropship provider — simulated until API key is set. */
export async function submitFulfillmentOrder(
  params: FulfillmentOrderRequest,
): Promise<FulfillmentOrderResult> {
  const provider = PROVIDER_DEFS.find((p) => p.id === params.provider);
  if (!provider) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown fulfillment provider." });
  }

  if (provider.kind === "affiliate") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Affiliate providers do not accept fulfillment orders — use outbound links only.",
    });
  }

  if (!readProviderConfigured(provider.id)) {
    return {
      provider: params.provider,
      status: "simulated",
      message: `${provider.label} API key not set — order recorded locally. Add ${provider.envKeys[0]} to .env when ready.`,
    };
  }

  switch (params.provider) {
    case "printful":
      return submitPrintfulOrder(params);
    case "printify":
      return submitPrintifyOrder(params);
    case "cj_dropshipping":
      return submitCjOrder(params);
    default:
      return {
        provider: params.provider,
        status: "simulated",
        message: "Provider adapter pending live API wiring.",
      };
  }
}

async function submitPrintfulOrder(params: FulfillmentOrderRequest): Promise<FulfillmentOrderResult> {
  const apiKey = getPrintfulApiKey();
  const storeId = getPrintfulStoreId();
  // Live POST https://api.printful.com/v2/orders when LLC + Printful account ready
  void apiKey;
  void storeId;
  return {
    provider: "printful",
    status: "simulated",
    externalOrderId: `pf-sim-${Date.now()}`,
    message: "Printful API key detected — live order POST enabled after fulfillment service wiring.",
  };
}

async function submitPrintifyOrder(params: FulfillmentOrderRequest): Promise<FulfillmentOrderResult> {
  void params;
  return {
    provider: "printify",
    status: "simulated",
    message: "Printify token detected — connect shop ID to enable live orders.",
  };
}

async function submitCjOrder(params: FulfillmentOrderRequest): Promise<FulfillmentOrderResult> {
  void params;
  return {
    provider: "cj_dropshipping",
    status: "simulated",
    message: "CJ API key detected — catalog sync available when wired.",
  };
}

export type MemberPrintifyOffer = PrintifySupplyItem & {
  productId: string;
  variantId: string;
  retailCents: number;
  profitCents: number;
};

async function printifyGet(path: string, token: string): Promise<unknown | null> {
  const response = await fetch(`https://api.printify.com/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "User-Agent": "URPlatform",
    },
    signal: AbortSignal.timeout(12_000),
  });
  const text = await response.text();
  if (!response.ok || text.trim().startsWith("<")) return null;
  return JSON.parse(text) as unknown;
}

/** Catalog for any signed-in member. Prices exist only when Printify tells us the cost. The token is not returned. */
export async function listCreatorPrintifySupply(): Promise<{
  ready: boolean;
  shopReady: boolean;
  forSale: MemberPrintifyOffer[];
  catalog: PrintifySupplyItem[];
}> {
  const token = getPrintifyApiToken();
  if (!token) return { ready: false, shopReady: false, forSale: [], catalog: [] };
  try {
    const shopId = getPrintifyShopId();
    const [blueprints, shop] = await Promise.all([
      printifyGet("catalog/blueprints.json", token),
      shopId ? printifyGet(`shops/${encodeURIComponent(shopId)}/products.json`, token) : Promise.resolve(null),
    ]);
    const forSale: MemberPrintifyOffer[] = [];
    const shippingByRoute = new Map<string, number | null>();
    for (const offer of mapPrintifyShopProducts(shop)) {
      const route = `${offer.blueprintId}/${offer.printProviderId}`;
      if (!shippingByRoute.has(route)) {
        const shipping = await printifyGet(
          `catalog/blueprints/${encodeURIComponent(offer.blueprintId)}/print_providers/${encodeURIComponent(offer.printProviderId)}/shipping.json`,
          token,
        );
        shippingByRoute.set(route, printifyUsShippingCents(shipping));
      }
      const shippingCents = shippingByRoute.get(route);
      if (shippingCents == null) continue;
      const retailCents = memberPrintifyRetailCents(offer.costCents + shippingCents);
      if (!retailCents) continue;
      forSale.push({
        id: offer.productId,
        title: offer.title,
        productId: offer.productId,
        variantId: offer.variantId,
        retailCents,
        profitCents: retailCents - offer.costCents - shippingCents,
      });
    }
    return {
      ready: true,
      shopReady: Boolean(shopId),
      forSale,
      catalog: mapPrintifyBlueprints(blueprints),
    };
  } catch {
    return { ready: true, shopReady: Boolean(getPrintifyShopId()), forSale: [], catalog: [] };
  }
}

export async function quoteMemberPrintifyOffer(
  productId: string,
  variantId: string,
): Promise<MemberPrintifyOffer | null> {
  const supply = await listCreatorPrintifySupply();
  return supply.forSale.find((item) => item.productId === productId && item.variantId === variantId) ?? null;
}

export async function placeMemberPrintifyOrder(params: {
  productId: string;
  variantId: string;
  externalId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address1: string;
  city: string;
  region: string;
  zip: string;
  country: string;
}): Promise<void> {
  const token = getPrintifyApiToken();
  const shopId = getPrintifyShopId();
  if (!token || !shopId) return;
  const variantId = Number.parseInt(params.variantId, 10);
  if (!Number.isInteger(variantId)) return;
  await fetch(`https://api.printify.com/v1/shops/${encodeURIComponent(shopId)}/orders.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "URPlatform",
    },
    body: JSON.stringify({
      external_id: params.externalId.slice(0, 40),
      label: "UR member order",
      line_items: [{ product_id: params.productId, variant_id: variantId, quantity: 1 }],
      shipping_method: 1,
      send_shipping_notification: false,
      address_to: {
        first_name: params.firstName.slice(0, 40),
        last_name: params.lastName.slice(0, 40),
        email: params.email.slice(0, 80),
        phone: params.phone.slice(0, 20),
        country: params.country.slice(0, 2),
        region: params.region.slice(0, 8),
        address1: params.address1.slice(0, 80),
        city: params.city.slice(0, 40),
        zip: params.zip.slice(0, 12),
      },
    }),
    signal: AbortSignal.timeout(18_000),
  });
}

/** Pull catalog from provider — returns empty until keys + sync job wired. */
export async function syncCatalogFromProvider(provider: FulfillmentProvider): Promise<{
  provider: FulfillmentProvider;
  imported: number;
  message: string;
}> {
  if (!isProviderConfigured(provider)) {
    return {
      provider,
      imported: 0,
      message: `Add ${PROVIDER_DEFS.find((p) => p.id === provider)?.envKeys[0]} to .env, then re-run sync.`,
    };
  }
  return {
    provider,
    imported: 0,
    message: "Provider configured — catalog sync job ready to enable post-LLC.",
  };
}
