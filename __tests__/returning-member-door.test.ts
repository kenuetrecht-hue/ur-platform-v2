import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import {
  ADVERTISEMENT_ATTRACTION_URL,
  JOINED_ON_DEVICE_KEY,
  doorForUnsignedVisitor,
  hasJoinedOnThisDeviceSync,
  rememberJoinedOnThisDevice,
} from "../lib/returning-member-door";

describe("returning member door", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends ads to the attraction page and keeps Login for people who already joined", () => {
    expect(ADVERTISEMENT_ATTRACTION_URL).toBe("https://urplatform.llc/welcome");
    expect(doorForUnsignedVisitor(false)).toBe("/welcome");
    expect(doorForUnsignedVisitor(true)).toBe("/login");
    expect(hasJoinedOnThisDeviceSync()).toBe(false);
    rememberJoinedOnThisDevice();
    expect(hasJoinedOnThisDeviceSync()).toBe(true);
    expect(doorForUnsignedVisitor(hasJoinedOnThisDeviceSync())).toBe("/login");
  });

  it("leaves the redesigned login page in place and does not send ads to /login", () => {
    const login = readFileSync("app/(auth)/login.tsx", "utf8");
    expect(login).toContain("85%, 15% split");
    expect(login).toContain("ATTRACTION_HREF");
    expect(ADVERTISEMENT_ATTRACTION_URL.endsWith("/login")).toBe(false);
    const welcome = readFileSync("components/techno-futurist-experience.tsx", "utf8");
    expect(welcome).not.toContain("doorForUnsignedVisitor");
  });
});
