import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { games } from "../../../db/schema";
import { authenticated, parseLimit } from "../../lib/server";

export async function GET(request: Request) {
  const auth = await authenticated(); if (!auth.user) return auth.response;
  const url = new URL(request.url); const limit = parseLimit(url.searchParams.get("limit"), 20, 100); const status = url.searchParams.get("status");
  const rows = await (await getDb()).select({ id: games.id, provider: games.provider, url: games.url, white: games.white, black: games.black, result: games.result, userColor: games.userColor, speed: games.speed, opening: games.opening, eco: games.eco, playedAt: games.playedAt, analysisStatus: games.analysisStatus, analysisError: games.analysisError }).from(games).where(status ? and(eq(games.userId, auth.user.email), eq(games.analysisStatus, status)) : eq(games.userId, auth.user.email)).orderBy(desc(games.playedAt), desc(games.createdAt)).limit(limit);
  return Response.json({ games: rows });
}

export async function DELETE() {
  const auth = await authenticated(); if (!auth.user) return auth.response;
  await (await getDb()).delete(games).where(eq(games.userId, auth.user.email));
  return Response.json({ deleted: true });
}
