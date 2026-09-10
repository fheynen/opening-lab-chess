"use client";

import { ArrowRight, BarChart3, Brain, Sparkles, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Insight = { title: string; detail: string; category: string };
type Data = { gamesReviewed: number; provisional: boolean; overall: { moves: number; bestRate: number; accuracy: number }; strengths: Insight[]; weaknesses: Insight[]; phases: { name: string; moves: number; acpl: number; accuracy: number; errors: number }[]; openings: { opening: string; games: number; accuracy: number }[] };

export function InsightsDashboard() {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => { fetch("/api/insights").then(async (response) => await response.json() as Data).then(setData); }, []);
  if (!data) return <main className="content-page"><div className="empty-panel"><Brain size={25} /><h2>Building your report…</h2></div></main>;
  return <main className="content-page insights-page"><section className="page-intro split"><div><p className="eyebrow">Performance trends</p><h1>Your improvement map.</h1><p>Every claim below is calculated from your reviewed games and linked back to engine-evaluated moves.</p></div><Link href="/analyze/puzzles" className="primary-action">Train your weaknesses <ArrowRight size={16} /></Link></section>
    {data.provisional && <div className="provisional-banner"><Sparkles size={18} /><span><strong>Early signal</strong>Review {Math.max(0, 3 - data.gamesReviewed)} more game{3 - data.gamesReviewed === 1 ? "" : "s"} before these patterns become established trends.</span></div>}
    <section className="insight-summary"><div><small>Games reviewed</small><strong>{data.gamesReviewed}</strong></div><div><small>Average accuracy</small><strong>{data.overall.accuracy}%</strong></div><div><small>Best-move rate</small><strong>{data.overall.bestRate}%</strong></div><div><small>Moves measured</small><strong>{data.overall.moves}</strong></div></section>
    {data.gamesReviewed === 0 ? <div className="empty-panel"><BarChart3 size={25} /><h2>Your report starts with a review</h2><p>Import and analyze at least one game to reveal strengths, weaknesses, and personal drills.</p><Link href="/analyze" className="primary-action">Analyze a game <ArrowRight size={16} /></Link></div> : <>
      <section className="two-column-insights"><div><div className="section-heading"><h2><TrendingUp size={19} /> What is working</h2></div>{data.strengths.map((item) => <article className="insight-card positive" key={item.title}><small>{item.category}</small><h3>{item.title}</h3><p>{item.detail}</p></article>)}</div><div><div className="section-heading"><h2><Target size={19} /> Highest priorities</h2></div>{data.weaknesses.map((item) => <article className="insight-card negative" key={item.title}><small>{item.category}</small><h3>{item.title}</h3><p>{item.detail}</p></article>)}</div></section>
      <section className="trend-tables"><div className="trend-card"><h2>Performance by phase</h2>{data.phases.map((phase) => <div className="trend-row" key={phase.name}><span><strong>{phase.name}</strong><small>{phase.moves} moves · {phase.errors} errors</small></span><span>{phase.accuracy}%<small>{phase.acpl} ACPL</small></span></div>)}</div><div className="trend-card"><h2>Opening results</h2>{data.openings.slice(0, 8).map((opening) => <div className="trend-row" key={opening.opening}><span><strong>{opening.opening}</strong><small>{opening.games} reviewed game{opening.games === 1 ? "" : "s"}</small></span><span>{opening.accuracy}%</span></div>)}</div></section>
    </>}
  </main>;
}
