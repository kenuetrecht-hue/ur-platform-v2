import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStayLoggedIn, setStayLoggedIn } from "../lib/stay-logged-in";

describe("stay logged in", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to staying signed in so opening the app later already has them in", () => {
    expect(getStayLoggedIn()).toBe(true);
  });

  it("remembers when they uncheck stay logged in", () => {
    setStayLoggedIn(false);
    expect(getStayLoggedIn()).toBe(false);
    expect(store.get("ur.stayLoggedIn")).toBe("0");
  });

  it("remembers when they check stay logged in again", () => {
    setStayLoggedIn(false);
    setStayLoggedIn(true);
    expect(getStayLoggedIn()).toBe(true);
    expect(store.get("ur.stayLoggedIn")).toBe("1");
  });
});
