import { defineConfig } from "drizzle-kit";
import { resolveMysqlDatabaseUrl } from "./lib/mysql-database-url";

const connectionString = resolveMysqlDatabaseUrl();
if (!connectionString) {
  throw new Error(
    "A MySQL connection string is required to run drizzle commands. Set MYSQL_DATABASE_URL or DATABASE_URL to mysql://…",
  );
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
