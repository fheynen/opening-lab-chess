import { games, profiles } from "../../../../db/schema";
import { getDb } from "../../../../db";
import { parsePgn } from "../../../lib/game-import";
import { authenticated, ensureProfile } from "../../../lib/server";

export async function POST(request: Request) {
  const auth = await authenticated(); if (!auth.user) return auth.response;
  let body: { username?: string; maxGames?: number; speeds?: string[] };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const username = body.username?.trim().toLowerCase();
  if (!username || !/^[a-z0-9_-]{2,30}$/i.test(username)) return Response.json({ error: "Enter a valid Chess.com username." }, { status: 400 });
  const maxGames = Math.max(1, Math.min(25, Math.floor(body.maxGames || 10)));
  const speeds = new Set((body.speeds || []).map((speed) => speed.toLowerCase()));
  const archiveResponse = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`, { headers: { "user-agent": "Opening-Lab/1.0" } });
  if (archiveResponse.status === 404) return Response.json({ error: `Chess.com user “${username}” was not found.` }, { status: 404 });
  if (archiveResponse.status === 429) return Response.json({ error: "Chess.com is rate limiting requests. Try again shortly." }, { status: 429 });
  if (!archiveResponse.ok) return Response.json({ error: "Chess.com could not be reached." }, { status: 502 });
  const archives = ((await archiveResponse.json()) as { archives?: string[] }).archives || [];
  const imported: Array<Record<string, unknown>> = [];
  for (const archive of [...archives].reverse()) {
    if (imported.length >= maxGames) break;
    const monthResponse = await fetch(archive, { headers: { "user-agent": "Opening-Lab/1.0" } });
      if (!monthResponse.ok) continue;
    const month = await monthResponse.json() as { games?: Array<Record<string, unknown>> };
    for (const item of [...(month.games || [])].reverse()) {
      if (imported.length >= maxGames) break;
      if ((item.rules || "chess") !== "chess") continue;
      if (speeds.size && !speeds.has(String(item.time_class || "").toLowerCase())) continue;
      if (!item.pgn) continue;
      imported.push(item);
    }
  }
  await ensureProfile(auth.user);
  const db = await getDb(); const now = Date.now(); let added = 0;
  for (const item of imported) {
    try {
      const parsed = parsePgn(String(item.pgn), username);
      const result = await db.insert(games).values({ id: crypto.randomUUID(), userId: auth.user.id, provider: "chesscom", providerGameId: String(item.uuid || item.url), url: String(item.url || ""), ...parsed, whiteRating: Number((item.white as { rating?: number })?.rating) || parsed.whiteRating, blackRating: Number((item.black as { rating?: number })?.rating) || parsed.blackRating, speed: String(item.time_class || parsed.speed || ""), playedAt: Number(item.end_time) ? Number(item.end_time) * 1000 : parsed.playedAt, createdAt: now, updatedAt: now }).onConflictDoNothing();
      if ((result as { meta?: { changes?: number } }).meta?.changes !== 0) added += 1;
    } catch { /* Skip one malformed upstream PGN. */ }
  }
  await db.update(profiles).set({ chessComUsername: username, updatedAt: now }).where((await import("drizzle-orm")).eq(profiles.userId, auth.user.id));
  return Response.json({ added, found: imported.length, username });
}
