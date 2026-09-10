import { describe, expect, it } from "vitest";
import { resolveTrpcFetchUrl, resolveTrpcApiUrl } from "../lib/trpc-fetch-url";

const API = "http://localhost:3000/api/trpc";

describe("resolveTrpcFetchUrl", () => {
  it("rewrites Metro :8082 requests onto the Express API", () => {
    expect(
      resolveTrpcFetchUrl(
        "http://localhost:8082/api/trpc/auth.connectivity?batch=1",
        API,
      ),
    ).toBe("http://localhost:3000/api/trpc/auth.connectivity?batch=1");
  });

  it("recovers when a function url was stringified by tRPC", () => {
    const broken =
      '() => {\n          return `${base || "http://localhost:3000"}/api/trpc`;\n        }/auth.turnstileConfig,auth.connectivity?batch=1';
    expect(resolveTrpcFetchUrl(broken, API)).toBe(
      "http://localhost:3000/api/trpc/auth.turnstileConfig,auth.connectivity?batch=1",
    );
  });

  it("leaves a correct API url unchanged", () => {
    const good = "http://localhost:3000/api/trpc/auth.connectivity?batch=1";
    expect(resolveTrpcFetchUrl(good, API)).toBe(good);
  });
});

describe("resolveTrpcApiUrl", () => {
  it("uses the live page origin when the website and API share a host", () => {
    expect(resolveTrpcApiUrl("", "https://ur-app.up.railway.app")).toBe(
      "https://ur-app.up.railway.app/api/trpc",
    );
    expect(resolveTrpcApiUrl("", "https://urplatform.llc")).toBe(
      "https://urplatform.llc/api/trpc",
    );
  });

  it("keeps an explicit API base for the native app", () => {
    expect(resolveTrpcApiUrl("https://urplatform.llc")).toBe(
      "https://urplatform.llc/api/trpc",
    );
  });
});
