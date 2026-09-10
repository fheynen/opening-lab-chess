import openingsData from "../data/openings.json";

export type Opening = { id: string; eco: string; name: string; pgn: string };
export type OpeningPath = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  color: string;
  side: "w" | "b";
  prefixes: string[];
  puzzleTags: string[];
};

export const openings = openingsData as Opening[];

export const openingPaths: OpeningPath[] = [
  { id: "sicilian", title: "Master the Sicilian", shortTitle: "Sicilian Defense", description: "Fight 1.e4 with active, asymmetric positions and reliable counterplay.", color: "#91b553", side: "b", prefixes: ["Sicilian Defense"], puzzleTags: ["Sicilian_Defense"] },
  { id: "dutch", title: "Build a Dutch Defense", shortTitle: "Dutch Defense", description: "Meet 1.d4 with an ambitious kingside plan and learn its recurring structures.", color: "#dfa84b", side: "b", prefixes: ["Dutch Defense"], puzzleTags: ["Dutch_Defense"] },
  { id: "french", title: "Counter the French", shortTitle: "vs. French Defense", description: "Build a dependable White repertoire against the French pawn chain.", color: "#b891d3", side: "w", prefixes: ["French Defense"], puzzleTags: ["French_Defense"] },
  { id: "scandinavian", title: "Punish the Scandinavian", shortTitle: "vs. Scandinavian", description: "Develop with tempo and handle the early pressure after 1.e4 d5.", color: "#66a9cc", side: "w", prefixes: ["Scandinavian Defense"], puzzleTags: ["Scandinavian_Defense"] },
  { id: "queens-gambit", title: "Challenge 1.d4 d5", shortTitle: "Queen’s Gambit", description: "Pressure Black’s center and recognize the key Queen’s Gambit structures.", color: "#d47a68", side: "w", prefixes: ["Queen's Gambit"], puzzleTags: ["Queens_Gambit", "Queens_Gambit_Declined", "Queens_Gambit_Accepted"] },
];

export function getOpeningPath(id: string) {
  return openingPaths.find((path) => path.id === id) ?? openingPaths[0];
}

export function openingsForPath(path: OpeningPath) {
  return openings.filter((opening) => path.prefixes.some((prefix) => opening.name.startsWith(prefix)));
}

