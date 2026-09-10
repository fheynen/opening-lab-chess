"use client";

import { ArrowRight, BarChart3, BookOpen, FileSearch, Puzzle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Snapshot = { gamesReviewed: number; topStrength?: string; topFocus?: string; recentGame?: { id: string; white: string; black: string; result: string } };

export function HomeDashboard({ signedIn }: { signedIn: boolean }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  useEffect(() => {
    if (!signedIn) return;
    Promise.all([
      fetch("/api/insights").then((response) => response.ok ? response.json() : null),
      fetch("/api/games?limit=1").then((response) => response.ok ? response.json() : null),
    ]).then(([insightsValue, gamesValue]) => {
      const insights = insightsValue as { gamesReviewed?: number; strengths?: { title: string }[]; weaknesses?: { title: string }[] } | null;
      const games = gamesValue as { games?: Snapshot["recentGame"][] } | null;
      setSnapshot({ gamesReviewed: insights?.gamesReviewed ?? 0, topStrength: insights?.strengths?.[0]?.title, topFocus: insights?.weaknesses?.[0]?.title, recentGame: games?.games?.[0] });
    }).catch(() => setSnapshot({ gamesReviewed: 0 }));
  }, [signedIn]);

  return <main className="home-page">
    <section className="hero-section">
      <div className="hero-copy">
        <p className="eyebrow">Your chess improvement system</p>
        <h1>Study the opening.<br /><span>Fix the patterns.</span></h1>
        <p className="hero-lead">Build a repertoire, practice the positions that matter, and turn your own games into a focused training plan.</p>
        <div className="hero-actions"><Link href="/openings/sicilian" className="primary-action">Continue training <ArrowRight size={17} /></Link><Link href="/analyze" className="secondary-action">Review a game</Link></div>
        <div className="hero-proof"><span><strong>3,810</strong> opening lines</span><span><strong>5</strong> guided repertoires</span><span><strong>Private</strong> browser analysis</span></div>
      </div>
      <div className="hero-board" aria-label="Opening Lab training preview">
        <div className="board-orbit orbit-one" /><div className="board-orbit orbit-two" />
        <div className="mini-board" aria-hidden="true">{Array.from({ length: 64 }, (_, index) => <span key={index} className={(Math.floor(index / 8) + index) % 2 ? "dark" : "light"} />)}<span className="hero-piece knight">♞</span><span className="hero-piece pawn">♙</span><span className="hero-piece queen">♛</span></div>
        <div className="floating-coach"><Sparkles size={16} /><span><strong>Next focus</strong>Resolve central tension</span></div>
      </div>
    </section>

    {signedIn && <section className="snapshot-strip" aria-label="Your training snapshot"><div><small>Games reviewed</small><strong>{snapshot?.gamesReviewed ?? "—"}</strong></div><div><small>Current strength</small><strong>{snapshot?.topStrength ?? "Analyze games to discover it"}</strong></div><div><small>Next focus</small><strong>{snapshot?.topFocus ?? "Your first review"}</strong></div>{snapshot?.recentGame && <Link href={`/analyze/games/${snapshot.recentGame.id}`}>Resume latest review <ArrowRight size={15} /></Link>}</section>}

    <section className="feature-grid" aria-label="Opening Lab applications">
      <Link href="/openings" className="feature-card feature-openings"><span className="feature-icon"><BookOpen size={22} /></span><small>Learn</small><h2>Opening library</h2><p>Search every ECO line or follow one of five practical repertoire paths.</p><span className="card-link">Explore openings <ArrowRight size={15} /></span></Link>
      <Link href="/openings/sicilian?tab=puzzles" className="feature-card feature-puzzles"><span className="feature-icon"><Puzzle size={22} /></span><small>Practice</small><h2>Opening puzzles</h2><p>Recognize the tactics, structures, and move-order patterns inside each opening.</p><span className="card-link">Solve positions <ArrowRight size={15} /></span></Link>
      <Link href="/analyze" className="feature-card feature-analyze"><span className="feature-icon"><FileSearch size={22} /></span><small>Review</small><h2>Analyze your games</h2><p>Import from Chess.com or paste PGN, then review every critical decision.</p><span className="card-link">Import games <ArrowRight size={15} /></span></Link>
      <Link href="/analyze/puzzles" className="feature-card feature-personal"><span className="feature-icon"><BarChart3 size={22} /></span><small>Improve</small><h2>Personal training</h2><p>Turn recurring mistakes into a queue of drills made specifically for you.</p><span className="card-link">View training plan <ArrowRight size={15} /></span></Link>
    </section>
  </main>;
}
