"use client";

import { Chess, type Move } from "chess.js";

type Evaluation = { cp: number; mate: number | null; bestMove: string | null; pv: string[]; depth: number };
export type MoveReviewPayload = { ply: number; moveNumber: number; side: string; san: string; uci: string; classification: string; cpLoss: number; winDrop: number; accuracy: number; phase: string; fenBefore: string; bestMoveUci?: string; bestMoveSan?: string; motifs: string[]; pv: string[] };
export type GameReviewPayload = { engineVersion: string; depth: number; accuracy: number; summary: unknown; strengths: string[]; improvements: string[]; moves: MoveReviewPayload[] };

export class BrowserStockfish {
  private worker: Worker;
  private ready: Promise<void>;
  private resolver: ((line: string) => void) | null = null;

  constructor() {
    this.worker = new Worker("/stockfish/stockfish-18-lite-single.js");
    this.worker.onmessage = (event) => this.resolver?.(String(event.data));
    this.ready = this.waitFor("uciok", () => this.worker.postMessage("uci"));
  }

  private waitFor(target: string, start: () => void) {
    return new Promise<void>((resolve) => {
      this.resolver = (line) => { if (line.includes(target)) { this.resolver = null; resolve(); } };
      start();
    });
  }

  async evaluate(fen: string, depth = 12): Promise<Evaluation> {
    await this.ready;
    return new Promise((resolve, reject) => {
      let latest = "";
      const timeout = window.setTimeout(() => { this.worker.postMessage("stop"); this.resolver = null; reject(new Error("Stockfish analysis timed out.")); }, 45_000);
      this.resolver = (line) => {
        if (line.startsWith("info ") && line.includes(" score ") && line.includes(" pv ")) latest = line;
        if (!line.startsWith("bestmove")) return;
        window.clearTimeout(timeout); this.resolver = null;
        const bestMove = line.split(/\s+/)[1] || null;
        const cpMatch = latest.match(/ score cp (-?\d+)/); const mateMatch = latest.match(/ score mate (-?\d+)/); const depthMatch = latest.match(/ depth (\d+)/); const pvMatch = latest.match(/ pv (.+)$/);
        const mate = mateMatch ? Number(mateMatch[1]) : null;
        resolve({ cp: mate !== null ? Math.sign(mate) * 10_000 : Number(cpMatch?.[1] || 0), mate, bestMove: bestMove === "(none)" ? null : bestMove, pv: pvMatch ? pvMatch[1].trim().split(/\s+/).slice(0, 6) : [], depth: Number(depthMatch?.[1] || depth) });
      };
      this.worker.postMessage(`position fen ${fen}`); this.worker.postMessage(`go depth ${depth}`);
    });
  }

  close() { this.worker.terminate(); }
}

