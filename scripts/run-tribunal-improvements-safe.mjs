import fs from "node:fs";

const scriptPath = "scripts/apply-tribunal-improvements.mjs";
const source = fs.readFileSync(scriptPath, "utf8");

// O script de melhorias usa template literals para gerar TS/TSX.
// As expressões ${...} dentro desses templates pertencem ao código que será
// gerado e não podem ser avaliadas pelo Node durante a execução do patch.
// Escapamos todas as interpolações antes de importar o script.
//
// Isso evita erros como:
//   ReferenceError: session is not defined
// quando o patch contém JSX como ${session.status}.
const escapedSource = source.replace(/\$\{/g, "\\${");

const moduleUrl =
  "data:text/javascript;base64," +
  Buffer.from(escapedSource, "utf8").toString("base64");

await import(moduleUrl);
