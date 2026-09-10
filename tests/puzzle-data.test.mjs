import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Chess } from "chess.js";

const puzzles = JSON.parse(await readFile(new URL("../app/data/puzzles.json", import.meta.url), "utf8"));
const expectedSides = { sicilian: "b", dutch: "b", french: "w", scandinavian: "w", "queens-gambit": "w" };

test("catalog puzzles are unique, legal, and oriented for each path", () => {
  assert.ok(puzzles.length >= 10);
  assert.equal(new Set(puzzles.map((puzzle) => puzzle.id)).size, puzzles.length);
  for (const puzzle of puzzles) {
    assert.equal(new Chess(puzzle.fen).turn(), expectedSides[puzzle.pathId]);
    assert.ok(puzzle.rating >= 800 && puzzle.rating <= 2400);
    const game = new Chess(puzzle.fen);
    for (const uci of puzzle.moves) {
      assert.doesNotThrow(() => game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || "q" }), `${puzzle.id}: ${uci}`);
    }
  }
});

test("every featured opening path has catalog training", () => {
  for (const pathId of Object.keys(expectedSides)) assert.ok(puzzles.some((puzzle) => puzzle.pathId === pathId), pathId);
});

