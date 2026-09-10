"use client";

import { ArrowRight, BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { openingPaths, openings, openingsForPath } from "../lib/openings";

export function OpeningsLibrary() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return openings.slice(0, 60);
    return openings.filter((opening) => opening.name.toLowerCase().includes(needle) || opening.eco.toLowerCase().includes(needle)).slice(0, 100);
  }, [query]);

  return <main className="content-page">
    <section className="page-intro"><p className="eyebrow">Opening library</p><h1>Build a repertoire you can recall.</h1><p>Start with a guided path or search all 3,810 Lichess opening lines by name and ECO code.</p></section>
    <section className="path-card-grid">{openingPaths.map((path, index) => <Link href={`/openings/${path.id}`} className="opening-path-card" key={path.id} style={{ "--path-color": path.color } as React.CSSProperties}><span className="path-number">0{index + 1}</span><BookOpen size={21} /><h2>{path.shortTitle}</h2><p>{path.description}</p><span>{openingsForPath(path).length} lines · Play as {path.side === "w" ? "White" : "Black"}</span><strong>Open path <ArrowRight size={15} /></strong></Link>)}</section>
    <section className="database-section"><div className="section-heading"><div><p className="eyebrow">Full database</p><h2>Find any opening</h2></div><span>{openings.length.toLocaleString()} lines</span></div><label className="database-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Sicilian, Queen’s Gambit, B20…" aria-label="Search openings" /></label><div className="database-table" role="list">{results.map((opening) => <Link href={`/openings/database/${encodeURIComponent(opening.id)}`} key={opening.id} role="listitem"><span className="eco-pill">{opening.eco}</span><span><strong>{opening.name}</strong><small>{opening.pgn}</small></span><ArrowRight size={15} /></Link>)}</div></section>
  </main>;
}
