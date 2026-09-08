/**
 * In-platform search ranker — phrase, prefix, synonym, and 1-edit typo matching.
 * No web. No third-party search API.
 */

import type { PlatformSearchKind } from "./platform-search-policy";

export type SearchableDocument = {
  id: string;
  kind: PlatformSearchKind;
  title: string;
  subtitle?: string;
  body: string;
  category?: string;
  href: string;
  publishedAt?: string;
  extra?: string;
};

export type RankedSearchHit = SearchableDocument & {
  score: number;
  reasons: string[];
  snippet: string;
};

const SYNONYMS: Record<string, string[]> = {
  electrician: ["electrical", "electric", "wiring", "wire", "panel", "breaker", "gfci", "outlet"],
  plumber: ["plumbing", "pipe", "leak", "drain", "water heater", "faucet", "trap"],
  hvac: ["furnace", "ac", "air conditioner", "heat pump", "filter", "thermostat", "cooling", "heating"],
  welder: ["weld", "welding", "mig", "tig", "stick", "bead"],
  framer: ["framing", "stud", "rafter", "square"],
  roofer: ["roof", "roofing", "shingle", "leak"],
  automotive: ["car", "auto", "vehicle", "battery", "engine", "mechanic"],
  marina: ["boat", "outboard", "marine", "dock"],
  mower: ["small engine", "lawn", "saw", "generator"],
  spanish: ["hola", "espanol", "español", "language", "translate", "translator"],
  language: ["translate", "translator", "linguamate", "spanish", "french", "japanese"],
  guitar: ["music", "musician", "tune", "song", "songwriter"],
  song: ["lyrics", "hook", "songwriter", "music"],
  fitness: ["workout", "squat", "exercise", "trainer"],
  sleep: ["wellness", "insomnia", "bed"],
  book: ["author", "novel", "writing", "scene"],
  recipe: ["cook", "culinary", "kitchen", "salt"],
  print: ["3d", "printer", "nozzle", "bed"],
  code: ["techbuilder", "bug", "error", "programmer"],
  game: ["gameforge", "videogame", "loop"],
  legal: ["lawyer", "attorney", "law"],
  house: ["real estate", "property", "showing"],
  creator: ["contentmate", "subscriber", "follow", "channel"],
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9#+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeQuery(query: string): string[] {
  const base = normalize(query).split(" ").filter((token) => token.length > 0);
  const expanded = new Set<string>(base);
  for (const token of base) {
    for (const [key, aliases] of Object.entries(SYNONYMS)) {
      if (token === key || aliases.includes(token)) {
        expanded.add(key);
        for (const alias of aliases) expanded.add(alias);
      }
    }
  }
  return [...expanded];
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const insert = row[j]! + 1;
      const del = prev + 1;
      const sub = row[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1);
      const next = Math.min(insert, del, sub);
      row[j - 1] = prev;
      prev = next;
    }
    row[b.length] = prev;
  }
  return row[b.length]!;
}

function allowedEdits(token: string): number {
  if (token.length >= 8) return 2;
  if (token.length >= 4) return 1;
  return 0;
}

function fuzzyHit(token: string, haystackTokens: string[]): boolean {
  const edits = allowedEdits(token);
  if (edits === 0) return false;
  return haystackTokens.some((word) => {
    if (Math.abs(word.length - token.length) > edits) return false;
    return levenshtein(token, word) <= edits;
  });
}

function snippetFrom(body: string, tokens: string[]): string {
  const clean = body.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const lower = clean.toLowerCase();
  const found = tokens.find((token) => token.length >= 3 && lower.includes(token));
  if (!found) return clean.slice(0, 160);
  const at = lower.indexOf(found);
  const start = Math.max(0, at - 40);
  const slice = clean.slice(start, start + 160);
  return `${start > 0 ? "…" : ""}${slice}${start + 160 < clean.length ? "…" : ""}`;
}

export function scoreDocument(doc: SearchableDocument, query: string): RankedSearchHit | null {
  const raw = normalize(query);
  if (raw.length < 2) return null;
  const tokens = tokenizeQuery(query);
  const title = normalize(doc.title);
  const subtitle = normalize(doc.subtitle ?? "");
  const category = normalize(doc.category ?? "");
  const body = normalize(`${doc.body} ${doc.extra ?? ""}`);
  const haystack = `${title} ${subtitle} ${category} ${body}`;
  const hayTokens = haystack.split(" ").filter(Boolean);
  const reasons: string[] = [];
  let score = 0;

  if (title === raw || title.includes(raw)) {
    score += 120;
    reasons.push("Exact title");
  } else if (raw.length >= 3 && title.startsWith(raw)) {
    score += 70;
    reasons.push("Title starts with your words");
  }

  let matched = 0;
  for (const token of tokens) {
    if (token.length < 2) continue;
    if (title.split(" ").includes(token) || title.includes(token)) {
      score += token.length >= 5 ? 46 : 34;
      matched += 1;
      continue;
    }
    if (subtitle.includes(token) || category.includes(token)) {
      score += 22;
      matched += 1;
      continue;
    }
    if (body.includes(token)) {
      score += 10;
      matched += 1;
      continue;
    }
    if (hayTokens.some((word) => word.startsWith(token) && token.length >= 3)) {
      score += 16;
      matched += 1;
      continue;
    }
    if (fuzzyHit(token, hayTokens)) {
      score += 12;
      matched += 1;
      reasons.push("Close spelling");
    }
  }

  if (matched === 0 && score < 70) return null;
  if (matched >= Math.min(2, tokenizeQuery(query).filter((t) => t.length >= 3).length || 1)) {
    score += 18;
  }

  if (doc.publishedAt) {
    const ageHours = (Date.now() - Date.parse(doc.publishedAt)) / 3_600_000;
    if (ageHours >= 0 && ageHours < 72) score += 8;
  }

  if (reasons.length === 0) {
    reasons.push(doc.kind === "specialist" ? "Matched this specialist" : "Matched on UR");
  }

  return {
    ...doc,
    score,
    reasons: [...new Set(reasons)].slice(0, 3),
    snippet: snippetFrom(doc.body || doc.subtitle || doc.title, tokens),
  };
}

export function rankDocuments(docs: SearchableDocument[], query: string, limit = 24): RankedSearchHit[] {
  return docs
    .map((doc) => scoreDocument(doc, query))
    .filter((hit): hit is RankedSearchHit => Boolean(hit))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function suggestDidYouMean(query: string, titles: string[]): string | null {
  const raw = normalize(query);
  if (raw.length < 4) return null;
  let best: { title: string; distance: number } | null = null;
  for (const title of titles) {
    const words = normalize(title).split(" ").filter((word) => word.length >= 4);
    for (const word of words) {
      const distance = levenshtein(raw, word);
      if (distance === 0 || distance > 2) continue;
      if (!best || distance < best.distance) best = { title, distance };
    }
  }
  return best?.title ?? null;
}
