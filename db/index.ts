import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export async function getDb() {
  const testBinding = (globalThis as typeof globalThis & { __OPENING_LAB_TEST_DB?: D1Database }).__OPENING_LAB_TEST_DB;
  if (testBinding) return drizzle(testBinding, { schema });
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}
