import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const files = ["a", "b", "c", "d", "e"];

const openings = [];

for (const volume of files) {
  const path = resolve(ROOT, `data/lichess-openings/${volume}.tsv`);
  const rows = (await readFile(path, "utf8")).trim().split("\n");

  for (const row of rows.slice(1)) {
    const [eco, name, pgn] = row.split("\t");
    if (!eco || !name || !pgn) continue;

    openings.push({
      id: `${eco}-${openings.length + 1}`,
      eco,
      name,
      pgn,
    });
  }
}

await writeFile(
  resolve(ROOT, "app/data/openings.json"),
  `${JSON.stringify(openings)}\n`,
);

console.log(`Built ${openings.length} opening records.`);
