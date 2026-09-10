import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { gameReviews, games, moveReviews } from "../../../db/schema";
import { authenticated, safeJson } from "../../lib/server";

const errorClasses = new Set(["inaccuracy", "mistake", "blunder"]);
const titleCase = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export async function GET() {
  const auth = await authenticated(); if (!auth.user) return auth.response; const db = await getDb();
  const reviews = await db.select().from(gameReviews).where(eq(gameReviews.userId, auth.user.email));
  const moves = await db.select().from(moveReviews).where(eq(moveReviews.userId, auth.user.email));
  const ownedGames = await db.select().from(games).where(eq(games.userId, auth.user.email)).orderBy(desc(games.playedAt));
  const gamesReviewed = reviews.length; const provisional = gamesReviewed < 3;
  const phase = new Map<string, { moves: number; cp: number; errors: number; accuracy: number }>();
  const motifs = new Map<string, number>(); const classes = new Map<string, number>();
  for (const move of moves) {
    const bucket = phase.get(move.phase) || { moves: 0, cp: 0, errors: 0, accuracy: 0 }; bucket.moves += 1; bucket.cp += move.cpLoss; bucket.accuracy += move.accuracy; if (errorClasses.has(move.classification)) bucket.errors += 1; phase.set(move.phase, bucket);
    classes.set(move.classification, (classes.get(move.classification) || 0) + 1);
    for (const motif of safeJson<string[]>(move.motifsJson, [])) motifs.set(motif, (motifs.get(motif) || 0) + 1);
  }
  const phaseStats = [...phase.entries()].map(([name, value]) => ({ name, moves: value.moves, acpl: value.moves ? Math.round(value.cp / value.moves) : 0, accuracy: value.moves ? Math.round(value.accuracy / value.moves) : 0, errors: value.errors })).sort((a, b) => a.acpl - b.acpl);
  const repeatedMotifs = [...motifs.entries()].filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1]);
  const strengths: { title: string; detail: string; category: string }[] = [];
  const weaknesses: { title: string; detail: string; category: string }[] = [];
  if (phaseStats[0]) strengths.push({ title: `${titleCase(phaseStats[0].name)} play`, detail: `${phaseStats[0].accuracy}% average move accuracy across ${phaseStats[0].moves} moves.`, category: "phase" });
  const weakestPhase = [...phaseStats].reverse().find((item) => item.moves >= 5);
  if (weakestPhase) weaknesses.push({ title: `${titleCase(weakestPhase.name)} accuracy`, detail: `${weakestPhase.errors} errors and ${weakestPhase.acpl} average centipawn loss.`, category: "phase" });
  for (const [motif, count] of repeatedMotifs.slice(0, 4)) weaknesses.push({ title: titleCase(motif), detail: `This pattern appeared in ${count} reviewed mistakes.`, category: "tactic" });
  const totalMoves = moves.length; const bestRate = totalMoves ? Math.round(((classes.get("best") || 0) / totalMoves) * 100) : 0;
  if (totalMoves) strengths.push({ title: `${bestRate}% best-move rate`, detail: `${classes.get("best") || 0} engine-first choices in reviewed positions.`, category: "accuracy" });

  const reviewsByGame = new Map(reviews.map((review) => [review.gameId, review]));
  const openingBuckets = new Map<string, { games: number; accuracy: number }>();
  for (const game of ownedGames) { const review = reviewsByGame.get(game.id); if (!review) continue; const key = game.opening || game.eco || "Unknown opening"; const bucket = openingBuckets.get(key) || { games: 0, accuracy: 0 }; bucket.games += 1; bucket.accuracy += review.accuracy; openingBuckets.set(key, bucket); }
  const openingTrends = [...openingBuckets.entries()].map(([opening, value]) => ({ opening, games: value.games, accuracy: Math.round(value.accuracy / value.games) })).sort((a, b) => b.games - a.games || b.accuracy - a.accuracy);
  const ownDrills = moves.filter((move) => move.classification === "mistake" || move.classification === "blunder").sort((a, b) => b.winDrop - a.winDrop).slice(0, 20).map((move) => ({ id: `game-${move.id}`, pathId: pathForOpening(ownedGames.find((game) => game.id === move.gameId)?.opening), title: `${titleCase(move.phase)} decision · move ${move.moveNumber}`, fen: move.fenBefore, moves: move.bestMoveUci ? [move.bestMoveUci] : [], rating: 1400 + Math.min(600, move.winDrop * 5), themes: safeJson<string[]>(move.motifsJson, [move.phase]), openingTags: [ownedGames.find((game) => game.id === move.gameId)?.opening || "Personal game"], sourceGameId: move.gameId, yourMove: move.san })).filter((drill) => drill.moves.length);
  return Response.json({ gamesReviewed, provisional, overall: { moves: totalMoves, bestRate, accuracy: reviews.length ? Math.round(reviews.reduce((sum, review) => sum + review.accuracy, 0) / reviews.length) : 0 }, strengths, weaknesses, phases: phaseStats, openings: openingTrends, personalPuzzles: ownDrills });
}

function pathForOpening(opening?: string | null) { const value = (opening || "").toLowerCase(); if (value.includes("dutch")) return "dutch"; if (value.includes("french")) return "french"; if (value.includes("scandinav")) return "scandinavian"; if (value.includes("queen")) return "queens-gambit"; return "sicilian"; }
