/** Fun face looks for a member's own camera. Pictures stay on the device. */

export const FACE_FILTERS = [
  { id: "plain", label: "Plain", emoji: "🙂" },
  { id: "glasses", label: "Glasses", emoji: "🕶️" },
  { id: "mustache", label: "Mustache", emoji: "🥸" },
  { id: "ears", label: "Bunny ears", emoji: "🐰" },
  { id: "stars", label: "Stars", emoji: "✨" },
  { id: "cap", label: "UR cap", emoji: "🧢" },
] as const;

export type FaceFilterId = (typeof FACE_FILTERS)[number]["id"];

export function isFaceFilterId(value: string): value is FaceFilterId {
  return FACE_FILTERS.some((filter) => filter.id === value);
}

export const WEEKLY_FILTER_SHAPES = ["glasses", "blush", "crown", "hearts", "freckles", "bow"] as const;
export type WeeklyFilterShape = (typeof WEEKLY_FILTER_SHAPES)[number];

export function isWeeklyFilterShape(value: string): value is WeeklyFilterShape {
  return (WEEKLY_FILTER_SHAPES as readonly string[]).includes(value);
}

/** Draw one filter on a selfie-sized canvas. The face is assumed near the upper middle. */
export function drawFaceFilter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  filterId: FaceFilterId,
): void {
  if (filterId === "plain") return;
  const cx = width * 0.5;
  const cy = height * 0.42;
  const scale = Math.min(width, height);

  ctx.save();
  if (filterId === "glasses") {
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = Math.max(4, scale * 0.012);
    ctx.beginPath();
    ctx.ellipse(cx - scale * 0.12, cy, scale * 0.1, scale * 0.07, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx + scale * 0.12, cy, scale * 0.1, scale * 0.07, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - scale * 0.02, cy);
    ctx.lineTo(cx + scale * 0.02, cy);
    ctx.stroke();
  } else if (filterId === "mustache") {
    ctx.fillStyle = "#1f2937";
    ctx.beginPath();
    ctx.ellipse(cx, cy + scale * 0.12, scale * 0.16, scale * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (filterId === "ears") {
    ctx.fillStyle = "#f9a8d4";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + side * scale * 0.16, cy - scale * 0.22, scale * 0.07, scale * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fbcfe8";
      ctx.beginPath();
      ctx.ellipse(cx + side * scale * 0.16, cy - scale * 0.2, scale * 0.03, scale * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f9a8d4";
    }
  } else if (filterId === "stars") {
    ctx.fillStyle = "#f5c542";
    for (const [dx, dy] of [
      [-0.1, -0.02],
      [0.1, 0.02],
      [0, 0.08],
    ] as const) {
      ctx.beginPath();
      ctx.arc(cx + dx * scale, cy + dy * scale, scale * 0.018, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (filterId === "cap") {
    ctx.fillStyle = "#312e81";
    ctx.beginPath();
    ctx.ellipse(cx, cy - scale * 0.16, scale * 0.18, scale * 0.08, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - scale * 0.18, cy - scale * 0.16, scale * 0.36, scale * 0.04);
    ctx.fillStyle = "#f5c542";
    ctx.font = `700 ${Math.round(scale * 0.05)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("UR", cx, cy - scale * 0.14);
  }
  ctx.restore();
}

/** A weekly look uses one shape and one color picked for that Monday. */
export function drawWeeklyFaceLook(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  look: { shape: WeeklyFilterShape; color: string },
): void {
  const cx = width * 0.5;
  const cy = height * 0.42;
  const scale = Math.min(width, height);
  ctx.save();
  ctx.fillStyle = look.color;
  ctx.strokeStyle = look.color;
  ctx.lineWidth = Math.max(4, scale * 0.012);
  if (look.shape === "glasses") {
    ctx.beginPath();
    ctx.ellipse(cx - scale * 0.12, cy, scale * 0.1, scale * 0.07, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx + scale * 0.12, cy, scale * 0.1, scale * 0.07, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (look.shape === "blush") {
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(cx - scale * 0.14, cy + scale * 0.06, scale * 0.06, scale * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + scale * 0.14, cy + scale * 0.06, scale * 0.06, scale * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (look.shape === "crown") {
    ctx.beginPath();
    ctx.moveTo(cx - scale * 0.16, cy - scale * 0.08);
    ctx.lineTo(cx - scale * 0.1, cy - scale * 0.2);
    ctx.lineTo(cx, cy - scale * 0.08);
    ctx.lineTo(cx + scale * 0.1, cy - scale * 0.22);
    ctx.lineTo(cx + scale * 0.16, cy - scale * 0.08);
    ctx.closePath();
    ctx.fill();
  } else if (look.shape === "hearts") {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + side * scale * 0.12, cy + scale * 0.02, scale * 0.03, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (look.shape === "freckles") {
    for (const [dx, dy] of [
      [-0.12, 0.05],
      [-0.08, 0.09],
      [0.08, 0.06],
      [0.13, 0.1],
    ] as const) {
      ctx.beginPath();
      ctx.arc(cx + dx * scale, cy + dy * scale, scale * 0.01, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (look.shape === "bow") {
    ctx.beginPath();
    ctx.ellipse(cx - scale * 0.06, cy - scale * 0.18, scale * 0.05, scale * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + scale * 0.06, cy - scale * 0.18, scale * 0.05, scale * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
