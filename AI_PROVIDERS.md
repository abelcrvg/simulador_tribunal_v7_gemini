# Arquitetura de IA do Simulador de Tribunal

A aplicação usa uma camada de abstração de IA. Os routers do Tribunal continuam chamando `invokeLLM()` e não precisam conhecer qual provedor respondeu.

Fluxo:

```
server/routers.ts → invokeLLM() (server/_core/llm.ts)
                  → invokeWithAIRouter() (server/ai/router.ts)
                  → provider (server/ai/providers/)
```

## Ordem de fallback

Com `AI_PROVIDER=opencode` (padrão definido pelo usuário), o roteador tenta:

1. **OpenCode** — agrega fontes gratuitas (Nvidia, Groq, Ollama Cloud, pool `opencode`) atrás de uma única API local
2. **OpenRouter** — esgota **todas** as IAs gratuitas da cadeia (em lotes de até 3 modelos por requisição)
3. Gemini
4. Ollama
5. OpenAI
6. Manus (legado)

As chaves Gemini/OpenAI/Ollama/Manus são **último recurso**: só entram depois que OpenCode e todos os modelos `:free` do OpenRouter falharem. Se `AI_PROVIDER` não for definido, `auto` também começa com OpenCode.

### OpenCode (principal)

O provider (`server/ai/providers/opencode.ts`) reutiliza o background service do OpenCode em `~/.local/state/opencode/service.json` — não precisa de chave de API. Para subir manualmente: `opencode serve --port 4096`. Variáveis opcionais: `OPENCODE_BASE_URL`, `OPENCODE_SERVER_PASSWORD`, `OPENCODE_AGENT`, `OPENCODE_MODEL`, `OPENCODE_PROJECT_DIR`, `OPENCODE_ENABLED`.

Cada fala usa uma sessão descartável com o agente `.opencode/agents/tribunal-speaker.md` (`steps: 1`, todas as permissões negadas), garantindo que o modelo produza apenas o texto do personagem. A rotação de modelos gratuitos é feita no app: modelos Nvidia e do pool `opencode` são **intercalados** e todos os 12 são tentados antes de devolver a chamada ao roteador — isso evita que uma janela da rotação fique presa só no bloco `opencode/*` quando ele está devolvendo texto vazio. Modelos de segurança/voz/visão/raciocínio puro são filtrados. Respostas com caracteres de outro alfabeto (CJK, cirílico etc.) são rejeitadas e giram para o próximo modelo; como rede de segurança, o sanitizador remove esses caracteres antes de salvar a fala. Quando o OpenCode atinge cota ou falha, o roteador segue automaticamente para o OpenRouter.

> Mesmo com o agregador, as cotas continuam separadas por provedor. Se o OpenCode ficar indisponível de forma persistente, o usuário pode fornecer chaves individuais das IAs gratuitas (por exemplo `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `OLLAMA_API_KEY`) — a cadeia existente já contempla esse cenário.

## Cadeia de modelos gratuitos (OpenRouter)

Todos os modelos abaixo são `:free` (ou o roteador `openrouter/free`), confirmados na API do OpenRouter em 2026-11-20:

| Modelo | Obs. |
|---|---|
| `nvidia/nemotron-3.5-lightning:free` | primário padrão — rápido, 1M de contexto |
| `inclusionai/ling-3.2-flash:free` | flash, 1M de contexto |
| `google/gemma-4-26b-a4b-it:free` | 262k de contexto |
| `google/gemma-4-31b-it:free` | 262k de contexto |
| `baidu/ernie-5.5-flash-preview:free` | preview |
| `nvidia/nemotron-3.5-super-vl:free` | multimodal |
| `nvidia/nemotron-3-ultra-550b-a55b:free` | 1M de contexto |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | reasoning |
| `particle-ai/particle-1:free` | 1M de contexto |
| `recursive/flint-v1.0:free` | 262k de contexto |
| `dots-studio/dots-3-note-preview:free` | preview |
| `liquid/lfm-3-1.7b:free` | 1.7B — exige reasoning; fica em lote sem Nemotron |
| `openrouter/free` | Free Models Router — último recurso free |

A API do OpenRouter limita `models` a **3 itens por requisição**. Por isso a cadeia é dividida em lotes de 3 e, em caso de erro **específico de modelo**, todos os lotes são tentados antes de devolver o erro ao roteador. A resposta final devolve o campo `model` com o modelo que realmente respondeu.

**Exceção importante:** `free-models-per-day` é uma cota **diária global da conta** (50 requisições sem créditos), compartilhada pelos 13 modelos — não são 13 cotas independentes. Quando ela acaba, o provider **para no primeiro lote** (evita queimar as requisições restantes de um balde já vazio) e devolve um erro não-retryable com o horário do reset em Brasília. Com US$ 10 de créditos o limite sobe para 1000 requisições/dia; os modelos `:free` continuam custando 0.

Modelos Nemotron recebem `reasoning: { effort: "none" }`: sem isso eles gastam todo o `max_tokens` raciocinando e devolvem `content` vazio (teste real: 5,2s e vazio → 0,37s com texto). Se algum modelo rejeitar `reasoning` ou `response_format` com HTTP 400, o parâmetro é removido e o mesmo lote é retentado antes de seguir para o próximo.

`liquid/lfm-3-1.7b:free` exige reasoning obrigatório e rejeita `effort: none` com HTTP 400. Por isso ele foi colocado logo antes de `openrouter/free`, num lote que não contém Nemotron — assim já vai sem o parâmetro, sem precisar do retry.

## Configuração

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=nvidia/nemotron-3.5-lightning:free
```

Os modelos da cadeia gratuita vivem em `FREE_MODEL_CHAIN` em `server/ai/providers/openrouter.ts`. Atualize essa lista quando o catálogo `:free` do OpenRouter mudar.

## Logs úteis

- `[AI Router] Usando ...` e `Fallback para ... (último recurso)` — mostram a ordem de acionamento.
- `[AI/OpenRouter] model=... totalModels=... lotes=...` e `lote N/M: ...` — mostram a cadeia e o lote atual.
- `[AI/OpenRouter] Erro <status> no lote N: ...` — mostra por que aquele lote falhou e que a cadeia continua.
- `[AI/OpenRouter] Modelo exige reasoning...` / `não suporta response_format...` — retentativas automáticas no mesmo lote.
- `[AI/OpenRouter] Cota diária de modelos gratuitos esgotada...` — short-circuit por `free-models-per-day`, com horário de reset.

## Logs do OpenCode

- `[AI/OpenCode] N modelos gratuitos no catálogo; M na rotação` — catálogo descoberto via `/api/model` (cache de 5 min).
- `[AI/OpenCode] tentando <provider>/<modelo>` — modelo atual da rotação.
- `[AI/OpenCode] resposta recebida de ...` — fala obtida com sucesso.
- `[AI/OpenCode] <modelo> falhou: ...` — erro específico; o próximo modelo é tentado automaticamente. Inclui texto vazio ou mistura de alfabetos.
- `[AI Router] Fallback para <provedor>` — só aparece quando o próximo provedor da cadeia está realmente configurado.

A senha do serviço local do OpenCode nunca é registrada em log.
