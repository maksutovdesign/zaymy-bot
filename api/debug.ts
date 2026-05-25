/**
 * Temporary debug endpoint — delete after diagnosis
 */
export default async function handler(req: any, res: any) {
  const checks: Record<string, string> = {
    BOT_TOKEN: process.env.BOT_TOKEN ? "SET (" + process.env.BOT_TOKEN.slice(0, 10) + "...)" : "MISSING",
    DATABASE_URL: process.env.DATABASE_URL ? "SET" : "MISSING",
    DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN ? "SET" : "MISSING",
    CRON_SECRET: process.env.CRON_SECRET ? "SET" : "MISSING",
    NODE_VERSION: process.version,
  };

  // Try to import @libsql/client
  try {
    const { createClient } = await import("@libsql/client");
    checks.libsql_import = "OK";
    try {
      createClient({ url: "file::memory:" });
      checks.libsql_createClient = "OK";
    } catch (e: any) {
      checks.libsql_createClient = "FAILED: " + e.message;
    }
  } catch (e: any) {
    checks.libsql_import = "FAILED: " + e.message;
  }

  // Try to import grammy bot
  try {
    await import("grammy");
    checks.grammy_import = "OK";
  } catch (e: any) {
    checks.grammy_import = "FAILED: " + e.message;
  }

  res.status(200).json(checks);
}
