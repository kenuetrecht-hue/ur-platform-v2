/**
 * This app talks to MySQL / TiDB only (drizzle-orm/mysql2).
 * Railway often injects a postgresql:// value into DATABASE_URL — ignore that.
 */

export function isMysqlConnectionUrl(url: string): boolean {
  return url.startsWith("mysql://") || url.startsWith("mysql2://");
}

export function isPostgresConnectionUrl(url: string): boolean {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

/** Prefer IPv4 on Windows — localhost often resolves to ::1 while MySQL listens on 127.0.0.1. */
export function normalizeDatabaseUrl(url: string): string {
  return url.replace(/@localhost(?=[:/])/g, "@127.0.0.1");
}

function readEnv(envMap: NodeJS.ProcessEnv, name: string): string {
  return envMap[name]?.trim() ?? "";
}

/** Build mysql://… from Railway's split MySQL plugin variables. */
export function mysqlUrlFromRailwayPieces(envMap: NodeJS.ProcessEnv = process.env): string | null {
  const host = readEnv(envMap, "MYSQLHOST");
  const user = readEnv(envMap, "MYSQLUSER");
  const database = readEnv(envMap, "MYSQLDATABASE");
  const password = envMap.MYSQLPASSWORD ?? "";
  const port = readEnv(envMap, "MYSQLPORT") || "3306";
  if (!host || !user || !database) return null;
  return normalizeDatabaseUrl(
    `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`,
  );
}

/**
 * First mysql:// URL that is actually usable.
 * Order: MYSQL_DATABASE_URL, TIDB_DATABASE_URL, MYSQL_URL, DATABASE_URL, then Railway pieces.
 */
export function resolveMysqlDatabaseUrl(envMap: NodeJS.ProcessEnv = process.env): string | null {
  const named = [
    readEnv(envMap, "MYSQL_DATABASE_URL"),
    readEnv(envMap, "TIDB_DATABASE_URL"),
    readEnv(envMap, "MYSQL_URL"),
    readEnv(envMap, "DATABASE_URL"),
  ];
  for (const url of named) {
    if (isMysqlConnectionUrl(url)) return normalizeDatabaseUrl(url);
  }
  return mysqlUrlFromRailwayPieces(envMap);
}

export function mysqlDatabaseUrlWarning(envMap: NodeJS.ProcessEnv = process.env): string | null {
  if (resolveMysqlDatabaseUrl(envMap)) return null;
  const databaseUrl = readEnv(envMap, "DATABASE_URL");
  if (isPostgresConnectionUrl(databaseUrl)) {
    return (
      "[Database] DATABASE_URL is a Postgres string (postgresql://…). " +
        "This project uses drizzle-orm/mysql2 — that URL will not work. " +
        "Leave it if Railway added Postgres, and set MYSQL_DATABASE_URL to a mysql://… string " +
        "(or add a Railway MySQL database). Example: mysql://user:pass@host:3306/ur_platform"
    );
  }
  if (databaseUrl) {
    return (
      "[Database] DATABASE_URL must be a MySQL connection string (mysql://…). " +
        "This project uses drizzle-orm/mysql2 — a postgresql:// URL will not work. " +
        "Example: mysql://root:@127.0.0.1:3306/ur_platform"
    );
  }
  return null;
}
