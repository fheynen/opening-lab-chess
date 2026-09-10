import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { puzzleAttempts } from "../../../db/schema";
import { authenticated } from "../../lib/server";

export async function GET() {
  const auth = await authenticated(); if (!auth.user) return auth.response;
  const attempts = await (await getDb()).select().from(puzzleAttempts).where(eq(puzzleAttempts.userId, auth.user.id)).orderBy(desc(puzzleAttempts.attemptedAt)).limit(200);
  return Response.json({ attempts });
}

export async function POST(request: Request) {
  const auth = await authenticated(); if (!auth.user) return auth.response;
  let body: { puzzleId?: string; pathId?: string; solved?: boolean; usedHint?: boolean };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid attempt." }, { status: 400 }); }
  if (!body.puzzleId || body.puzzleId.length > 160) return Response.json({ error: "Invalid puzzle." }, { status: 400 });
  await (await getDb()).insert(puzzleAttempts).values({ id: crypto.randomUUID(), userId: auth.user.id, puzzleId: body.puzzleId, pathId: body.pathId, solved: Boolean(body.solved), usedHint: Boolean(body.usedHint), attemptedAt: Date.now() });
  return Response.json({ saved: true });
}
