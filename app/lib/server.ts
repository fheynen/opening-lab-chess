import { getCurrentUser } from "./auth";
import { getDb } from "../../db";
import { profiles } from "../../db/schema";

export async function authenticated() {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: Response.json({ error: "Sign in to continue." }, { status: 401 }) };
  return { user, response: null };
}

export async function ensureProfile(user: { id: string; displayName: string }) {
  const now = Date.now();
  await (await getDb()).insert(profiles).values({ userId: user.id, displayName: user.displayName, createdAt: now, updatedAt: now }).onConflictDoUpdate({ target: profiles.userId, set: { displayName: user.displayName, updatedAt: now } });
}

export function safeJson<T>(value: string | null | undefined, fallback: T): T {
  try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}

export function parseLimit(value: string | null, fallback = 20, cap = 100) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(cap, Math.floor(parsed))) : fallback;
}
