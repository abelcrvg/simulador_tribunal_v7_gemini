# Tribunal — execução local no Termux

## Requisitos

- Node.js 20+ (Node 22 recomendado)
- npm
- MySQL acessível pela aplicação
- Chaves de IA configuradas no `.env` conforme necessário

## Instalação

Entre na pasta que contém `package.json` e execute:

```bash
npm install
```

## Configuração

Copie `.env.example` para `.env` quando existir e preencha as variáveis necessárias.

Para o banco, configure `DATABASE_URL`.

Para IA, a versão atual mantém o AI Router e aceita os provedores já implementados:

```env
AI_PROVIDER=auto
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o
BUILT_IN_FORGE_API_KEY=
MANUS_MODEL=gemini-2.5-flash
```

## Desenvolvimento

```bash
npm run dev
```

O servidor escolhe uma porta livre começando por `3000` e imprime o endereço no terminal.

## Verificação

```bash
npm run check
npm run test
```

## Observação sobre Manus

Plugins de desenvolvimento exclusivos do ambiente Manus foram removidos da configuração do Vite. O código do Tribunal e a camada AI Router continuam separados do provedor.


## Login local

Em desenvolvimento, o projeto pode usar autenticação local sem Manus OAuth. Defina `LOCAL_AUTH=true` no `.env` (e `VITE_LOCAL_AUTH=true` para o frontend) ou simplesmente deixe `VITE_OAUTH_PORTAL_URL` vazio em modo Vite dev. O botão `Entrar` abrirá `/api/auth/local/login`.

A autenticação local não substitui o banco: recursos que salvam casos, sessões ou outros dados continuam dependendo de `DATABASE_URL`.
