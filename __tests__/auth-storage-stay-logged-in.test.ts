import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock("react-native", () => ({
  Platform: { OS: "web" },
}));

vi.mock("../lib/supabase-auth-storage", () => ({
  isWebBrowserStorageAvailable: () => true,
}));

import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, clearAuthStorage, setAccessToken, setRefreshToken } from "../lib/auth-storage";
import { setStayLoggedIn } from "../lib/stay-logged-in";

function memoryStore() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

describe("auth storage stay logged in", () => {
  const local = memoryStore();
  const session = memoryStore();

  beforeEach(() => {
    local.data.clear();
    session.data.clear();
    vi.stubGlobal("localStorage", local);
    vi.stubGlobal("sessionStorage", session);
  });

  afterEach(async () => {
    await clearAuthStorage();
    vi.unstubAllGlobals();
  });

  it("keeps the sign-in tokens after the browser closes when stay logged in is on", async () => {
    setStayLoggedIn(true);
    await setAccessToken("access-token");
    await setRefreshToken("refresh-token");
    expect(local.data.get(ACCESS_TOKEN_KEY)).toBe("access-token");
    expect(local.data.get(REFRESH_TOKEN_KEY)).toBe("refresh-token");
    expect(session.data.has(ACCESS_TOKEN_KEY)).toBe(false);
  });

  it("forgets the tokens when the tab closes if stay logged in is off", async () => {
    setStayLoggedIn(false);
    await setAccessToken("access-token");
    await setRefreshToken("refresh-token");
    expect(session.data.get(ACCESS_TOKEN_KEY)).toBe("access-token");
    expect(session.data.get(REFRESH_TOKEN_KEY)).toBe("refresh-token");
    expect(local.data.has(ACCESS_TOKEN_KEY)).toBe(false);
    expect(local.data.has(REFRESH_TOKEN_KEY)).toBe(false);
  });
});
