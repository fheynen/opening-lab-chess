import { Chess } from "chess.js";

export type ImportedGame = {
  providerGameId: string; url?: string; pgn: string; white: string; black: string; result: string;
  userColor?: string; whiteRating?: number; blackRating?: number; speed?: string; opening?: string; eco?: string; playedAt?: number;
};

export function parsePgn(pgn: string, username?: string): Omit<ImportedGame, "providerGameId"> {
  const chess = new Chess();
  chess.loadPgn(pgn.trim());
  const headers = chess.getHeaders();
  const white = headers.White || "White";
  const black = headers.Black || "Black";
  const normalized = username?.trim().toLowerCase();
  const userColor = normalized && white.toLowerCase() === normalized ? "white" : normalized && black.toLowerCase() === normalized ? "black" : undefined;
  const parsedDate = headers.UTCDate || headers.Date;
  const parsedTime = parsedDate && /^\d{4}\.\d{2}\.\d{2}$/.test(parsedDate) ? Date.parse(parsedDate.replaceAll(".", "-") + "T00:00:00Z") : undefined;
  return { pgn: pgn.trim(), white, black, result: headers.Result || "*", userColor, whiteRating: numberOrUndefined(headers.WhiteElo), blackRating: numberOrUndefined(headers.BlackElo), speed: headers.TimeControl, opening: headers.Opening, eco: headers.ECO, playedAt: parsedTime };
}

export function splitPgnCollection(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return [];
  const starts = [...trimmed.matchAll(/(?=\[Event\s+["'])/g)].map((match) => match.index ?? 0);
  if (starts.length <= 1) return [trimmed];
  return starts.map((start, index) => trimmed.slice(start, starts[index + 1] ?? trimmed.length).trim()).filter(Boolean);
}

export async function pgnFingerprint(pgn: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pgn.trim()));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function numberOrUndefined(value?: string) { const number = Number(value); return Number.isFinite(number) ? number : undefined; }

