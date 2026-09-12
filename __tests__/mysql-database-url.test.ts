import { describe, expect, it } from "vitest";
import {
  mysqlDatabaseUrlWarning,
  mysqlUrlFromRailwayPieces,
  resolveMysqlDatabaseUrl,
} from "../lib/mysql-database-url";

describe("MySQL database URL resolver", () => {
  it("ignores a Postgres DATABASE_URL and uses MYSQL_DATABASE_URL", () => {
    const url = resolveMysqlDatabaseUrl({
      DATABASE_URL: "postgresql://railway:pw@postgres.railway.internal:5432/railway",
      MYSQL_DATABASE_URL: "mysql://app:secret@mysql.example:3306/ur_platform",
    });
    expect(url).toBe("mysql://app:secret@mysql.example:3306/ur_platform");
  });

  it("ignores a random non-MySQL DATABASE_URL", () => {
    expect(
      resolveMysqlDatabaseUrl({
        DATABASE_URL: "not-a-real-database-url",
      }),
    ).toBeNull();
    expect(
      mysqlDatabaseUrlWarning({
        DATABASE_URL: "not-a-real-database-url",
      }),
    ).toMatch(/mysql:\/\//i);
  });

  it("builds a URL from Railway MySQL plugin pieces", () => {
    expect(
      mysqlUrlFromRailwayPieces({
        MYSQLHOST: "mysql.railway.internal",
        MYSQLUSER: "root",
        MYSQLPASSWORD: "pw",
        MYSQLDATABASE: "railway",
        MYSQLPORT: "3306",
      }),
    ).toBe("mysql://root:pw@mysql.railway.internal:3306/railway");
  });

  it("warns when only Postgres is set", () => {
    const warning = mysqlDatabaseUrlWarning({
      DATABASE_URL: "postgres://railway:pw@postgres.railway.internal:5432/railway",
    });
    expect(warning).toMatch(/Postgres/i);
    expect(warning).toMatch(/MYSQL_DATABASE_URL/);
  });
});
