# Como Configurar sua API Key da OpenAI

O Simulador de Tribunal Virtual suporta duas formas de gerar conteúdo com IA:

1. **API da Manus (padrão)**: Usa a API integrada da plataforma Manus (sem configuração adicional)
2. **API da OpenAI (personalizada)**: Usa sua própria conta da OpenAI/ChatGPT

## Por que usar sua própria API Key?

- **Controle de custos**: Você paga diretamente à OpenAI pelos tokens usados
- **Modelo específico**: Usa GPT-4o da OpenAI ao invés do modelo padrão
- **Independência**: Não depende da API da Manus

## Como Configurar

### 1. Obter sua API Key da OpenAI

1. Acesse [platform.openai.com](https://platform.openai.com)
2. Faça login ou crie uma conta
3. Vá em **API Keys** no menu lateral
4. Clique em **Create new secret key**
5. Copie a chave (ela começa com `sk-...`)

### 2. Adicionar a API Key no Projeto

#### Opção A: Via Interface da Manus (Recomendado)

1. Acesse o **painel de gerenciamento** do seu projeto
2. Vá em **Settings** → **Secrets**
3. Clique em **Add Secret**
4. Nome: `OPENAI_API_KEY`
5. Valor: Cole sua API key da OpenAI
6. Salve

#### Opção B: Via Arquivo .env (Local)

Se estiver rodando localmente, crie um arquivo `.env` na raiz do projeto:

```env
OPENAI_API_KEY=sk-sua-chave-aqui
```

### 3. Reiniciar o Servidor

Após adicionar a API key, reinicie o servidor para que a mudança tenha efeito.

## Como Funciona

O sistema verifica automaticamente se existe a variável `OPENAI_API_KEY`:

- **Se existir**: Usa a API da OpenAI (GPT-4o) com sua chave
- **Se não existir**: Usa a API da Manus (padrão)

Não é necessário modificar nenhum código! A mudança é automática.

## Custos Estimados

Usando GPT-4o da OpenAI:

- **Geração de caso**: ~$0.01 - $0.03 por caso
- **Debate no julgamento**: ~$0.05 - $0.15 por sessão completa
- **Total estimado**: ~$0.10 - $0.20 por julgamento completo

*Valores aproximados. Consulte a [página de preços da OpenAI](https://openai.com/api/pricing/) para valores atualizados.*

## Solução de Problemas

### Erro: "OpenAI API call failed: 401"

- Verifique se sua API key está correta
- Confirme que a chave não foi revogada no painel da OpenAI

### Erro: "OpenAI API call failed: 429"

- Você atingiu o limite de requisições da sua conta
- Aguarde alguns minutos ou aumente o limite no painel da OpenAI

### Erro: "OpenAI API call failed: 500"

- Problema temporário nos servidores da OpenAI
- Aguarde alguns minutos e tente novamente

## Remover a API Key

Para voltar a usar a API da Manus:

1. Vá em **Settings** → **Secrets**
2. Encontre `OPENAI_API_KEY`
3. Clique em **Delete**
4. Reinicie o servidor

---

**Nota**: Sua API key é armazenada de forma segura como variável de ambiente e nunca é exposta no frontend ou em logs.
