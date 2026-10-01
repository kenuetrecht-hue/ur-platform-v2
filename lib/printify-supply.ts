/** Titles from Printify's catalog. The API token never leaves the server. */

export type PrintifySupplyItem = {
  id: string;
  title: string;
};

export type PrintifyShopOffer = {
  productId: string;
  variantId: string;
  title: string;
  costCents: number;
  blueprintId: string;
  printProviderId: string;
};

export function mapPrintifyBlueprints(body: unknown): PrintifySupplyItem[] {
  const rows = Array.isArray(body) ? body : [];
  const items: PrintifySupplyItem[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as { id?: unknown; title?: unknown };
    const title = typeof record.title === "string" ? record.title.replace(/\s+/g, " ").trim().slice(0, 80) : "";
    if (!title) continue;
    const id = typeof record.id === "number" || typeof record.id === "string" ? String(record.id).slice(0, 24) : "";
    if (!id) continue;
    items.push({ id, title });
    if (items.length >= 16) break;
  }
  return items;
}

function offerTitle(productTitle: string, variantTitle: string): string {
  const product = productTitle.replace(/\s+/g, " ").trim().slice(0, 60);
  const variant = variantTitle.replace(/\s+/g, " ").trim().slice(0, 40);
  if (!product) return variant;
  if (!variant) return product;
  return `${product} · ${variant}`.slice(0, 80);
}

/** Lowest in-stock variant cost on each shop product. Cost is Printify’s fulfillment cost in cents. */
export function mapPrintifyShopProducts(body: unknown): PrintifyShopOffer[] {
  const record = body && typeof body === "object" ? (body as { data?: unknown }) : null;
  const rows = Array.isArray(record?.data) ? record.data : Array.isArray(body) ? body : [];
  const offers: PrintifyShopOffer[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const product = row as {
      id?: unknown;
      title?: unknown;
      variants?: unknown;
      blueprint_id?: unknown;
      print_provider_id?: unknown;
    };
    const productId = typeof product.id === "string" ? product.id.slice(0, 64) : "";
    const blueprintId =
      typeof product.blueprint_id === "number" || typeof product.blueprint_id === "string"
        ? String(product.blueprint_id).slice(0, 24)
        : "";
    const printProviderId =
      typeof product.print_provider_id === "number" || typeof product.print_provider_id === "string"
        ? String(product.print_provider_id).slice(0, 24)
        : "";
    if (!productId || !blueprintId || !printProviderId) continue;
    const variants = Array.isArray(product.variants) ? product.variants : [];
    let best: { variantId: string; title: string; costCents: number } | null = null;
    for (const variant of variants) {
      if (!variant || typeof variant !== "object") continue;
      const item = variant as { id?: unknown; title?: unknown; cost?: unknown; is_enabled?: unknown };
      if (item.is_enabled === false) continue;
      if (!Number.isInteger(item.cost) || (item.cost as number) < 100) continue;
      const variantId = typeof item.id === "number" || typeof item.id === "string" ? String(item.id).slice(0, 24) : "";
      if (!variantId) continue;
      const costCents = item.cost as number;
      if (!best || costCents < best.costCents) {
        best = {
          variantId,
          title: offerTitle(typeof product.title === "string" ? product.title : "", typeof item.title === "string" ? item.title : ""),
          costCents,
        };
      }
    }
    if (!best?.title) continue;
    offers.push({
      productId,
      variantId: best.variantId,
      title: best.title,
      costCents: best.costCents,
      blueprintId,
      printProviderId,
    });
    if (offers.length >= 16) break;
  }
  return offers;
}

/** US shipping for the first item, in cents. Printify bills this on top of the variant cost. */
export function printifyUsShippingCents(body: unknown): number | null {
  const profiles = body && typeof body === "object" ? (body as { profiles?: unknown }).profiles : null;
  if (!Array.isArray(profiles)) return null;
  for (const profile of profiles) {
    if (!profile || typeof profile !== "object") continue;
    const row = profile as { countries?: unknown; first_item?: { cost?: unknown } };
    const countries = Array.isArray(row.countries) ? row.countries.map((country) => String(country).toUpperCase()) : [];
    if (!countries.includes("US")) continue;
    return Number.isInteger(row.first_item?.cost) && (row.first_item?.cost as number) >= 0
      ? (row.first_item?.cost as number)
      : null;
  }
  return null;
}
