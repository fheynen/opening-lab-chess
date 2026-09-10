import { games } from "../../../../db/schema";
import { getDb } from "../../../../db";
import { parsePgn, pgnFingerprint, splitPgnCollection } from "../../../lib/game-import";
import { authenticated, ensureProfile } from "../../../lib/server";

export async function POST(request: Request) {
  const auth = await authenticated(); if (!auth.user) return auth.response;
  let pgnText = "";
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData(); const file = form.get("file");
    pgnText = file instanceof File ? await file.text() : String(form.get("pgn") || "");
  } else {
    try { pgnText = String((await request.json() as { pgn?: string }).pgn || ""); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  }
  if (!pgnText.trim()) return Response.json({ error: "Paste PGN text or choose a PGN file." }, { status: 400 });
  if (pgnText.length > 2_000_000) return Response.json({ error: "PGN import is limited to 2 MB." }, { status: 413 });
  const chunks = splitPgnCollection(pgnText).slice(0, 50);
  const parsed = []; const errors: string[] = [];
  for (let index = 0; index < chunks.length; index += 1) {
    try { parsed.push({ ...parsePgn(chunks[index]), providerGameId: await pgnFingerprint(chunks[index]) }); }
    catch { errors.push(`Game ${index + 1} could not be parsed.`); }
  }
  if (!parsed.length) return Response.json({ error: "No valid standard chess games were found.", details: errors }, { status: 400 });
  await ensureProfile(auth.user);
  const db = await getDb(); const now = Date.now();
  for (const game of parsed) await db.insert(games).values({ id: crypto.randomUUID(), userId: auth.user.id, provider: "pgn", ...game, createdAt: now, updatedAt: now }).onConflictDoNothing();
  return Response.json({ added: parsed.length, errors });
}
