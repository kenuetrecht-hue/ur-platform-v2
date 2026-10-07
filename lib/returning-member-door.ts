import { ATTRACTION_HREF, RETURNING_LOGIN_HREF } from "@/lib/after-sign-in";
import { PUBLIC_WEBSITE_ORIGIN } from "@/lib/password-recovery-url";

/** This phone or computer has already created an account or logged in. */
export const JOINED_ON_DEVICE_KEY = "ur.joinedOnThisDevice";

/** Advertisements use this address so people land on the attraction page, not Login. */
export const ADVERTISEMENT_ATTRACTION_URL = `${PUBLIC_WEBSITE_ORIGIN}${ATTRACTION_HREF}` as const;

function webStore(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

/** Keep this after logout. The next visit should open Login, not the attraction page. */
export function rememberJoinedOnThisDevice(): void {
  const store = webStore();
  if (store) {
    try {
      store.setItem(JOINED_ON_DEVICE_KEY, "1");
    } catch {
      /* private mode */
    }
    return;
  }
  void import("@react-native-async-storage/async-storage")
    .then((mod) => mod.default.setItem(JOINED_ON_DEVICE_KEY, "1"))
    .catch(() => {
      /* the phone store is optional */
    });
}

export function hasJoinedOnThisDeviceSync(): boolean {
  try {
    return webStore()?.getItem(JOINED_ON_DEVICE_KEY) === "1";
  } catch {
    return false;
  }
}

export async function hasJoinedOnThisDevice(): Promise<boolean> {
  if (hasJoinedOnThisDeviceSync()) return true;
  if (webStore()) return false;
  try {
    const mod = await import("@react-native-async-storage/async-storage");
    return (await mod.default.getItem(JOINED_ON_DEVICE_KEY)) === "1";
  } catch {
    return false;
  }
}

/** First visit opens the attraction page. A device that already joined opens Login. */
export function doorForUnsignedVisitor(
  hasJoinedHere: boolean,
): typeof ATTRACTION_HREF | typeof RETURNING_LOGIN_HREF {
  return hasJoinedHere ? RETURNING_LOGIN_HREF : ATTRACTION_HREF;
}
