"use client";

import { BookOpen, Puzzle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { OpeningTrainer } from "../../OpeningTrainer";
import { PuzzleTrainer } from "../../components/PuzzleTrainer";
import { getOpeningPath, openingsForPath } from "../../lib/openings";

export function OpeningWorkspace({ pathId }: { pathId: string }) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"study" | "puzzles">(searchParams.get("tab") === "puzzles" ? "puzzles" : "study");
  const path = getOpeningPath(pathId);
  return <main className="opening-workspace-page"><section className="opening-banner" style={{ "--path-color": path.color } as React.CSSProperties}><div><p className="eyebrow">Guided repertoire · {path.side === "w" ? "White" : "Black"}</p><h1>{path.title}</h1><p>{path.description}</p></div><div className="opening-banner-stat"><strong>{openingsForPath(path).length}</strong><small>study lines</small></div></section><div className="workspace-tabs" role="tablist"><button className={tab === "study" ? "active" : ""} onClick={() => setTab("study")}><BookOpen size={17} /> Study lines</button><button className={tab === "puzzles" ? "active" : ""} onClick={() => setTab("puzzles")}><Puzzle size={17} /> Opening puzzles</button></div>{tab === "study" ? <OpeningTrainer initialPathId={path.id} /> : <PuzzleTrainer pathId={path.id} />}</main>;
}

