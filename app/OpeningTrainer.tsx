"use client";

import { Chess, type Color, type Move, type Square } from "chess.js";
import {
  BookOpen,
  Brain,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Database,
  Flame,
  GraduationCap,
  RotateCcw,
  Search,
  Shuffle,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import openingsData from "./data/openings.json";

type Opening = {
  id: string;
  eco: string;
  name: string;
  pgn: string;
};

type StudyPath = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  color: string;
  side: Color;
  matches: (opening: Opening) => boolean;
};

type Feedback = {
  kind: "idle" | "correct" | "wrong" | "hint" | "auto" | "complete";
  text: string;
};

const openings = openingsData as Opening[];
const START_FEN = new Chess().fen();

const studyPaths: StudyPath[] = [
  {
    id: "sicilian",
    title: "Master the Sicilian",
    shortTitle: "Sicilian Defense",
    description: "Fight 1.e4 with active, asymmetric positions.",
    color: "#91b553",
    side: "b",
    matches: (opening) => opening.name.startsWith("Sicilian Defense"),
  },
  {
    id: "dutch",
    title: "Build a Dutch Defense",
    shortTitle: "Dutch Defense",
    description: "Meet 1.d4 with an ambitious kingside plan.",
    color: "#dfa84b",
    side: "b",
    matches: (opening) => opening.name.startsWith("Dutch Defense"),
  },
  {
    id: "french",
    title: "Counter the French",
    shortTitle: "vs. French Defense",
    description: "Create a reliable White repertoire after 1...e6.",
    color: "#b891d3",
    side: "w",
    matches: (opening) => opening.name.startsWith("French Defense"),
  },
  {
    id: "scandinavian",
    title: "Punish the Scandinavian",
    shortTitle: "vs. 1.e4 d5",
    description: "Learn the principled responses to an early ...d5.",
    color: "#66a9cc",
    side: "w",
    matches: (opening) => opening.name.startsWith("Scandinavian Defense"),
  },
  {
    id: "queens-gambit",
    title: "Challenge 1.d4 d5",
    shortTitle: "Queen’s Gambit",
    description: "Pressure Black’s center with the classic 2.c4.",
    color: "#d47a68",
    side: "w",
    matches: (opening) => opening.name.startsWith("Queen's Gambit"),
  },
];

function movesFor(opening: Opening): Move[] {
  try {
    const game = new Chess();
    game.loadPgn(opening.pgn);
    return game.history({ verbose: true });
  } catch {
    return [];
  }
}

function cleanVariationName(opening: Opening) {
  const [, variation] = opening.name.split(": ", 2);
  return variation || opening.name;
}

function sideName(side: Color) {
  return side === "w" ? "White" : "Black";
}

