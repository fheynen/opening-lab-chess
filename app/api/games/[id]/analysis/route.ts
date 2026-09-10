import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { games } from "../../../../../db/schema";
import { authenticated } from "../../../../lib/server";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticated(); if (!auth.user) return auth.response; const { id } = await params; const db = await getDb();
  const game = await db.select().from(games).where(and(eq(games.id, id), eq(games.userId, auth.user.email))).get();
  if (!game) return Response.json({ error: "Game not found." }, { status: 404 });
  if (game.analysisStatus === "complete") return Response.json({ error: "This game is already analyzed." }, { status: 409 });
  await db.update(games).set({ analysisStatus: "analyzing", analysisError: null, updatedAt: Date.now() }).where(eq(games.id, id));
  return Response.json({ game: { id: game.id, pgn: game.pgn, userColor: game.userColor, white: game.white, black: game.black }, engine: { version: "Stockfish 18 lite", depth: 12, maxPlies: 400 } });
}
