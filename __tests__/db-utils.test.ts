import { describe, it, expect } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { normalizeDatabaseUrl, parseDatabaseName } = require("../scripts/db-utils");

describe("db-utils", () => {
  it("normalizes localhost to 127.0.0.1 for MySQL URLs", () => {
    expect(normalizeDatabaseUrl("mysql://root:@localhost:3306/ur_platform")).toBe(
      "mysql://root:@127.0.0.1:3306/ur_platform",
    );
  });

  it("parses database name from connection URL", () => {
    expect(parseDatabaseName("mysql://root:@127.0.0.1:3306/ur_platform")).toBe("ur_platform");
  });
});
