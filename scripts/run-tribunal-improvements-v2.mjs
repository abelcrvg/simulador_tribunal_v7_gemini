import fs from 'node:fs';

const scriptPath = 'scripts/apply-tribunal-improvements.mjs';
let source = fs.readFileSync(scriptPath, 'utf8');

const needle = "if(!routers.includes(oldConclusion)) throw new Error('Regra antiga de conclusão não encontrada');";
if (!source.includes(needle)) {
  throw new Error('Validação antiga de conclusão não encontrada no script de melhorias.');
}

// The migration script itself contains template literals intended to be copied
// into routers.ts. Escape appeal interpolations before importing it, otherwise
// Node evaluates ${appeal...} in the migration script's own scope.
source = source.replaceAll('${appeal.', '\\${appeal.');

const replacement = `if (!routers.includes(oldConclusion)) {
  console.log('[Hotfix] Regra antiga de conclusão não encontrada; procurando o bloco shouldConclude atual.');
  const conclusionStart = routers.indexOf('        const shouldConclude');
  const conclusionEnd = routers.indexOf('\\n\\n        let aiPrompt', conclusionStart);
  if (conclusionStart === -1 || conclusionEnd === -1) {
    throw new Error('Bloco shouldConclude atual também não foi encontrado.');
  }
  routers = routers.slice(0, conclusionStart) + newConclusion + routers.slice(conclusionEnd);
}`;

source = source.replace(needle, replacement);

const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(source, 'utf8').toString('base64');
await import(moduleUrl);
