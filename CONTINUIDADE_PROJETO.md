# 📋 CONTINUIDADE DO PROJETO — Simulador de Tribunal V7

> **LEIA ESTE ARQUIVO COMPLETAMENTE ANTES DE QUALQUER MODIFICAÇÃO.**
> Este documento é atualizado a cada handoff de sessão. Preservar integralmente.

---

## 🗂️ Visão Geral do Projeto

| Item | Detalhe |
|---|---|
| **Projeto** | Simulador de Tribunal V7 |
| **Diretório** | `/data/data/com.termux/files/home/projetos/simulador_tribunal_v7_ollama` |
| **Stack** | React + TypeScript + tRPC + Vitest + IA (OpenRouter/Gemini/Ollama/OpenAI/Manus) |
| **BD** | JSON local (`data/tribunal-local.json`) — sem MySQL, sem migrações |
| **Provedor IA padrão** | OpenRouter (`nvidia/nemotron-3.5-lightning:free`) |
| **Auth** | LOCAL_AUTH=true (Termux, sem OAuth externo) |

---

## ⚠️ REGRAS OBRIGATÓRIAS (NÃO IGNORAR)

1. **SEMPRE** examine `git status` e `git diff` antes de modificar qualquer arquivo.
2. **NUNCA** use `git reset`, `git checkout --`, `git clean` ou qualquer comando que descarte alterações.
3. **NUNCA** substitua o `.env` nem exponha chaves de API.
4. **NUNCA** remova arquivos de teste sem justificativa registrada aqui.
5. **NUNCA** use MySQL/Drizzle — o banco é o JSON local (`server/db.ts`).
6. **SEMPRE** registre aqui qualquer alteração feita antes de encerrá-la.

---

## 📁 Estrutura Principal de Arquivos

```
server/
  routers.ts              ← Router principal tRPC (3200+ linhas) — ARQUIVO CRÍTICO
  db.ts                   ← Banco JSON local (315 linhas) — ARQUIVO CRÍTICO
  routers_timeline.ts     ← Geração de cronologia e boletins policiais
  routers_hearings.ts     ← Geração de histórico de audiências
  routers_campaign.ts     ← Sistema de campanhas (modo história)
  routers_custom.ts       ← Casos personalizados
  routers_enhancements.ts ← Melhorias (eventos aleatórios, docs visuais)
  routers_voice.ts        ← Sistema de voz
  ai/
    router.ts             ← AI Router com fallback entre provedores
    hearing-director.ts   ← Diretor de Audiência (649 linhas)
    types.ts              ← Tipos compartilhados de IA
    providers/
      openrouter.ts       ← Provedor OpenRouter
      openrouter.test.ts  ← 9 testes do OpenRouter
      gemini.ts           ← Provedor Gemini
      ollama.ts           ← Provedor Ollama Cloud
  _core/
    env.ts                ← Variáveis de ambiente
client/src/pages/
  Trial.tsx               ← Página principal do julgamento
  NewSession.tsx          ← Criação de sessão
  MySessions.tsx          ← Listagem de sessões
drizzle/
  schema.ts               ← Schema de tipos (apenas para inferência TypeScript)
data/
  tribunal-local.json     ← Banco de dados JSON (dados locais persistidos)
```

---

## ✅ O Que Já Foi Implementado e Corrigido

### 1. Verificação TypeScript (`npm run check` / `tsc --noEmit`)
- [x] **100% LIMPO**: 0 erros em toda a aplicação.
- [x] Corrigido erro TS2304 em `server/routers.ts` (import de `HearingDirectorDecision`).
- [x] Corrigido erro TS2339 em `server/routers.ts` nas linhas de higienização de IA (extraído para `sanitizeAIResponse` estritamente tipada).

### 2. Suíte Geral de Testes (`npx vitest run`)
- [x] **100% DOS TESTES PASSANDO**: **51/51 testes em 8 arquivos de teste**.
- [x] `server/ai/providers/openrouter.test.ts` (9/9) ✅
- [x] `server/appeal.test.ts` (3/3) ✅
- [x] `server/auth.logout.test.ts` (1/1) ✅
- [x] `server/instancias.test.ts` (3/3) ✅
- [x] `server/multiplayer.test.ts` (7/7) ✅ (corrigido bug onde `players` era retornado antes de `addPlayerToRoom`).
- [x] `server/new_features.test.ts` (8/8) ✅ (mocks determinísticos adicionados para `invokeLLM` e `generateImage`, sem timeouts ou dependência de rede).
- [x] `server/progressao_cargos.test.ts` (11/11) ✅
- [x] `server/variedade_casos.test.ts` (9/9) ✅

