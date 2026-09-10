import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { openingProgress, profiles } from "../../../db/schema";
import { authenticated, ensureProfile } from "../../lib/server";

export async function GET() {
  const auth = await authenticated(); if (!auth.user) return auth.response;
  const rows = await (await getDb()).select({ openingId: openingProgress.openingId }).from(openingProgress).where(eq(openingProgress.userId, auth.user.id));
  return Response.json({ completed: rows.map((row) => row.openingId) });
}

export async function POST(request: Request) {
  const auth = await authenticated(); if (!auth.user) return auth.response;
  let body: { completed?: string[] };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid progress." }, { status: 400 }); }
  const completed = [...new Set((body.completed || []).filter((id) => typeof id === "string" && id.length <= 160))].slice(0, 5000);
  await ensureProfile(auth.user); const db = await getDb(); const now = Date.now();
  for (const openingId of completed) await db.insert(openingProgress).values({ userId: auth.user.id, openingId, completedAt: now }).onConflictDoNothing();
  await db.update(profiles).set({ localProgressMigrated: true, updatedAt: now }).where(eq(profiles.userId, auth.user.id));
  return Response.json({ saved: completed.length });
}
