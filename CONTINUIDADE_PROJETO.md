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

## 🧪 Estado dos Testes e TypeScript (Última Execução — 2026-11-19)

```bash
# TypeScript Check:
npm run check -> Exit code 0 (0 errors)

# Vitest Suite:
Test Files  8 passed (8)
     Tests  51 passed (51)
  Duration  10.87s
```

---

## 🔧 Variáveis de Ambiente Necessárias (`.env`)

```env
# PRINCIPAL:
OPENROUTER_API_KEY=sk-or-v1-...        # Gratuito em openrouter.ai
OPENROUTER_MODEL=nvidia/nemotron-3.5-lightning:free

# Fallbacks opcionais:
GEMINI_API_KEY=...
OPENAI_API_KEY=...

# Sistema:
LOCAL_AUTH=true
DATABASE_URL=                           # Não usado — BD é JSON local
AI_PROVIDER=openrouter                  # ou: auto, gemini, ollama, openai
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

---

## 📌 Próximos Passos Sugeridos

1. Testar o simulador na interface web (`npm run dev`) interagindo diretamente em sessões normais e do STF.
2. Explorar refinamento da interface de usuário em `client/src/pages/Trial.tsx` se desejado.