export async function analyzePgn(pgn: string, userColor: string | null | undefined, onProgress: (value: number) => void): Promise<GameReviewPayload> {
  const game = new Chess(); game.loadPgn(pgn); const history = game.history({ verbose: true }).slice(0, 400); const engine = new BrowserStockfish();
  try {
    const evaluations: (Evaluation | null)[] = [];
    for (let index = 0; index <= history.length; index += 1) {
      const fen = index === history.length ? (history.at(-1)?.after || new Chess().fen()) : history[index].before;
      const board = new Chess(fen);
      evaluations.push(board.isGameOver() ? null : await engine.evaluate(fen, 12));
      onProgress(Math.round(((index + 1) / (history.length + 1)) * 88));
    }
    const reports: MoveReviewPayload[] = []; const phaseBuckets = new Map<string, { moves: number; cp: number; accuracy: number; errors: number }>(); const classes = new Map<string, number>(); const motifCounts = new Map<string, number>();
    history.forEach((move, index) => {
      const side = move.color === "w" ? "white" : "black"; if (userColor && side !== userColor) return;
      const before = evaluations[index]; if (!before) return; const afterBoard = new Chess(move.after); const after = evaluations[index + 1];
      const cpAfter = afterBoard.isCheckmate() ? 10_000 : afterBoard.isDraw() ? 0 : -(after?.cp || 0); const winBefore = winPercent(before.cp); const winAfter = winPercent(cpAfter); const winDrop = Math.max(0, winBefore - winAfter); const uci = `${move.from}${move.to}${move.promotion || ""}`;
      const classification = uci === before.bestMove ? "best" : winDrop >= 20 ? "blunder" : winDrop >= 10 ? "mistake" : winDrop >= 5 ? "inaccuracy" : "good"; const cpLoss = Math.min(1000, Math.max(0, before.cp - cpAfter)); const accuracy = moveAccuracy(winBefore, winAfter); const phase = detectPhase(new Chess(move.before)); const motifs = detectMotifs(move, before.bestMove, classification);
      let bestMoveSan: string | undefined; if (before.bestMove) { try { const position = new Chess(move.before); bestMoveSan = position.move({ from: before.bestMove.slice(0, 2), to: before.bestMove.slice(2, 4), promotion: before.bestMove[4] || "q" })?.san; } catch { /* Ignore an unusable engine line. */ } }
      reports.push({ ply: index + 1, moveNumber: Math.floor(index / 2) + 1, side, san: move.san, uci, classification, cpLoss, winDrop: Math.round(winDrop), accuracy: Math.round(accuracy), phase, fenBefore: move.before, bestMoveUci: before.bestMove || undefined, bestMoveSan, motifs, pv: before.pv });
      const bucket = phaseBuckets.get(phase) || { moves: 0, cp: 0, accuracy: 0, errors: 0 }; bucket.moves += 1; bucket.cp += cpLoss; bucket.accuracy += accuracy; if (["inaccuracy", "mistake", "blunder"].includes(classification)) bucket.errors += 1; phaseBuckets.set(phase, bucket); classes.set(classification, (classes.get(classification) || 0) + 1); motifs.forEach((motif) => motifCounts.set(motif, (motifCounts.get(motif) || 0) + 1));
    });
    const phases = [...phaseBuckets.entries()].map(([phase, value]) => ({ phase, moves: value.moves, acpl: Math.round(value.cp / value.moves), accuracy: Math.round(value.accuracy / value.moves), errors: value.errors })); const averageAccuracy = reports.length ? Math.round(reports.reduce((sum, report) => sum + report.accuracy, 0) / reports.length) : 0; const strongest = [...phases].sort((a, b) => b.accuracy - a.accuracy)[0]; const weakest = [...phases].filter((item) => item.moves >= 5).sort((a, b) => a.accuracy - b.accuracy)[0]; const recurring = [...motifCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const strengths = [strongest ? `${titleCase(strongest.phase)} was your strongest phase at ${strongest.accuracy}% accuracy.` : "The game is ready for move-by-move review.", `${classes.get("best") || 0} moves matched Stockfish’s first choice.`];
    const improvements = [weakest ? `Prioritize ${weakest.phase} decisions: ${weakest.errors} errors appeared there.` : "Repeat the critical positions until the best move is automatic.", recurring ? `Train the ${titleCase(recurring[0])} pattern, which appeared ${recurring[1]} time${recurring[1] === 1 ? "" : "s"}.` : "Review the largest evaluation swings first."];
    onProgress(100); return { engineVersion: "Stockfish 18 lite", depth: 12, accuracy: averageAccuracy, summary: { classifications: Object.fromEntries(classes), phases, totalMoves: reports.length }, strengths, improvements, moves: reports };
  } finally { engine.close(); }
}

export function winPercent(cp: number) { return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1); }
export function moveAccuracy(before: number, after: number) { const loss = Math.max(0, before - after); return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669)); }
function detectPhase(board: Chess) { let material = 0; const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }; for (const row of board.board()) for (const piece of row) if (piece) material += values[piece.type]; if (material <= 20) return "endgame"; if (board.moveNumber() <= 12) return "opening"; return "middlegame"; }
function detectMotifs(move: Move, bestMove: string | null, classification: string) { if (!["inaccuracy", "mistake", "blunder"].includes(classification)) return []; const motifs: string[] = []; if (move.flags.includes("c") || move.flags.includes("e")) motifs.push("hanging_piece"); if (bestMove) { try { const board = new Chess(move.before); const best = board.move({ from: bestMove.slice(0, 2), to: bestMove.slice(2, 4), promotion: bestMove[4] || "q" }); if (best?.san.includes("+")) motifs.push("missed_tactic"); } catch { /* Best effort motif. */ } } if (!motifs.length) motifs.push("missed_tactic"); return motifs; }
function titleCase(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
