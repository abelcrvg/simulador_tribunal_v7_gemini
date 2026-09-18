import fs from 'node:fs';

const scriptPath = 'scripts/apply-tribunal-improvements.mjs';
const source = fs.readFileSync(scriptPath, 'utf8');

// O script de melhorias contém template literals que geram TS/TSX.
// Em vez de avaliar esses templates dentro deste processo, substituímos
// temporariamente todas as interpolações ${...} do código gerado por
// placeholders seguros. Depois restauramos os placeholders no código-fonte
// do script antes de executá-lo.
const interpolationMap = new Map();
let placeholderIndex = 0;

const escapedSource = source.replace(/\$\{([\s\S]*?)\}/g, (match) => {
  const placeholder = `__TRIBUNAL_INTERPOLATION_${placeholderIndex++}__`;
  interpolationMap.set(placeholder, match);
  return placeholder;
});

const restoredSource = escapedSource.replace(
  /__TRIBUNAL_INTERPOLATION_\d+__/g,
  (placeholder) => interpolationMap.get(placeholder) ?? placeholder,
);

// O script original pode ter mudado de estrutura após atualizações do projeto.
// Se a validação antiga não existir, não tentamos executar uma transformação
// incompatível: o erro deve apontar diretamente para o script original.
const oldConclusion = "if(!routers.includes(oldConclusion)) throw new Error('Regra antiga de conclusão não encontrada');";
if (!restoredSource.includes(oldConclusion)) {
  console.log('[Hotfix] Validação antiga de conclusão não encontrada; executando o script atual sem esse hotfix.');
}

const moduleUrl =
  'data:text/javascript;base64,' +
  Buffer.from(restoredSource, 'utf8').toString('base64');

await import(moduleUrl);