export function OpeningTrainer() {
  const [activePathId, setActivePathId] = useState("sicilian");
  const activePath =
    studyPaths.find((path) => path.id === activePathId) ?? studyPaths[0];
  const pathOpenings = useMemo(
    () => openings.filter(activePath.matches),
    [activePath],
  );
  const [selectedOpening, setSelectedOpening] = useState<Opening>(() =>
    openings.find(studyPaths[0].matches) ?? openings[0],
  );
  const lineMoves = useMemo(
    () => movesFor(selectedOpening),
    [selectedOpening],
  );
  const [moveIndex, setMoveIndex] = useState(0);
  const [practiceSide, setPracticeSide] = useState<Color>(activePath.side);
  const [orientation, setOrientation] = useState<"white" | "black">("black");
  const [mode, setMode] = useState<"practice" | "explore">("practice");
  const [feedback, setFeedback] = useState<Feedback>({
    kind: "idle",
    text: "Your opponent will make the first move.",
  });
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [databaseMode, setDatabaseMode] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);

  const currentMove = lineMoves[moveIndex];
  const currentFen =
    moveIndex === 0 ? START_FEN : lineMoves[moveIndex - 1]?.after || START_FEN;
  const isComplete = lineMoves.length > 0 && moveIndex >= lineMoves.length;
  const isUserTurn = currentMove?.color === practiceSide;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setCompleted(
          JSON.parse(localStorage.getItem("opening-lab-completed") || "[]"),
        );
        setStreak(Number(localStorage.getItem("opening-lab-streak") || "0"));
      } catch {
        // A blocked storage API should never block the trainer itself.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isComplete || completed.includes(selectedOpening.id)) return;
    const timer = window.setTimeout(() => {
      const next = [...completed, selectedOpening.id];
      setCompleted(next);
      setStreak((value) => {
        const updated = value + 1;
        try {
          localStorage.setItem("opening-lab-streak", String(updated));
        } catch {}
        return updated;
      });
      try {
        localStorage.setItem("opening-lab-completed", JSON.stringify(next));
      } catch {}
      setFeedback({
        kind: "complete",
        text: "Line complete — you found every move.",
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [completed, isComplete, selectedOpening.id]);

  useEffect(() => {
    if (mode !== "practice" || !currentMove || isUserTurn) return;
    const timer = window.setTimeout(() => {
      setMoveIndex((value) => value + 1);
      setFeedback({
        kind: "auto",
        text: `Opponent played ${currentMove.san}. Your move.`,
      });
      setHintVisible(false);
    }, 520);
    return () => window.clearTimeout(timer);
  }, [currentMove, isUserTurn, mode]);

  const resetLine = useCallback(() => {
    setMoveIndex(0);
    setSelectedSquare(null);
    setHintVisible(false);
    setFeedback({
      kind: "idle",
      text:
        mode === "practice"
          ? "Follow the repertoire and find your moves."
          : "Use the arrows to walk through the line.",
    });
  }, [mode]);

  const chooseOpening = useCallback((opening: Opening) => {
    setSelectedOpening(opening);
    setMoveIndex(0);
    setSelectedSquare(null);
    setHintVisible(false);
    setFeedback({ kind: "idle", text: "New line ready. Find the key moves." });
  }, []);

  const choosePath = useCallback((path: StudyPath) => {
    const first = openings.find(path.matches);
    setActivePathId(path.id);
    setPracticeSide(path.side);
    setOrientation(path.side === "w" ? "white" : "black");
    setDatabaseMode(false);
    setQuery("");
    if (first) chooseOpening(first);
  }, [chooseOpening]);

  const randomLine = useCallback(() => {
    const pool = databaseMode ? openings : pathOpenings;
    const next = pool[Math.floor(Math.random() * pool.length)];
    if (next) chooseOpening(next);
  }, [chooseOpening, databaseMode, pathOpenings]);

  const tryMove = useCallback(
    (from: string, to: string) => {
      if (mode !== "practice" || !currentMove || !isUserTurn) return false;
      const matches = currentMove.from === from && currentMove.to === to;
      if (!matches) {
        setFeedback({
          kind: "wrong",
          text: "That is legal chess, but not the repertoire move. Try again.",
        });
        setHintVisible(false);
        return false;
      }

      setMoveIndex((value) => value + 1);
      setSelectedSquare(null);
      setHintVisible(false);
      setFeedback({
        kind: "correct",
        text: `Exactly — ${currentMove.san} is the move.`,
      });
      return true;
    },
    [currentMove, isUserTurn, mode],
  );

  const handleSquareClick = useCallback(
    ({ square }: { square: string }) => {
      const clicked = square as Square;
      if (!selectedSquare) {
        setSelectedSquare(clicked);
        return;
      }
      if (!tryMove(selectedSquare, clicked)) setSelectedSquare(clicked);
    },
    [selectedSquare, tryMove],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "h" && currentMove && isUserTurn) {
        setHintVisible(true);
        setFeedback({
          kind: "hint",
          text: `Look for ${currentMove.san}. The board arrow shows the idea.`,
        });
      }
      if (event.key === "ArrowLeft" && moveIndex > 0) {
        setMoveIndex((value) => Math.max(0, value - 1));
      }
      if (event.key === "ArrowRight" && mode === "explore") {
        setMoveIndex((value) => Math.min(lineMoves.length, value + 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentMove, isUserTurn, lineMoves.length, mode, moveIndex]);

  const visibleOpenings = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const pool = databaseMode || normalized ? openings : pathOpenings;
    if (!normalized) return pool.slice(0, 18);
    return pool
      .filter(
        (opening) =>
          opening.name.toLowerCase().includes(normalized) ||
          opening.eco.toLowerCase().includes(normalized),
      )
      .slice(0, 40);
  }, [databaseMode, pathOpenings, query]);

  const completedInPath = pathOpenings.filter((opening) =>
    completed.includes(opening.id),
  ).length;
  const progress = lineMoves.length
    ? Math.round((moveIndex / lineMoves.length) * 100)
    : 0;
  const movePairs = Array.from(
    { length: Math.ceil(lineMoves.length / 2) },
    (_, index) => ({
      number: index + 1,
      white: lineMoves[index * 2],
      black: lineMoves[index * 2 + 1],
      whiteIndex: index * 2,
      blackIndex: index * 2 + 1,
    }),
  );

  const lastMove = moveIndex > 0 ? lineMoves[moveIndex - 1] : undefined;
  const squareStyles: Record<string, React.CSSProperties> = {};
  if (lastMove) {
    squareStyles[lastMove.from] = { backgroundColor: "rgba(238, 216, 95, .52)" };
    squareStyles[lastMove.to] = { backgroundColor: "rgba(238, 216, 95, .62)" };
  }
  if (selectedSquare) {
    squareStyles[selectedSquare] = {
      ...(squareStyles[selectedSquare] || {}),
      boxShadow: "inset 0 0 0 4px rgba(255,255,255,.72)",
    };
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="Opening Lab home">
          <span className="brand-mark">♞</span>
          <span>OPENING<span>LAB</span></span>
        </div>
        <div className="topbar-stats">
          <span><Flame size={17} /> {streak} streak</span>
          <span><Trophy size={17} /> {completed.length} learned</span>
        </div>
      </header>

      <div className="workspace">
        <aside className="library-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Your repertoire</p>
              <h1>Study paths</h1>
            </div>
            <GraduationCap size={22} />
          </div>

          <nav className="path-list" aria-label="Opening study paths">
            {studyPaths.map((path) => {
              const count = openings.filter(path.matches).length;
              return (
                <button
                  className={`path-button ${activePath.id === path.id && !databaseMode ? "active" : ""}`}
                  key={path.id}
                  onClick={() => choosePath(path)}
                  style={{ "--path-color": path.color } as React.CSSProperties}
                >
                  <span className="path-icon"><BookOpen size={17} /></span>
                  <span className="path-copy">
                    <strong>{path.shortTitle}</strong>
                    <small>{count} lines · Play as {sideName(path.side)}</small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              );
            })}
          </nav>

          <button
            className={`database-button ${databaseMode ? "active" : ""}`}
            onClick={() => {
              setDatabaseMode(true);
              setQuery("");
            }}
          >
            <Database size={18} />
            <span><strong>Opening database</strong><small>{openings.length.toLocaleString()} Lichess lines</small></span>
          </button>

          <div className="line-browser">
            <label className="search-box">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name or ECO…"
                aria-label="Search opening database"
              />
            </label>
            <div className="line-browser-title">
              <span>{databaseMode ? "All openings" : "Variations"}</span>
              <button onClick={randomLine} aria-label="Choose a random variation"><Shuffle size={15} /></button>
            </div>
            <div className="variation-list">
              {visibleOpenings.map((opening) => (
                <button
                  key={opening.id}
                  className={selectedOpening.id === opening.id ? "selected" : ""}
                  onClick={() => chooseOpening(opening)}
                >
                  <span className="eco-badge">{opening.eco}</span>
                  <span>{databaseMode || query ? opening.name : cleanVariationName(opening)}</span>
                  {completed.includes(opening.id) && <span className="check">✓</span>}
                </button>
              ))}
              {visibleOpenings.length === 0 && (
                <p className="empty-state">No opening lines match “{query}”.</p>
              )}
            </div>
          </div>
        </aside>

        <section className="board-stage" aria-label="Opening practice board">
          <div className="lesson-heading">
            <div>
              <div className="lesson-kicker">
                <span className="eco-pill">{selectedOpening.eco}</span>
                {databaseMode ? "Lichess opening database" : activePath.title}
              </div>
              <h2>{selectedOpening.name}</h2>
              <p>{selectedOpening.pgn}</p>
            </div>
            <button className="random-button" onClick={randomLine}>
              <Shuffle size={16} /> Random line
            </button>
          </div>

          <div className="board-frame">
            <div className="player-row opponent">
              <span className="avatar dark">♟</span>
              <span><strong>Opening Lab</strong><small>Your repertoire partner</small></span>
              <span className="side-chip">{sideName(practiceSide === "w" ? "b" : "w")}</span>
            </div>
            <div className="chessboard-wrap">
              <Chessboard
                options={{
                  id: "opening-lab-board",
                  position: currentFen,
                  boardOrientation: orientation,
                  onPieceDrop: ({ sourceSquare, targetSquare }) =>
                    targetSquare ? tryMove(sourceSquare, targetSquare) : false,
                  onSquareClick: handleSquareClick,
                  canDragPiece: ({ square }) =>
                    Boolean(mode === "practice" && isUserTurn && square === currentMove?.from),
                  allowDrawingArrows: true,
                  arrows:
                    hintVisible && currentMove
                      ? [{ startSquare: currentMove.from, endSquare: currentMove.to, color: "rgba(247, 188, 71, .9)" }]
                      : [],
                  squareStyles,
                  lightSquareStyle: { backgroundColor: "#e7dcc4" },
                  darkSquareStyle: { backgroundColor: "#769656" },
                  darkSquareNotationStyle: { color: "#e7dcc4", fontWeight: 700 },
                  lightSquareNotationStyle: { color: "#769656", fontWeight: 700 },
                  boardStyle: {
                    borderRadius: "5px",
                    boxShadow: "0 22px 55px rgba(0,0,0,.32)",
                  },
                  animationDurationInMs: 260,
                }}
              />
            </div>
            <div className="player-row you">
              <span className="avatar light">♙</span>
              <span><strong>You</strong><small>Practicing as {sideName(practiceSide)}</small></span>
              <span className="side-chip">{sideName(practiceSide)}</span>
            </div>
          </div>

          <div className={`feedback-bar ${feedback.kind}`} role="status">
            <span className="feedback-icon">
              {feedback.kind === "complete" ? <Trophy size={18} /> : feedback.kind === "hint" ? <Sparkles size={18} /> : <Brain size={18} />}
            </span>
            <span>{feedback.text}</span>
            <button
              onClick={() => {
                if (!currentMove) return;
                setHintVisible(true);
                setFeedback({ kind: "hint", text: `Try ${currentMove.san}. Follow the arrow.` });
              }}
              disabled={!currentMove || !isUserTurn || mode !== "practice"}
            >
              <CircleHelp size={15} /> Hint <kbd>H</kbd>
            </button>
          </div>
        </section>

        <aside className="coach-panel">
          <div className="mode-tabs" role="tablist" aria-label="Trainer mode">
            <button className={mode === "practice" ? "active" : ""} onClick={() => { setMode("practice"); resetLine(); }}>Practice</button>
            <button className={mode === "explore" ? "active" : ""} onClick={() => { setMode("explore"); setMoveIndex(0); setFeedback({ kind: "idle", text: "Explore the line one move at a time." }); }}>Explore</button>
          </div>

          <div className="coach-card">
            <div className="coach-card-heading">
              <span>{mode === "practice" ? "Current lesson" : "Line explorer"}</span>
              <span>{moveIndex}/{lineMoves.length}</span>
            </div>
            <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
            <h3>{cleanVariationName(selectedOpening)}</h3>
            <p>{activePath.description}</p>

            <div className="side-selector">
              <span>Practice as</span>
              <div>
                {(["w", "b"] as Color[]).map((side) => (
                  <button
                    key={side}
                    className={practiceSide === side ? "active" : ""}
                    onClick={() => {
                      setPracticeSide(side);
                      setOrientation(side === "w" ? "white" : "black");
                      setMoveIndex(0);
                      setFeedback({ kind: "idle", text: `Ready to practice as ${sideName(side)}.` });
                    }}
                  >{sideName(side)}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="moves-card">
            <div className="moves-heading">
              <span>Moves</span>
              <button
                aria-label="Flip board"
                onClick={() => setOrientation((value) => value === "white" ? "black" : "white")}
              ><RotateCcw size={15} /> Flip</button>
            </div>
            <div className="move-table">
              {movePairs.map((pair) => (
                <div className="move-row" key={pair.number}>
                  <span className="move-number">{pair.number}.</span>
                  {[{ move: pair.white, index: pair.whiteIndex }, { move: pair.black, index: pair.blackIndex }].map(({ move, index }) => move ? (
                    <button
                      key={index}
                      className={`${index < moveIndex ? "played" : ""} ${index === moveIndex ? "current" : ""}`}
                      onClick={() => mode === "explore" && setMoveIndex(index + 1)}
                    >{index < moveIndex || mode === "explore" ? move.san : "•••"}</button>
                  ) : <span key={index} />)}
                </div>
              ))}
            </div>
          </div>

          <div className="coach-controls">
            <button onClick={() => setMoveIndex((value) => Math.max(0, value - 1))} disabled={moveIndex === 0} aria-label="Previous move"><ChevronLeft size={19} /></button>
            <button className="reset-button" onClick={resetLine}><RotateCcw size={16} /> Restart</button>
            <button onClick={() => setMoveIndex((value) => Math.min(lineMoves.length, value + 1))} disabled={mode !== "explore" || isComplete} aria-label="Next move"><ChevronRight size={19} /></button>
          </div>

          <div className="path-progress">
            <div><span>Path progress</span><strong>{completedInPath}/{pathOpenings.length}</strong></div>
            <div className="progress-track"><span style={{ width: `${pathOpenings.length ? (completedInPath / pathOpenings.length) * 100 : 0}%` }} /></div>
            <small>Progress is saved on this device.</small>
          </div>
        </aside>
      </div>
      <footer>
        Opening data from <a href="https://github.com/lichess-org/chess-openings" target="_blank" rel="noreferrer">lichess-org/chess-openings</a> · CC0
      </footer>
    </main>
  );
}
