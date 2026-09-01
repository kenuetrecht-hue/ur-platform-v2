/**
 * Deterministic UR World avatar look from account id — everyone gets one
 * without a character creator (that is a later slice).
 */

export type UrWorldAvatarLook = {
  bodyHex: string;
  accentHex: string;
  initial: string;
};

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function avatarLookFromUserId(userId: string, displayName?: string): UrWorldAvatarLook {
  const seed = userId.trim() || "guest";
  const h = hashString(seed);
  const hue = h % 360;
  const accentHue = (hue + 38) % 360;
  const letter = (displayName?.trim()?.[0] || seed.replace(/[^a-zA-Z]/g, "")[0] || "U").toUpperCase();
  return {
    bodyHex: hslToHex(hue, 42, 38),
    accentHex: hslToHex(accentHue, 55, 48),
    initial: letter,
  };
}
