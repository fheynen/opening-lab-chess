import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { gameReviews, games, moveReviews } from "../../../../../db/schema";
import { authenticated } from "../../../../lib/server";

type SubmittedMove = { ply: number; moveNumber: number; side: string; san: string; uci: string; classification: string; cpLoss: number; winDrop: number; accuracy: number; phase: string; fenBefore: string; bestMoveUci?: string; bestMoveSan?: string; motifs?: string[]; pv?: string[] };

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticated(); if (!auth.user) return auth.response; const { id } = await params; const db = await getDb();
  const game = await db.select().from(games).where(and(eq(games.id, id), eq(games.userId, auth.user.id))).get();
  if (!game) return Response.json({ error: "Game not found." }, { status: 404 });
  let body: { engineVersion?: string; depth?: number; accuracy?: number; summary?: unknown; strengths?: unknown[]; improvements?: unknown[]; moves?: SubmittedMove[] };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid review." }, { status: 400 }); }
  if (!Array.isArray(body.moves) || body.moves.length > 400 || !Number.isFinite(body.accuracy)) return Response.json({ error: "Review data is incomplete." }, { status: 400 });
  await db.delete(moveReviews).where(eq(moveReviews.gameId, id)); await db.delete(gameReviews).where(eq(gameReviews.gameId, id));
  await db.insert(gameReviews).values({ gameId: id, userId: auth.user.id, engineVersion: String(body.engineVersion || "Stockfish 18 lite"), depth: Math.max(1, Math.min(30, Number(body.depth || 12))), accuracy: Math.round(Number(body.accuracy)), summaryJson: JSON.stringify(body.summary || {}), strengthsJson: JSON.stringify(body.strengths || []), improvementsJson: JSON.stringify(body.improvements || []), createdAt: Date.now() });
  if (body.moves.length) await db.insert(moveReviews).values(body.moves.map((move) => ({ id: crypto.randomUUID(), gameId: id, userId: auth.user!.id, ply: Math.round(move.ply), moveNumber: Math.round(move.moveNumber), side: String(move.side), san: String(move.san), uci: String(move.uci), classification: String(move.classification), cpLoss: Math.max(0, Math.round(move.cpLoss)), winDrop: Math.max(0, Math.round(move.winDrop)), accuracy: Math.max(0, Math.min(100, Math.round(move.accuracy))), phase: String(move.phase), fenBefore: String(move.fenBefore), bestMoveUci: move.bestMoveUci || null, bestMoveSan: move.bestMoveSan || null, motifsJson: JSON.stringify(move.motifs || []), pvJson: JSON.stringify((move.pv || []).slice(0, 6)) })));
  await db.update(games).set({ analysisStatus: "complete", analysisError: null, updatedAt: Date.now() }).where(eq(games.id, id));
  return Response.json({ saved: true });
}
