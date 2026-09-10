"use client";

import { ArrowLeft, Brain } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PuzzleTrainer, type TrainingPuzzle } from "../../components/PuzzleTrainer";

export function PersonalPuzzlePage() {
  const [puzzles, setPuzzles] = useState<TrainingPuzzle[] | null>(null); useEffect(() => { fetch("/api/insights").then(async (response) => await response.json() as { personalPuzzles?: TrainingPuzzle[] }).then((data) => setPuzzles(data.personalPuzzles || [])); }, []);
  return <main className="content-page"><section className="page-intro split"><div><p className="eyebrow">Personal training</p><h1>Replay the moments that matter.</h1><p>Your largest mistakes become fresh positions. Solve the engine move before revealing what happened in the game.</p></div><Link href="/analyze/insights" className="secondary-action"><ArrowLeft size={16} /> Back to insights</Link></section>{puzzles === null ? <div className="empty-panel"><Brain size={25} /><h2>Preparing your drills…</h2></div> : puzzles.length ? <PuzzleTrainer pathId={puzzles[0].pathId} puzzles={puzzles} personal /> : <div className="empty-panel"><Brain size={25} /><h2>No personal positions yet</h2><p>Analyze a game with at least one mistake or blunder and it will appear here automatically.</p><Link href="/analyze" className="primary-action">Review a game</Link></div>}</main>;
}
