export const KNOWN_API_DEVICE_KEY = "ur.knownApiDevice";

export type DeviceKind = "phone" | "computer";

export type RememberedApiDevice = {
  apiAddress: string;
  deviceKind: DeviceKind;
  rememberedAt: string;
};

export function normalizeApiAddress(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    const dropDefaultPort =
      (parsed.protocol === "https:" && parsed.port === "443") ||
      (parsed.protocol === "http:" && parsed.port === "80");
    const port = !parsed.port || dropDefaultPort ? "" : `:${parsed.port}`;
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${port}`;
  } catch {
    return trimmed.toLowerCase();
  }
}

function defaultApiBase(): string {
  const fromEnv =
    typeof process !== "undefined" ? process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? "" : "";
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

export function detectDeviceKind(userAgent = "", platformOs = ""): DeviceKind {
  if (platformOs === "ios" || platformOs === "android") return "phone";
  if (/iphone|ipad|ipod|android|mobile/i.test(userAgent)) return "phone";
  return "computer";
}

export function currentApiAddress(getBase: () => string = defaultApiBase): string {
  const fromApi = getBase().trim();
  if (fromApi) return normalizeApiAddress(fromApi);
  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizeApiAddress(window.location.origin);
  }
  return "";
}

export function isSameApiAddress(left: string, right: string): boolean {
  const a = normalizeApiAddress(left);
  const b = normalizeApiAddress(right);
  return Boolean(a) && a === b;
}

function webStore(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function readRememberedApiDevice(): RememberedApiDevice | null {
  const raw = webStore()?.getItem(KNOWN_API_DEVICE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RememberedApiDevice>;
    if (typeof parsed.apiAddress !== "string" || !parsed.apiAddress.trim()) return null;
    return {
      apiAddress: normalizeApiAddress(parsed.apiAddress),
      deviceKind: parsed.deviceKind === "phone" ? "phone" : "computer",
      rememberedAt: typeof parsed.rememberedAt === "string" ? parsed.rememberedAt : "",
    };
  } catch {
    return null;
  }
}

export function rememberSignedInApiDevice(now = new Date()): RememberedApiDevice {
  const record: RememberedApiDevice = {
    apiAddress: currentApiAddress(),
    deviceKind: detectDeviceKind(typeof navigator !== "undefined" ? navigator.userAgent : ""),
    rememberedAt: now.toISOString(),
  };
  try {
    webStore()?.setItem(KNOWN_API_DEVICE_KEY, JSON.stringify(record));
  } catch {
    /* private mode */
  }
  return record;
}

/** Same phone/computer and same site address — open the app if a session is still here. */
export function isRememberedOnThisApi(): boolean {
  const remembered = readRememberedApiDevice();
  if (!remembered) return false;
  const current = currentApiAddress();
  if (!current) return false;
  return isSameApiAddress(remembered.apiAddress, current);
}

/** New phone/computer or a different site address — use the email/password login page. */
export function isDifferentApiAddress(): boolean {
  const remembered = readRememberedApiDevice();
  if (!remembered) return true;
  const current = currentApiAddress();
  if (!current) return true;
  return !isSameApiAddress(remembered.apiAddress, current);
}
