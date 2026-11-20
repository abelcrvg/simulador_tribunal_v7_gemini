import fs from "node:fs";
import path from "node:path";

const seedPath = path.resolve("data/seed.local.json");
const runtimePath = path.resolve("data/tribunal-runtime.json");
const force = process.argv.includes("--force");

if (!fs.existsSync(seedPath)) {
  console.error("Semente não encontrada: data/seed.local.json");
  process.exit(1);
}

if (fs.existsSync(runtimePath) && !force) {
  console.error("Banco de runtime já existe. Use --force para substituí-lo.");
  process.exit(1);
}

fs.mkdirSync(path.dirname(runtimePath), { recursive: true });
fs.copyFileSync(seedPath, runtimePath);
console.log("Banco de runtime restaurado a partir de data/seed.local.json");
