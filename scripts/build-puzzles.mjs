import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { spawn } from "node:child_process";
import { Chess } from "chess.js";

const input = process.argv[2];
if (!input) throw new Error("Usage: npm run data:puzzles -- /absolute/path/lichess_db_puzzle.csv[.zst]");
const paths = [
  { id: "sicilian", side: "b", tags: ["Sicilian_Defense"] },
  { id: "dutch", side: "b", tags: ["Dutch_Defense"] },
  { id: "french", side: "w", tags: ["French_Defense"] },
  { id: "scandinavian", side: "w", tags: ["Scandinavian_Defense"] },
  { id: "queens-gambit", side: "w", tags: ["Queens_Gambit"] },
];
const buckets = new Map(paths.map((path) => [path.id, [[], [], [], []]]));
const base = createReadStream(input); let stream = base;
if (input.endsWith(".zst")) {
  base.destroy();
  const process = spawn("zstd", ["-dc", input], { stdio: ["ignore", "pipe", "inherit"] });
  process.on("error", () => { throw new Error("Install the zstd command or decompress the puzzle CSV first."); });
  stream = process.stdout;
}

for await (const line of createInterface({ input: stream, crlfDelay: Infinity })) {
  if (!line || line.startsWith("PuzzleId,")) continue;
  const fields = parseCsv(line); if (fields.length < 10) continue;
  const [id, initialFen, moveText, ratingText, , popularityText, playsText, themesText, gameUrl, tagsText] = fields;
  const rating = Number(ratingText); const popularity = Number(popularityText); const plays = Number(playsText); if (rating < 800 || rating > 2400 || popularity < 70) continue;
  const tags = tagsText.split(" ").filter(Boolean); const path = paths.find((candidate) => candidate.tags.some((tag) => tags.some((value) => value.startsWith(tag)))); if (!path) continue;
  const rawMoves = moveText.split(" ").filter(Boolean); if (rawMoves.length < 2) continue;
  try {
    const game = new Chess(initialFen); const first = rawMoves[0]; game.move({ from: first.slice(0, 2), to: first.slice(2, 4), promotion: first[4] || "q" }); if ((game.turn() === "w" ? "w" : "b") !== path.side) continue;
    const puzzle = { id, pathId: path.id, title: tags.at(-1)?.replaceAll("_", " ") || "Opening pattern", fen: game.fen(), moves: rawMoves.slice(1), rating, themes: themesText.split(" ").filter(Boolean), openingTags: tags, sourceUrl: gameUrl };
    const band = rating < 1200 ? 0 : rating < 1600 ? 1 : rating < 2000 ? 2 : 3; buckets.get(path.id)[band].push({ ...puzzle, popularity, plays });
  } catch { /* Skip malformed or illegal source records. */ }
}

const output = [];
for (const path of paths) {
  const groups = buckets.get(path.id).map((items) => items.sort((a, b) => b.popularity - a.popularity || b.plays - a.plays || a.id.localeCompare(b.id)));
  for (let cursor = 0; output.filter((item) => item.pathId === path.id).length < 300; cursor += 1) {
    let added = false;
    for (const group of groups) { const item = group[cursor]; if (item) { output.push({ id: item.id, pathId: item.pathId, title: item.title, fen: item.fen, moves: item.moves, rating: item.rating, themes: item.themes, openingTags: item.openingTags, sourceUrl: item.sourceUrl }); added = true; } if (output.filter((candidate) => candidate.pathId === path.id).length >= 300) break; }
    if (!added) break;
  }
}
await writeFile(new URL("../app/data/puzzles.json", import.meta.url), JSON.stringify(output, null, 2) + "\n");
console.log(`Wrote ${output.length} puzzles across ${paths.length} opening paths.`);

function parseCsv(line) {
  const out = []; let value = ""; let quoted = false;
  for (let index = 0; index < line.length; index += 1) { const char = line[index]; if (char === '"') { if (quoted && line[index + 1] === '"') { value += '"'; index += 1; } else quoted = !quoted; } else if (char === "," && !quoted) { out.push(value); value = ""; } else value += char; }
  out.push(value); return out;
}
