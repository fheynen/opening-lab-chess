"use client";

import { AlertCircle, Check, ChevronRight, FileUp, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { analyzePgn } from "../lib/analysis-client";

type GameListItem = { id: string; white: string; black: string; result: string; opening?: string; eco?: string; analysisStatus: string };

export function AnalyzeDashboard() {
  const [games, setGames] = useState<GameListItem[]>([]);
  const [username, setUsername] = useState("");
  const [maxGames, setMaxGames] = useState(10);
  const [pgn, setPgn] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const loadGames = useCallback(() => fetch("/api/games?limit=100").then(async (response) => await response.json() as { games?: GameListItem[] }).then((data) => setGames(data.games || [])), []);
  useEffect(() => { void loadGames(); }, [loadGames]);

  const importChessCom = async () => {
    setBusy(true); setMessage("");
    try { const response = await fetch("/api/import/chesscom", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, maxGames }) }); const data = await response.json() as { error?: string; added?: number }; if (!response.ok) throw new Error(data.error); setMessage(`${data.added || 0} games added from Chess.com.`); await loadGames(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Import failed."); }
    finally { setBusy(false); }
  };
  const importPgn = async () => {
    setBusy(true); setMessage("");
    try { const response = await fetch("/api/import/pgn", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pgn }) }); const data = await response.json() as { error?: string; added?: number }; if (!response.ok) throw new Error(data.error); const added = data.added || 0; setMessage(`${added} PGN game${added === 1 ? "" : "s"} added.`); setPgn(""); await loadGames(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Import failed."); }
    finally { setBusy(false); }
  };
  const analyze = async (id: string) => {
    setMessage("");
    try { const claim = await fetch(`/api/games/${id}/analysis`, { method: "POST" }); const claimed = await claim.json() as { error?: string; game: { pgn: string; userColor?: string } }; if (!claim.ok) throw new Error(claimed.error); const review = await analyzePgn(claimed.game.pgn, claimed.game.userColor, (value) => setProgress((current) => ({ ...current, [id]: value }))); const saved = await fetch(`/api/games/${id}/review`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(review) }); if (!saved.ok) throw new Error("The review could not be saved."); setMessage("Review complete. Your trends have been updated."); await loadGames(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Analysis failed."); }
    finally { setProgress((current) => { const next = { ...current }; delete next[id]; return next; }); }
  };
  const deleteGame = async (id: string) => { if (!window.confirm("Delete this game and its review?")) return; await fetch(`/api/games/${id}`, { method: "DELETE" }); await loadGames(); };
  const deleteAll = async () => { if (!window.confirm("Delete every imported game, review, and game-derived puzzle? This cannot be undone.")) return; await fetch("/api/games", { method: "DELETE" }); await loadGames(); };

  return <main className="content-page analyze-page">
    <section className="page-intro split"><div><p className="eyebrow">Game review</p><h1>Turn your games into a plan.</h1><p>Import recent games, run private browser analysis, and keep every insight connected to the position that created it.</p></div><Link href="/analyze/insights" className="secondary-action">View your insights <ChevronRight size={16} /></Link></section>
    <section className="import-grid">
      <div className="import-card"><span className="import-icon">♟</span><p className="eyebrow">Automatic import</p><h2>Connect your Chess.com history</h2><p>Opening Lab reads public games only. No Chess.com password is needed.</p><label>Chess.com username<input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="your_username" /></label><label>Recent games<select value={maxGames} onChange={(event) => setMaxGames(Number(event.target.value))}><option value={5}>5 games</option><option value={10}>10 games</option><option value={25}>25 games</option></select></label><button className="primary-action wide" onClick={importChessCom} disabled={busy || !username}>{busy ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />} Sync games</button></div>
      <div className="import-card"><span className="import-icon"><FileUp size={22} /></span><p className="eyebrow">Manual import</p><h2>Paste or upload PGN</h2><p>Use a downloaded Chess.com PGN or any standard chess game.</p><textarea value={pgn} onChange={(event) => setPgn(event.target.value)} placeholder={'[Event "My game"]\n[White "..."]\n\n1. e4 e5 ...'} /><label className="file-button"><FileUp size={16} /> Choose PGN file<input type="file" accept=".pgn,text/plain" onChange={async (event) => { const file = event.target.files?.[0]; if (file) setPgn(await file.text()); }} /></label><button className="secondary-action wide" onClick={importPgn} disabled={busy || !pgn.trim()}>Add PGN</button></div>
    </section>
    {message && <div className="status-message"><AlertCircle size={17} /> {message}</div>}
    <section className="games-section"><div className="section-heading"><div><p className="eyebrow">Saved history</p><h2>Your games</h2></div>{games.length > 0 && <button className="danger-link" onClick={deleteAll}><Trash2 size={15} /> Delete all</button>}</div><div className="game-list">
      {games.map((game) => <article className="game-row" key={game.id}><div className={`status-dot ${game.analysisStatus}`} /><div className="game-players"><strong>{game.white} <span>vs</span> {game.black}</strong><small>{game.eco ? `${game.eco} · ` : ""}{game.opening || "Opening not identified"}</small></div><span className="game-result">{game.result}</span><span className="game-status">{progress[game.id] !== undefined ? `${progress[game.id]}%` : game.analysisStatus === "complete" ? <><Check size={14} /> Reviewed</> : "Ready"}</span>{progress[game.id] !== undefined ? <div className="analysis-progress"><span style={{ width: `${progress[game.id]}%` }} /></div> : game.analysisStatus === "complete" ? <Link href={`/analyze/games/${game.id}`} className="row-action">Open review <ChevronRight size={15} /></Link> : <button className="row-action" onClick={() => analyze(game.id)}>Analyze <ChevronRight size={15} /></button>}<button className="icon-danger" onClick={() => deleteGame(game.id)} aria-label="Delete game"><Trash2 size={15} /></button></article>)}
      {games.length === 0 && <div className="empty-panel"><FileUp size={24} /><h3>No games imported yet</h3><p>Add your recent games above to begin building a personal training history.</p></div>}
    </div></section>
  </main>;
}
