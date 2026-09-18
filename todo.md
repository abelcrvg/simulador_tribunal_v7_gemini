# Simulador de Tribunal Virtual - TODO

## Banco de Dados (15 tabelas)
- [x] Criar schema com tabela users (já existe)
- [x] Criar tabela trials (casos jurídicos)
- [x] Criar tabela sessions (sessões de julgamento)
- [x] Criar tabela messages (mensagens do julgamento)
- [x] Criar tabela participants (participantes IA)
- [x] Criar tabela evidences (provas)
- [x] Criar tabela vehicleHistory (histórico de veículos)
- [x] Criar tabela documents (documentos)
- [x] Criar tabela juryVotes (votos do júri)
- [x] Criar tabela appeals (recursos)
- [x] Criar tabela appellateJudges (desembargadores/ministros)
- [x] Criar tabela policeReports (boletins de ocorrência)
- [x] Criar tabela hearings (histórico de audiências)
- [x] Criar tabela rooms (salas multiplayer)
- [x] Criar tabela roomPlayers (jogadores nas salas)
- [x] Executar migrações do banco (pnpm db:push)

## Backend - tRPC Routers
- [x] Criar routers principais (geração de casos, participantes, provas)
- [x] Criar router de timeline (geração de timeline)
- [x] Criar router de hearings (geração de audiências)
- [x] Criar router de appeals (sistema de recursos)
- [x] Criar router de multiplayer (salas e jogadores)
- [x] Implementar funções de banco de dados (db.ts)
- [ ] Integrar IA para geração de casos (60+ tipos)
- [ ] Integrar IA para geração de participantes com personalidades
- [ ] Integrar IA para controlar papéis não escolhidos
- [ ] Implementar sistema de júri com 7 jurados
- [ ] Implementar progressão automática de cargos

## Backend - WebSocket (Socket.IO)
- [x] Configurar Socket.IO no servidor
- [ ] Implementar eventos: join-room, leave-room
- [ ] Implementar eventos: select-role, player-ready
- [ ] Implementar evento: start-trial
- [ ] Sincronização em tempo real de estado

## Frontend - Páginas
- [ ] Criar página Home (landing page)
- [ ] Criar página NewSession (nova sessão)
- [ ] Criar página Trial (julgamento principal)
- [ ] Criar página MySessions (minhas sessões)
- [ ] Criar página Multiplayer (seleção multiplayer)
- [ ] Criar página MultiplayerLobby (lobby multiplayer)

## Frontend - Componentes
- [ ] Criar componentes de interface reutilizáveis
- [ ] Implementar tema marrom/âmbar (paleta jurídica)
- [ ] Configurar suporte a 3 temas (Light, Dark, Sepia)
- [ ] Integrar shadcn/ui e Tailwind CSS 4
- [ ] Adicionar ícones Lucide React
- [ ] Configurar notificações toast (Sonner)

## Frontend - Integração tRPC
- [ ] Configurar cliente tRPC
- [ ] Implementar hooks para queries e mutations
- [ ] Conectar páginas aos routers do backend

## Frontend - Integração Socket.IO
- [ ] Configurar cliente Socket.IO
- [ ] Implementar sincronização de salas multiplayer
- [ ] Implementar sincronização de seleção de papéis
- [ ] Implementar indicadores de status dos jogadores

## Funcionalidades Principais
- [ ] Modo Solo: criar sessão, escolher papel, interagir com IA
- [ ] Modo Solo: solicitar votação do júri
- [ ] Modo Solo: ver decisão final
- [ ] Modo Multiplayer: criar sala com código único
- [ ] Modo Multiplayer: entrar em sala com código
- [ ] Modo Multiplayer: seleção de papéis (1 por jogador)
- [ ] Modo Multiplayer: IA controla papéis não escolhidos
- [ ] Modo Multiplayer: sistema de "Estou Pronto"
- [ ] Modo Multiplayer: host pode iniciar julgamento
- [ ] Sistema de recursos e instâncias superiores (1ª, 2ª, 3ª)
- [ ] Timeline e histórico de audiências

## Funcionalidades Avançadas

### Modo Campanha/História
- [x] Criar tabela campaigns (campanhas)
- [x] Criar tabela campaignProgress (progresso do usuário)
- [ ] Implementar geração de casos conectados
- [ ] Criar sistema de decisões que afetam casos futuros
- [ ] Implementar progressão linear com dificuldade crescente
- [ ] Criar página Campaign para listar campanhas
- [ ] Criar página CampaignPlay para jogar campanha

