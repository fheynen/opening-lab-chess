"use client";

import { Chess, type Square } from "chess.js";
import { Check, ChevronRight, CircleHelp, RotateCcw, Sparkles } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import puzzlesData from "../data/puzzles.json";
import { getOpeningPath } from "../lib/openings";

export type TrainingPuzzle = { id: string; pathId: string; title: string; fen: string; moves: string[]; rating: number; themes: string[]; openingTags: string[]; sourceUrl?: string; sourceGameId?: string; yourMove?: string };
const catalog = puzzlesData as TrainingPuzzle[];

export function PuzzleTrainer({ pathId, puzzles = catalog.filter((puzzle) => puzzle.pathId === pathId), personal = false }: { pathId: string; puzzles?: TrainingPuzzle[]; personal?: boolean }) {
  const path = getOpeningPath(pathId);
  const [index, setIndex] = useState(0);
  const [ply, setPly] = useState(0);
  const [selected, setSelected] = useState<Square | null>(null);
  const [status, setStatus] = useState<"ready" | "wrong" | "correct" | "complete">("ready");
  const [hint, setHint] = useState(false);
  const puzzle = puzzles[index % Math.max(1, puzzles.length)];
  const position = useMemo(() => {
    if (!puzzle) return new Chess().fen();
    const game = new Chess(puzzle.fen);
    for (let moveIndex = 0; moveIndex < ply; moveIndex += 1) {
      const uci = puzzle.moves[moveIndex];
      game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || "q" });
    }
    return game.fen();
  }, [ply, puzzle]);

  const saveAttempt = useCallback(async (solved: boolean, usedHint: boolean) => {
    if (!puzzle) return;
    try { await fetch("/api/puzzle-attempts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ puzzleId: puzzle.id, pathId: puzzle.pathId, solved, usedHint }) }); } catch { /* Anonymous practice remains usable. */ }
  }, [puzzle]);

  const tryMove = useCallback((from: string, to: string) => {
    if (!puzzle || status === "complete") return false;
    const expected = puzzle.moves[ply];
    if (!expected || expected.slice(0, 2) !== from || expected.slice(2, 4) !== to) {
      setStatus("wrong"); setHint(false); void saveAttempt(false, hint); return false;
    }
    const nextPly = ply + 1;
    if (nextPly >= puzzle.moves.length) { setPly(nextPly); setStatus("complete"); void saveAttempt(true, hint); return true; }
    setPly(nextPly + 1); setStatus(nextPly + 1 >= puzzle.moves.length ? "complete" : "correct"); setSelected(null); setHint(false);
    if (nextPly + 1 >= puzzle.moves.length) void saveAttempt(true, hint);
    return true;
  }, [hint, ply, puzzle, saveAttempt, status]);

  const next = () => { setIndex((value) => (value + 1) % Math.max(1, puzzles.length)); setPly(0); setSelected(null); setStatus("ready"); setHint(false); };
  if (!puzzle) return <div className="empty-panel"><Sparkles size={25} /><h2>No puzzles yet</h2><p>Complete game reviews to create personal drills from your own positions.</p></div>;
  const expected = puzzle.moves[ply];

  return <section className="puzzle-layout">
    <div className="puzzle-board-card"><div className="puzzle-board-heading"><div><span className="eco-pill">{personal ? "Personal" : path.shortTitle}</span><h2>{puzzle.title}</h2></div><span>{index + 1} / {puzzles.length}</span></div><div className="puzzle-board-wrap"><Chessboard options={{ id: `puzzle-${puzzle.id}`, position, boardOrientation: path.side === "w" ? "white" : "black", onPieceDrop: ({ sourceSquare, targetSquare }) => targetSquare ? tryMove(sourceSquare, targetSquare) : false, onSquareClick: ({ square }) => { const clicked = square as Square; if (!selected) setSelected(clicked); else if (!tryMove(selected, clicked)) setSelected(clicked); }, canDragPiece: ({ square }) => square === expected?.slice(0, 2), arrows: hint && expected ? [{ startSquare: expected.slice(0, 2), endSquare: expected.slice(2, 4), color: "rgba(247,188,71,.9)" }] : [], lightSquareStyle: { backgroundColor: "#e7dcc4" }, darkSquareStyle: { backgroundColor: "#769656" }, boardStyle: { borderRadius: "6px", boxShadow: "0 24px 60px rgba(0,0,0,.35)" } }} /></div></div>
    <aside className="puzzle-coach"><p className="eyebrow">Pattern trainer</p><h2>{path.side === "w" ? "White" : "Black"} to move</h2><p>Find the best continuation from a position that commonly appears in this opening.</p><div className="puzzle-meta"><span>Rating <strong>{puzzle.rating}</strong></span><span>Theme <strong>{puzzle.themes[0]}</strong></span></div><div className={`puzzle-feedback ${status}`}>{status === "wrong" ? "That move misses the pattern. Try again." : status === "correct" ? "Correct — now finish the idea." : status === "complete" ? <><Check size={17} /> Pattern complete.</> : "Make your move on the board."}</div>{puzzle.yourMove && <p className="your-move-note">In your game you played <strong>{puzzle.yourMove}</strong>.</p>}<div className="puzzle-actions"><button onClick={() => setHint(true)} disabled={!expected}><CircleHelp size={16} /> Hint</button><button onClick={() => { setPly(0); setStatus("ready"); setHint(false); }}><RotateCcw size={16} /> Restart</button></div><button className="primary-action wide" onClick={next}>Next puzzle <ChevronRight size={17} /></button><small className="source-note">Opening tags: {puzzle.openingTags.join(" · ")}</small></aside>
  </section>;
}

