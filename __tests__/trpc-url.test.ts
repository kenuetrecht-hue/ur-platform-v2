import { describe, expect, it } from "vitest";
import { resolveTrpcFetchUrl } from "../lib/trpc-fetch-url";

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
