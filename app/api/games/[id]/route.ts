import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { gameReviews, games, moveReviews } from "../../../../db/schema";
import { authenticated, safeJson } from "../../../lib/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticated(); if (!auth.user) return auth.response; const { id } = await params; const db = await getDb();
  const game = await db.select().from(games).where(and(eq(games.id, id), eq(games.userId, auth.user.email))).get();
  if (!game) return Response.json({ error: "Game not found." }, { status: 404 });
  const review = await db.select().from(gameReviews).where(and(eq(gameReviews.gameId, id), eq(gameReviews.userId, auth.user.email))).get();
  const moves = review ? await db.select().from(moveReviews).where(and(eq(moveReviews.gameId, id), eq(moveReviews.userId, auth.user.email))).orderBy(moveReviews.ply) : [];
  return Response.json({ game, review: review ? { ...review, summary: safeJson(review.summaryJson, {}), strengths: safeJson(review.strengthsJson, []), improvements: safeJson(review.improvementsJson, []) } : null, moves: moves.map((move) => ({ ...move, motifs: safeJson(move.motifsJson, []), pv: safeJson(move.pvJson, []) })) });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticated(); if (!auth.user) return auth.response; const { id } = await params;
  await (await getDb()).delete(games).where(and(eq(games.id, id), eq(games.userId, auth.user.email)));
  return Response.json({ deleted: true });
}
