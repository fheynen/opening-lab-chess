import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "node_modules/stockfish");
const target = resolve(root, "public/stockfish");
await mkdir(target, { recursive: true });
for (const file of ["bin/stockfish-18-lite-single.js", "bin/stockfish-18-lite-single.wasm", "Copying.txt"]) {
  await copyFile(resolve(source, file), resolve(target, file.split("/").at(-1)));
}

