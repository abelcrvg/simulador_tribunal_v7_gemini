import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  openaiApiKey: varchar("openaiApiKey", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Casos jurídicos gerados pela IA
 */
export const trials = mysqlTable("trials", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  area: varchar("area", { length: 100 }).notNull(),
  description: text("description").notNull(),
  facts: text("facts").notNull(),
  legalBasis: text("legalBasis").notNull(),
  jurisprudence: text("jurisprudence"),
  admiteJuri: boolean("admiteJuri").default(false).notNull(),
  difficulty: mysqlEnum("difficulty", ["facil", "medio", "dificil"]).default("medio").notNull(),
  timeline: text("timeline"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Trial = typeof trials.$inferSelect;
export type InsertTrial = typeof trials.$inferInsert;

/**
 * Sessões de julgamento
 */
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  trialId: int("trialId").notNull(),
  userRole: mysqlEnum("userRole", ["juiz", "advogado_defesa", "defensor_publico", "promotor", "assistente_acusacao", "reu", "vitima", "testemunha", "perito", "jurado", "desembargador", "ministro", "procurador_justica", "subprocurador_geral"]).notNull(),
  status: mysqlEnum("status", ["em_andamento", "concluido", "abandonado"]).default("em_andamento").notNull(),
  verdict: text("verdict"),
  decisionDetails: text("decisionDetails"),
  isMultiplayer: boolean("isMultiplayer").default(false).notNull(),
  roomId: int("roomId"),
  juriVotou: boolean("juriVotou").default(false).notNull(),
  instancia: mysqlEnum("instancia", ["primeira", "segunda", "terceira"]).default("primeira").notNull(),
  parentSessionId: int("parentSessionId"),
  appealId: int("appealId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

/**
 * Mensagens do julgamento
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  content: text("content").notNull(),
  audioUrl: varchar("audioUrl", { length: 500 }),
  isAI: boolean("isAI").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Provas relacionadas aos casos jurídicos
 */
export const evidences = mysqlTable("evidences", {
  id: int("id").autoincrement().primaryKey(),
  trialId: int("trialId").notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Evidence = typeof evidences.$inferSelect;
export type InsertEvidence = typeof evidences.$inferInsert;

/**
 * Participantes da sessão de julgamento
 */
export const participants = mysqlTable("participants", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  isUser: boolean("isUser").default(false).notNull(),
  description: text("description"),
  personality: text("personality"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = typeof participants.$inferInsert;

/**
 * Histórico do veículo (para casos de veículos/sinistros)
 */
export const vehicleHistory = mysqlTable("vehicleHistory", {
  id: int("id").autoincrement().primaryKey(),
  trialId: int("trialId").notNull(),
  eventDate: timestamp("eventDate").notNull(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  location: varchar("location", { length: 255 }),
  description: text("description").notNull(),
  parts: text("parts"),
  mileage: int("mileage"),
  cost: varchar("cost", { length: 50 }),
  technician: varchar("technician", { length: 255 }),
  documents: text("documents"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VehicleHistory = typeof vehicleHistory.$inferSelect;
export type InsertVehicleHistory = typeof vehicleHistory.$inferInsert;

/**
 * Documentos gerados pela IA para investigação
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  trialId: int("trialId").notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(),
  issueDate: timestamp("issueDate"),
  issuer: varchar("issuer", { length: 255 }),
  relevance: varchar("relevance", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Votos do júri popular
 */
export const juryVotes = mysqlTable("juryVotes", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  jurorName: varchar("jurorName", { length: 255 }).notNull(),
  vote: varchar("vote", { length: 50 }).notNull(),
  opinion: text("opinion").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JuryVote = typeof juryVotes.$inferSelect;
export type InsertJuryVote = typeof juryVotes.$inferInsert;

/**
 * Recursos (apelações, agravos, embargos) interpostos contra sentenças
 */
export const appeals = mysqlTable("appeals", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  tipo: mysqlEnum("tipo", ["apelacao", "agravo", "embargos"]).notNull(),
  recorrente: varchar("recorrente", { length: 100 }).notNull(),
  razoes: text("razoes").notNull(),
  status: mysqlEnum("status", ["pendente", "julgado"]).default("pendente").notNull(),
  decisao: mysqlEnum("decisao", ["manter", "reformar", "anular"]),
  ementa: text("ementa"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  judgedAt: timestamp("judgedAt"),
});

export type Appeal = typeof appeals.$inferSelect;
export type InsertAppeal = typeof appeals.$inferInsert;

/**
 * Votos dos desembargadores no julgamento do recurso
 */
export const appellateJudges = mysqlTable("appellateJudges", {
  id: int("id").autoincrement().primaryKey(),
  appealId: int("appealId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cargo: varchar("cargo", { length: 100 }).notNull(),
  voto: mysqlEnum("voto", ["manter", "reformar", "anular"]).notNull(),
  fundamentacao: text("fundamentacao").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AppellateJudge = typeof appellateJudges.$inferSelect;
export type InsertAppellateJudge = typeof appellateJudges.$inferInsert;

/**
 * Depoimentos à polícia (podem contradizer depoimentos em tribunal)
 */
export const policeReports = mysqlTable("policeReports", {
  id: int("id").autoincrement().primaryKey(),
  trialId: int("trialId").notNull(),
  personName: varchar("personName", { length: 255 }).notNull(),
  personRole: varchar("personRole", { length: 100 }).notNull(),
  statement: text("statement").notNull(),
  date: varchar("date", { length: 50 }).notNull(),
  contradictions: text("contradictions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PoliceReport = typeof policeReports.$inferSelect;
export type InsertPoliceReport = typeof policeReports.$inferInsert;

/**
 * Audiências anteriores do caso
 */
export const hearings = mysqlTable("hearings", {
  id: int("id").autoincrement().primaryKey(),
  trialId: int("trialId").notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  date: varchar("date", { length: 50 }).notNull(),
  summary: text("summary").notNull(),
  intermediateDecisions: text("intermediateDecisions"),
  wasPostponed: mysqlEnum("wasPostponed", ["sim", "nao"]).default("nao").notNull(),
  postponementReason: text("postponementReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Hearing = typeof hearings.$inferSelect;
export type InsertHearing = typeof hearings.$inferInsert;

/**
 * Salas de julgamento multiplayer
 */
export const rooms = mysqlTable("rooms", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  hostUserId: int("hostUserId").notNull(),
  trialId: int("trialId"),
  sessionId: int("sessionId"),
  status: mysqlEnum("status", ["aguardando", "em_andamento", "concluido"]).default("aguardando").notNull(),
  maxPlayers: int("maxPlayers").default(7).notNull(),
  isPublic: boolean("isPublic").default(false).notNull(),
  theme: mysqlEnum("theme", ["tribunal_moderno", "tribunal_classico", "tribunal_supremo"]).default("tribunal_moderno").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  startedAt: timestamp("startedAt"),
  finishedAt: timestamp("finishedAt"),
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = typeof rooms.$inferInsert;

/**
 * Jogadores em salas multiplayer
 */
export const roomPlayers = mysqlTable("roomPlayers", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull(),
  userId: int("userId").notNull(),
  playerName: varchar("playerName", { length: 255 }).notNull(),
  selectedRole: mysqlEnum("selectedRole", ["juiz", "advogado_defesa", "defensor_publico", "promotor", "assistente_acusacao", "reu", "vitima", "testemunha", "perito", "jurado", "desembargador", "ministro", "procurador_justica", "subprocurador_geral"]),
  isReady: boolean("isReady").default(false).notNull(),
  isOnline: boolean("isOnline").default(true).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
});

export type RoomPlayer = typeof roomPlayers.$inferSelect;
export type InsertRoomPlayer = typeof roomPlayers.$inferInsert;

/**
 * Campanhas (modo história)
 */
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  difficulty: mysqlEnum("difficulty", ["facil", "medio", "dificil", "expert"]).default("medio").notNull(),
  totalCases: int("totalCases").notNull(),
  storyline: text("storyline").notNull(),
  isPublic: boolean("isPublic").default(true).notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

/**
 * Progresso do usuário nas campanhas
 */
export const campaignProgress = mysqlTable("campaignProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  campaignId: int("campaignId").notNull(),
  currentCase: int("currentCase").default(1).notNull(),
  completedCases: int("completedCases").default(0).notNull(),
  decisions: text("decisions"),
  status: mysqlEnum("status", ["em_andamento", "concluido", "abandonado"]).default("em_andamento").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type CampaignProgress = typeof campaignProgress.$inferSelect;
export type InsertCampaignProgress = typeof campaignProgress.$inferInsert;

/**
 * Documentos visuais (PDFs, imagens geradas por IA)
 */
export const visualDocuments = mysqlTable("visualDocuments", {
  id: int("id").autoincrement().primaryKey(),
  trialId: int("trialId").notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  fileUrl: text("fileUrl").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VisualDocument = typeof visualDocuments.$inferSelect;
export type InsertVisualDocument = typeof visualDocuments.$inferInsert;

/**
 * Eventos aleatórios durante o julgamento
 */
export const trialEvents = mysqlTable("trialEvents", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  impact: text("impact"),
  triggeredAt: timestamp("triggeredAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
  isResolved: boolean("isResolved").default(false).notNull(),
});

export type TrialEvent = typeof trialEvents.$inferSelect;
export type InsertTrialEvent = typeof trialEvents.$inferInsert;

/**
 * Casos personalizados criados por usuários
 */
export const customTrials = mysqlTable("customTrials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  trialId: int("trialId").notNull(),
  originalPrompt: text("originalPrompt").notNull(),
  isPublic: boolean("isPublic").default(false).notNull(),
  timesPlayed: int("timesPlayed").default(0).notNull(),
  rating: int("rating").default(0),
  tags: text("tags"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CustomTrial = typeof customTrials.$inferSelect;
export type InsertCustomTrial = typeof customTrials.$inferInsert;
