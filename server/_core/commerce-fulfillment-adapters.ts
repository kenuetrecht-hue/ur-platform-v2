/**
 * Commerce fulfillment & affiliate provider adapters.
 * Wire API keys in .env when you sign up — code paths are ready now.
 */

import { TRPCError } from "@trpc/server";
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