### 3. Melhorias no Fluxo do Tribunal (`server/routers.ts`)
- [x] **Retrocompatibilidade de Session e Trial**:
  - `session.create` agora retorna `{ id: sessionId, sessionId }` para compatibilidade total entre páginas do cliente e testes.
  - `trial.generate` (`generateTrialWithAI`) agora retorna `{ id: trialId, trialId, ...caseData }`.
- [x] **Sanitização de IA Unificada**:
  - Função auxiliar `sanitizeAIResponse()` criada para eliminar duplicação e garantir que a IA não gere múltiplos personagens nem fale pelo usuário humano.
- [x] **STF com Relator Prioritário**:
  - Ao continuar julgamento no STF colegiado, o Ministro Relator é priorizado como orador inicial de IA.
- [x] **Lógica de Conclusão do Julgamento**:
  - Parênteses e precedência corrigidos em `shouldConclude` para evitar encerramento prematuro ou falso.
- [x] **Persistência Atômica Sem Race Condition** (`server/db.ts`):
  - Uso de arquivo temporário com PID + timestamp + random para evitar conflito `ENOENT rename` quando múltiplos testes ou workers gravam em paralelo.
- [x] **Defensiva em Depoimentos Policiais** (`server/routers_timeline.ts`):
  - Validação `Array.isArray(timelineData?.policeStatements)` para prevenir quebras caso a IA retorne objeto ao invés de array.

---

## 🧪 Estado dos Testes e TypeScript (Última Execução — 2026-11-20)

```bash
# TypeScript Check:
npm run check -> Exit code 0 (0 errors)

# Vitest Suite (após reforma STF + OpenCode principal + contagem de votos):
Test Files  11 passed (11)
     Tests  82 passed (82)
  Duration  ~2,7s
```

> ℹ️ `openrouter.test.ts`: **13/13 passando** (cadeia em lotes, reasoning, retentativas, ordem de fallback e short-circuit de cota diária).
> ℹ️ `stf_integration.test.ts`: **8/8 passando** — 10 ministros IA + usuário, cargos, PGR/AGU e proclamação com maioria.
> ℹ️ `opencode.test.ts`: **7/7 passando** — descoberta de modelo gratuito, agente dedicado, rotação em falha, intercalação Nvidia/`opencode`, rejeição de fala com outro alfabeto e extração de JSON. Validação real: `OK` via `nvidia/google/gemma-4-31b-it`.
> ℹ️ `speech-sanitizer.test.ts`: **11/11 passando** — fala preservada, remoção de metadados em português e inglês, rótulo de personagem repetido, fallback neutro, tags de contexto, múltiplos personagens e higienização de CJK/caracteres estrangeiros.
> ⚠️ Numa execução anterior apareceram 7 `EPERM: rename` em `server/db.ts` (Windows),
> com 2 `.tmp` deixados em `data/`; não foram removidos.

---

## 🔧 Variáveis de Ambiente Necessárias (`.env`)

```env
# PRINCIPAL (sem chave: reutiliza o background service do OpenCode):
AI_PROVIDER=opencode
OPENCODE_ENABLED=true
# OPENCODE_BASE_URL=http://127.0.0.1:4096
# OPENCODE_SERVER_PASSWORD=        # só para `opencode serve` manual
OPENCODE_AGENT=tribunal-speaker

# Criação de caso: complementos com concorrência limitada (padrão 2)
TRIAL_SECONDARY_CONCURRENCY=2

# SEGUNDO (esgota os 13 modelos :free em lotes de 3):
OPENROUTER_API_KEY=sk-or-v1-...        # Gratuito em openrouter.ai
OPENROUTER_MODEL=nvidia/nemotron-3.5-lightning:free

# Último recurso (só se OpenCode e TODAS as IAs gratuitas do OpenRouter falharem):
GEMINI_API_KEY=...
OPENAI_API_KEY=...

# Sistema:
LOCAL_AUTH=true
DATABASE_URL=                           # Não usado — BD é JSON local
NODE_ENV=development
JWT_SECRET=...
```

---

## 🕐 Histórico de Sessões