### Salas Temáticas
- [ ] Adicionar campo theme em rooms
- [ ] Criar componentes visuais para cada tema
- [ ] Implementar seletor de tema ao criar sala

### Documentos Visuais
- [x] Criar tabela visualDocuments (documentos visuais)
- [ ] Implementar geração de imagens (cena do crime, plantas baixas)
- [ ] Integrar geração de imagens com IA
- [ ] Adicionar galeria de documentos visuais no Trial

### Eventos Aleatórios
- [x] Criar tabela trialEvents (eventos do julgamento)
- [ ] Implementar sistema de eventos aleatórios
- [ ] Criar eventos: testemunha muda depoimento
- [ ] Criar eventos: prova nova surge
- [ ] Criar eventos: advogado pede adiamento
- [ ] Criar eventos: júri pede esclarecimento
- [ ] Implementar lógica de impacto dos eventos

### Casos Personalizados
- [x] Criar tabela customTrials (casos personalizados)
- [ ] Criar página CreateCustomTrial
- [ ] Implementar editor de casos com IA
- [ ] Permitir usuário descrever caso em texto livre
- [ ] IA gera caso estruturado a partir do texto
- [ ] Adicionar validação e preview do caso
- [ ] Permitir compartilhar casos personalizados

### Sistema de Debate por Voz
- [ ] Adicionar campo audioUrl na tabela messages
- [ ] Implementar upload de áudio para S3
- [ ] Integrar Whisper API para transcrição de voz
- [ ] Criar router tRPC para processar áudio
- [ ] Adicionar toggle Texto/Voz na página Trial
- [ ] Criar componente VoiceRecorder (botão push-to-talk)
- [ ] Implementar gravação de áudio (MediaRecorder API)
- [ ] Auto-enviar áudio após gravação
- [ ] Adicionar indicador visual "Gravando..."

## Testes
- [ ] Criar testes de autenticação
- [ ] Criar testes de sistema de recursos
- [ ] Criar testes de instâncias superiores
- [ ] Criar testes de progressão de cargos
- [ ] Criar testes de variedade de casos
- [ ] Criar testes de multiplayer
- [ ] Executar todos os testes (pnpm test)

## Finalização
- [ ] Verificar cores marrom/âmbar em toda interface
- [ ] Testar modo solo completo
- [ ] Testar modo multiplayer completo
- [ ] Criar checkpoint final
- [ ] Documentar funcionalidades


## 🐛 Bugs Reportados

- [ ] **Multiplayer não está funcional**: Sistema multiplayer precisa ser corrigido e testado


## 📝 Notas

- **Multiplayer**: Sistema multiplayer foi replicado do projeto original mas não foi testado/validado completamente. Funcionalidade pode precisar de ajustes futuros.


## 🔧 Melhorias Solicitadas

- [x] **Geração automática de provas visuais**: Gerar documentos visuais automaticamente em background após criação da sessão (não durante o julgamento para não atrasar o início)

- [x] **Fluxo de caso personalizado quebrado**: Após gerar caso personalizado, usuário deveria ir direto para escolha de papel, mas estava indo para escolha de área do direito
- [x] **Juiz não conclui julgamento após sentença**: Quando o juiz faz a sentença, o sistema não estava concluindo o restante do processo (votos do júri, feedback, etc.)
- [x] **Resposta do juiz sendo cortada**: As mensagens do juiz (e possivelmente outros participantes IA) estão sendo cortadas no meio, não exibindo a resposta completa

- [x] **Casos complexos com múltiplos participantes**: Gerar casos difíceis com vários réus, múltiplas testemunhas, peritos, e mais pessoas na sessão para aumentar a complexidade

- [x] **Suporte para API key personalizada da OpenAI**: Adicionar campo para usuário configurar sua própria API key do ChatGPT para gerar casos e debates

- [x] **Página de Configurações**: Criar página de configurações onde usuário pode gerenciar preferências (API key da OpenAI, modelo de IA, notificações, etc.)

- [x] **API Key da OpenAI não está funcionando**: Usuário configurou OPENAI_API_KEY mas o sistema não está concluindo a geração (investigar se há erro na chamada da API)

- [x] **Salvar API key no banco de dados do usuário**: Implementar funcionalidade para salvar API key da OpenAI no banco de dados através da página de Configurações
