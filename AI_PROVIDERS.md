# Arquitetura de IA do Simulador de Tribunal

A aplicação agora usa uma camada de abstração de IA. Os routers do Tribunal continuam chamando `invokeLLM()` e não precisam conhecer qual provedor respondeu.

## Provedores atuais

- `openai`: usa `OPENAI_API_KEY` ou a chave OpenAI configurada pelo usuário.
- `manus`: usa `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` e mantém o comportamento anterior com `gemini-2.5-flash`.

## Seleção

`AI_PROVIDER=auto` (padrão):
1. tenta OpenAI quando uma chave está disponível;
2. caso não esteja disponível ou falhe com erro recuperável, tenta Manus.

Também é possível forçar:

```env
AI_PROVIDER=openai
```

ou:

```env
AI_PROVIDER=manus
```

Mesmo quando um provedor é preferido, o router mantém o outro como fallback para erros recuperáveis.

## Modelos

```env
OPENAI_MODEL=gpt-4o
MANUS_MODEL=gemini-2.5-flash
```

## Próxima etapa

A estrutura em `server/ai/` foi criada para receber novos providers sem alterar os routers do Tribunal. Os próximos providers gratuitos podem ser adicionados como implementações independentes em `server/ai/providers/`.
