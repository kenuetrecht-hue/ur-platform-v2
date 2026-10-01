/** Titles from Printify's catalog. The API token never leaves the server. */

export type PrintifySupplyItem = {
  id: string;
  title: string;
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
