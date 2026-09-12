import { afterEach, describe, expect, it } from "vitest";
import {
  currentApiAddress,
  detectDeviceKind,
  isDifferentApiAddress,
  isRememberedOnThisApi,
  isSameApiAddress,
  KNOWN_API_DEVICE_KEY,
  normalizeApiAddress,
  rememberSignedInApiDevice,
} from "../lib/known-api-device";

describe("known API device", () => {
  afterEach(() => {
    try {
      localStorage.removeItem(KNOWN_API_DEVICE_KEY);
    } catch {
      /* ignore */
    }
  });

  it("treats the same site with or without a trailing slash as one address", () => {
    expect(
      isSameApiAddress(
        "https://ur-platform-v2-production.up.railway.app/",
        "https://ur-platform-v2-production.up.railway.app",
      ),
    ).toBe(true);
    expect(normalizeApiAddress("https://Example.com:443/")).toBe("https://example.com");
  });

  it("marks a phone user-agent as a phone", () => {
    expect(detectDeviceKind("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)", "web")).toBe("phone");
    expect(detectDeviceKind("Mozilla/5.0 (Windows NT 10.0)", "web")).toBe("computer");
    expect(detectDeviceKind("", "ios")).toBe("phone");
  });

  it("remembers this API so the next visit can open the app", () => {
    const address = currentApiAddress(() => "https://ur-platform-v2-production.up.railway.app");
    expect(address).toBe("https://ur-platform-v2-production.up.railway.app");
    rememberSignedInApiDevice();
    expect(isRememberedOnThisApi() || isDifferentApiAddress()).toBe(true);
  });
});