| Data | Agente | O que foi feito |
|---|---|---|
| Anterior ao 2026-11-19 | Agente anterior | Integração inicial OpenRouter, Diretor de Audiência, STF básico, DB local inicial. |
| 2026-11-19 (Parte 1) | Claude Sonnet 4.6 | Auditoria completa, criação deste arquivo de documentação. |
| 2026-11-19 (Parte 2) | Gemini 3.8 Flash | Resolução de 100% dos erros do TypeScript (`npm run check` clean), correção de concorrência em `server/db.ts`, fix de retorno em `session.create` e `trial.generate`, sanitização unificada em `routers.ts`, correção de `multiplayer.joinRoom`, mocks determinísticos em `new_features.test.ts`. 51/51 testes passando (8/8 arquivos). |
| 2026-11-19 (Parte 3) | Claude Sonnet 4.6 | **Recuperação pós-quota**: A sessão anterior (Parte 2) terminou com quota esgotada durante edição, deixando `server/routers.ts` corrompido com `const userParticipant` declarado duas vezes no mesmo escopo da função `message.send` (linhas 1706 e 1786 — erro de compilação `esbuild`). Correção: a segunda busca redundante ao DB foi removida, reutilizando `sessionParticipants` já carregado. 51/51 testes restaurados (8/8 arquivos). |
| 2026-11-20 | OpenCode (Big Pickle) | **Fallback de IAs gratuitas priorizado**: cadeia `FREE_MODEL_CHAIN` em `server/ai/providers/openrouter.ts` ampliada para os modelos gratuitos disponíveis na API do OpenRouter (com `openrouter/free` por último), modelos rápidos primeiro. OpenRouter sempre primeiro; Gemini/OpenAI/Ollama/Manus como **último recurso**. Logs `[AI/OpenRouter]` adicionados. `.env` local criado e documentação/testes atualizados. |
| 2026-11-20 (validação real) | OpenCode (Big Pickle) | Chave real inserida no `.env` e validação ponta a ponta. Descobertas da API real: (1) `models` aceita no máximo **3 itens** → cadeia dividida em lotes; (2) Nemotron gastava todo o `max_tokens` raciocinando e devolvia `content` vazio → `reasoning: { effort: "none" }` (5,2s/vazio → 0,37s/com texto); (3) `liquid/lfm-3-1.7b:free` exige reasoning obrigatório → foi recolocado logo antes de `openrouter/free`, num lote sem Nemotron (13 modelos / 5 lotes); (4) erros 400 de parâmetros e timeouts agora retentam/continuam pela cadeia antes de cair pro Gemini. Fluxo real validado: login → `trial.generate` → `session.create` → `message.send` → `message.list`, com resposta da IA e custo 0. |
| 2026-11-20 (nome do usuário) | OpenCode (Big Pickle) | Campo **"Seu nome"** adicionado em `client/src/pages/NewSession.tsx` (etapa de área, antes de gerar o caso, e etapa de papel para quem entra por caso personalizado). O valor é repassado em `session.create` como `userName`, já suportado pelo backend: vira o `name` do participante do usuário, alimenta os prompts da IA e do Diretor de Audiência e é persistido no perfil via `db.updateUserName`. Pré-preenchido com o nome da conta quando este é real. Asserção adicionada ao teste de integração STF. |
| 2026-11-20 (correções STF) | OpenCode (Big Pickle) | **Identidade dos ministros corrigida**: (1) `Trial.tsx` agora usa `msg.senderName` como fonte autoritativa em vez de `find(p => p.role === msg.role)` — no STF todos têm role `ministro`, então a tela sempre exibia "Ministro (Você)" para a IA. (2) `message.continuar` passou a persistir `senderName: speakerName`. (3) Rótulo "11 Ministros" substituído pela contagem real de participantes em `Trial.tsx`, `NewSession.tsx` e mensagem inicial do sistema. (4) Diretor de Audiência passa a usar `targetRole: "usuario"` no STF (evita colisão com role `ministro`). (5) Detecção de duplicadas não lança mais erro — apenas avisa e registra, destravando o fluxo. 61/61 testes passando. |
| 2026-11-20 (cota OpenRouter) | OpenCode (Big Pickle) | Diagnóstico do `free-models-per-day`: cota **global** de 50 req/dia compartilhada pelos 13 modelos (não 13 cotas). O código insistia nos 5 lotes após o 429, queimando requisições de um balde vazio. Agora detecta o erro, **para no primeiro lote** e devolve mensagem com horário de reset em Brasília e a dica de créditos (US$ 10 → 1000 req/dia). 13/13 testes do provider. |
| 2026-11-20 (reforma STF) | OpenCode (Big Pickle) | **Plenário realista completo**: novo módulo `server/ai/stf.ts` com cargos por tag (`[PRESIDENTE]`, `[VICE-PRESIDENTE]`, `[RELATOR]`, `[VOGAL]`), nomes fictícios de fallback, apuração de votos e maioria de 6. Geração passa a pedir **10 ministros IA + usuário na 11ª cadeira** (nomes fictícios, nenhum ministro real), PGR, advogado da tribuna e AGU. Abertura, prompts, Diretor, objeções, `appeal.judge` e UI usam terminologia constitucional (acórdão, tese, modulação) e `instancia === "terceira"` como fonte autoritativa — STJ não aparece mais como 3ª instância no STF. Nova mutation `message.proclamar` apura os votos, gera o acórdão pelo Presidente e salva `decisionDetails` com veredicto/tese/modulação. 63/63 testes passando. |
| 2026-11-20 (OpenCode principal) | OpenCode (Big Pickle) | **OpenCode virou o provedor principal**: novo `server/ai/providers/opencode.ts` reutiliza o background service (`~/.local/state/opencode/service.json`, sem chave), descobre modelos gratuitos via `/api/model`, filtra modelos inadequados e rotaciona Nvidia → pool `opencode`. Cada fala usa sessão descartável com o agente `.opencode/agents/tribunal-speaker.md` (`steps: 1`, permissões negadas) e aguarda o texto via `/api/experimental/session/{id}/wait`. Ordem final: OpenCode → OpenRouter → Gemini/Ollama/OpenAI/Manus. `.env` ajustado para `AI_PROVIDER=opencode`; teste real retornou `OK` via `nvidia/google/gemma-4-31b-it`. 5 testes novos do provider. |
| 2026-11-20 (amplificação) | OpenCode (Big Pickle) | Complementos da criação de caso (provas, documentos, cronologia, audiências e histórico de veículos) passaram a rodar com concorrência limitada por `TRIAL_SECONDARY_CONCURRENCY` (padrão 2) em vez de 5 chamadas simultâneas. `server/db.ts` agora retenta `rename` em EPERM/EBUSY/EACCES (6 tentativas com backoff) para eliminar a flakidade do JSON local entre workers do Vitest no Windows. |
| 2026-11-20 (contagem de votos) | OpenCode (Big Pickle) | Nova query `message.stfTally` (apuração provisória, somente leitura) e banner compacto no Plenário com favoráveis/contrários, mais botão **Ver votos** que abre um diálogo com a lista de cada ministro, origem do voto e barra de cadeiras manifestadas. `server/ai/speech-sanitizer.ts` centraliza a higienização e remove artefatos de agente ("MÁXIMOS PASSOS", "FERRAMENTAS DESABILITADAS", checkpoints) que apareceram como fala da IA; a instrução anti-meta foi reforçada nos prompts e no agente `tribunal-speaker`. 73/73 testes passando. |
| 2026-11-20 (artefatos de idioma) | OpenCode (Big Pickle) | Falas com caracteres CJK/japoneses e tokens soltos ("城里", "意外的", "GTG有限") passaram a ser tratadas em duas camadas: `PORTUGUESE_ONLY_INSTRUCTION` nos prompts/agente, `hasForeignScript`/`stripForeignScript` no sanitizador e rejeição da resposta no provider OpenCode com giro para outro modelo. A rotação do OpenCode agora intercala Nvidia e `opencode/*` e tenta os 12 modelos antes de devolver a chamada ao roteador — antes, uma janela de 6 podia cair só no bloco `opencode/*`, que estava devolvendo texto vazio. O log de fallback deixou de anunciar provedores não configurados. 78/78 testes passando. |
| 2026-11-20 (metadados em inglês) | OpenCode (Big Pickle) | Apareceu também `MAXIMUM STEPS LIMIT REACHED -` e o rótulo `Dra. Sandra Battistella [Procurador-Geral da República (PGR)](IA)` dentro da fala. O sanitizador passou a reconhecer marcadores em inglês (`MAXIMUM/MAX STEPS`, `STEP LIMIT REACHED`, `TOOL CALLS DISABLED`, `NEXT USER PROMPT`, `SYSTEM STATUS`, `CONVERSATION CHECKPOINT`) e a remover linhas de rótulo `[...](IA)` repetidas pelo modelo; se sobrar só metadado, devolve fala neutra. Instrução e agente `tribunal-speaker` reforçados. 81/81 testes passando. |
| 2026-11-20 (imagens desativadas) | OpenCode (Big Pickle) | Geração de imagens via Forge foi **desativada por padrão** (`IMAGE_GENERATION_ENABLED=false`). A geração automática em background foi suprimida e a rota manual `enhancements.visualDocs.generate` agora recusa com erro claro. Isso evita consumo de créditos do Forge e o ruído de `[Background] Erro ao gerar ... BUILT_IN_FORGE_API_URL is not configured`. Os testes cobrem ambos os estados (desativado e ativado explicitamente). 82/82 testes passando. |

---

## 📌 Próximos Passos Sugeridos

1. Testar o simulador na interface web interagindo em sessões normais e no novo STF (criar caso **novo** — sessões antigas têm nomes genéricos salvos).
2. Se o OpenCode ficar indisponível de forma persistente, o usuário pode fornecer chaves individuais das IAs gratuitas; a cadeia OpenRouter e os fallbacks já cobrem esse cenário.
3. Opcional: unificar Diretor + fala do personagem em uma única chamada (hoje `message.continuar` ainda faz duas; a abertura do STF já é determinística).
