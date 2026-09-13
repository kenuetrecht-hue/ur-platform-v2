import {
  JOIN_EMANUAL_GIFT_LINE,
  JOIN_EMANUAL_MONEY_NOTES,
  JOIN_EMANUAL_STEPS,
  JOIN_EMANUAL_SUBTITLE,
  JOIN_EMANUAL_TITLE,
} from "@/lib/join-emanual";
import { getPlatformPublicOrigin } from "@/lib/platform-urls";

export const JOIN_EMANUAL_PDF_PATH = "/e-manual.pdf";
export const JOIN_EMANUAL_PDF_FILE_NAME = "UR-Platform-e-manual.pdf";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const BODY_SIZE = 11;
const LINE_HEIGHT = 15;
const LINES_PER_PAGE = 44;

function asciiFold(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[—–]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[·•]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pdfEscape(text: string): string {
  return asciiFold(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(text: string, max = 86): string[] {
  const clean = asciiFold(text);
  if (!clean) return [""];
  if (clean.length <= max) return [clean];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= max) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    if (word.length > max) {
      for (let i = 0; i < word.length; i += max) {
        lines.push(word.slice(i, i + max));
      }
      current = "";
    } else {
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export function buildJoinEmanualPlainText(): string {
  const lines = [
    JOIN_EMANUAL_TITLE,
    JOIN_EMANUAL_SUBTITLE,
    "",
    JOIN_EMANUAL_GIFT_LINE,
    "",
    `Official site: ${getPlatformPublicOrigin()}`,
    "",
  ];
  for (const step of JOIN_EMANUAL_STEPS) {
    lines.push(`Step ${step.number}. ${step.title}`);
    for (const click of step.clicks) {
      lines.push(`- ${click}`);
    }
    lines.push("");
  }
  lines.push("Money rules (read these)");
  for (const note of JOIN_EMANUAL_MONEY_NOTES) {
    lines.push(`- ${note}`);
  }
  return lines.join("\n");
}

function contentLines(): string[] {
  return buildJoinEmanualPlainText().split("\n").flatMap((line) => wrapLine(line));
}

function pageStream(lines: string[]): string {
  const commands = ["BT", `/F1 ${BODY_SIZE} Tf`, `${MARGIN} ${PAGE_HEIGHT - MARGIN} Td`];
  lines.forEach((line, index) => {
    if (index > 0) commands.push(`0 -${LINE_HEIGHT} Td`);
    commands.push(`(${pdfEscape(line) || " "}) Tj`);
  });
  commands.push("ET");
  return commands.join("\n");
}

function paginate(lines: string[]): string[][] {
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
    pages.push(lines.slice(i, i + LINES_PER_PAGE));
  }
  return pages.length ? pages : [[JOIN_EMANUAL_TITLE]];
}

/** Small PDF the phone can save. No extra libraries. */
export function buildJoinEmanualPdfBytes(): Uint8Array {
  const pages = paginate(contentLines());
  const fontId = 3;
  const pageIds = pages.map((_, i) => 4 + i * 2);
  const contentIds = pages.map((_, i) => 5 + i * 2);

  const bodies = new Map<number, string>();
  bodies.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  bodies.set(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  bodies.set(fontId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  pages.forEach((lines, i) => {
    const stream = pageStream(lines);
    bodies.set(
      pageIds[i]!,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentIds[i]} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`,
    );
    const length = new TextEncoder().encode(stream).length;
    bodies.set(contentIds[i]!, `<< /Length ${length} >>\nstream\n${stream}\nendstream`);
  });

  const ids = [...bodies.keys()].sort((a, b) => a - b);
  const parts: Uint8Array[] = [new TextEncoder().encode("%PDF-1.4\n")];
  const offsets = [0];
  let cursor = parts[0]!.length;

  for (const id of ids) {
    const object = new TextEncoder().encode(`${id} 0 obj\n${bodies.get(id)}\nendobj\n`);
    offsets[id] = cursor;
    parts.push(object);
    cursor += object.length;
  }

  const xrefStart = cursor;
  const maxId = ids[ids.length - 1] ?? 0;
  let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= maxId; i += 1) {
    const offset = offsets[i] ?? 0;
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  parts.push(new TextEncoder().encode(xref));
  parts.push(
    new TextEncoder().encode(`trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`),
  );

  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const pdf = new Uint8Array(total);
  let written = 0;
  for (const part of parts) {
    pdf.set(part, written);
    written += part.length;
  }
  return pdf;
}
