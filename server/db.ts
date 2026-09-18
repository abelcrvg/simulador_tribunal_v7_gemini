/**
 * Persistent local database for Termux/Android.
 *
 * The original Manus project used MySQL through Drizzle.  This build keeps the
 * same db.* API used by the routers, but stores records in a local JSON file so
 * the application does not require a remote MySQL server.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { InsertUser, InsertTrial, InsertSession, InsertMessage, InsertEvidence, InsertParticipant, InsertVehicleHistory, InsertDocument, InsertJuryVote, InsertPoliceReport, InsertHearing, InsertCampaign, InsertCampaignProgress, InsertVisualDocument, InsertTrialEvent, InsertCustomTrial } from "../drizzle/schema";
import { ENV } from "./_core/env";

type RecordData = Record<string, any>;

type Table = RecordData[];

type TableName =
  | "users"
  | "trials"
  | "sessions"
  | "messages"
  | "evidences"
  | "participants"
  | "vehicleHistory"
  | "documents"
  | "juryVotes"
  | "policeReports"
  | "hearings"
  | "rooms"
  | "roomPlayers"
  | "campaigns"
  | "campaignProgress"
  | "visualDocuments"
  | "trialEvents"
  | "customTrials"
  | "appeals"
  | "appellateJudges";

type Store = Record<TableName, Table> & {
  counters: Record<string, number>;
};

const DB_PATH = resolve(process.env.LOCAL_DB_PATH || resolve(process.cwd(), "data/tribunal-local.json"));
let store: Store | null = null;
let loading: Promise<Store> | null = null;
let saveQueue: Promise<void> = Promise.resolve();

const TABLES: TableName[] = [
  "users", "trials", "sessions", "messages", "evidences", "participants", "vehicleHistory",
  "documents", "juryVotes", "policeReports", "hearings", "rooms", "roomPlayers", "campaigns",
  "campaignProgress", "visualDocuments", "trialEvents", "customTrials", "appeals", "appellateJudges",
];

function emptyStore(): Store {
  const s = {
    counters: {},
  } as Store;
  for (const table of TABLES) s[table] = [];
  return s;
}

function revive(value: any): any {
  if (Array.isArray(value)) return value.map(revive);
  if (!value || typeof value !== "object") return value;
  const out: RecordData = {};
  for (const [k, v] of Object.entries(value)) out[k] = revive(v);
  return out;
}

async function loadStore(): Promise<Store> {
  if (store) return store;
  if (!loading) {
    loading = (async () => {
      try {
        const raw = await readFile(DB_PATH, "utf8");
        const parsed = revive(JSON.parse(raw)) as Store;
        const base = emptyStore();
        for (const table of TABLES) base[table] = Array.isArray(parsed[table]) ? parsed[table] : [];
        base.counters = parsed.counters || {};
        store = base;
      } catch {
        store = emptyStore();
        await persist();
      }
      return store;
    })();
  }
  return loading;
}

async function persist() {
  if (!store) return;
  const snapshot = JSON.stringify(store, (_key, value) => value instanceof Date ? value.toISOString() : value, 2);
  saveQueue = saveQueue.then(async () => {
    await mkdir(dirname(DB_PATH), { recursive: true });
    const tmp = `${DB_PATH}.tmp`;
    await writeFile(tmp, snapshot, "utf8");
    const { rename } = await import("node:fs/promises");
    await rename(tmp, DB_PATH);
  });
  await saveQueue;
}

async function dbStore() { return await loadStore(); }

function now() { return new Date(); }
function nextId(s: Store, table: TableName) {
  const max = Math.max(0, ...(s[table] || []).map(r => Number(r.id) || 0));
  const next = Math.max(Number(s.counters?.[table] || 0), max) + 1;
  s.counters![table] = next;
  return next;
}

function normalizeRecord(value: RecordData) {
  const out: RecordData = { ...value };
  for (const [k, v] of Object.entries(out)) {
    if (v instanceof Date) continue;
    if (typeof v === "string" && /At$|^eventDate$|^issueDate$|^judgedAt$/.test(k) && !Number.isNaN(Date.parse(v))) out[k] = new Date(v);
  }
  return out;
}

async function insertOne(table: TableName, value: RecordData, defaults: RecordData = {}) {
  const s = await dbStore();
  const record = normalizeRecord({ ...defaults, ...value });
  if (record.id == null) record.id = nextId(s, table);
  s[table].push(record);
  await persist();
  return record;
}

function byId(rows: RecordData[], id: number) { return rows.find(r => Number(r.id) === Number(id)); }
function filter(rows: RecordData[], field: string, value: any) { return rows.filter(r => String(r[field]) === String(value)); }
function sortAsc(rows: RecordData[], field: string) { return [...rows].sort((a,b) => String(a[field] ?? "").localeCompare(String(b[field] ?? ""), undefined, { numeric: true })); }
function sortDesc(rows: RecordData[], field: string) { return [...rows].sort((a,b) => String(b[field] ?? "").localeCompare(String(a[field] ?? ""), undefined, { numeric: true })); }

/** Compatibility hook: routers in the local build should use db.* helpers. */
export async function getDb() { return null; }

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const s = await dbStore();
  const existing = s.users.find(u => u.openId === user.openId);
  const timestamp = now();
  if (existing) {
    Object.assign(existing, user, { updatedAt: timestamp, lastSignedIn: user.lastSignedIn || timestamp });
    if (!user.role && user.openId === ENV.ownerOpenId) existing.role = "admin";
  } else {
    await insertOne("users", {
      ...user,
      role: user.role || (user.openId === ENV.ownerOpenId ? "admin" : "user"),
      createdAt: timestamp, updatedAt: timestamp, lastSignedIn: user.lastSignedIn || timestamp,
    });
    return;
  }
  await persist();
}

export async function getUserByOpenId(openId: string) { const s = await dbStore(); return s.users.find(u => u.openId === openId); }
export async function updateUserApiKey(openId: string, apiKey: string | null) { const s = await dbStore(); const u = s.users.find(x => x.openId === openId); if (u) { u.openaiApiKey = apiKey; u.updatedAt = now(); await persist(); } }
export async function getUserById(id: number) { const s = await dbStore(); return byId(s.users, id); }

export async function createTrial(trial: InsertTrial) { return (await insertOne("trials", trial, { createdAt: now() })).id; }
export async function getTrialById(id: number) { const s = await dbStore(); return byId(s.trials, id); }

export async function createSession(session: InsertSession) { return (await insertOne("sessions", session, { status: "em_andamento", juriVotou: false, instancia: "primeira", isMultiplayer: false, createdAt: now(), updatedAt: now() })).id; }
export async function getSessionById(id: number) { const s = await dbStore(); return byId(s.sessions, id); }
export async function getUserSessions(userId: number) { const s = await dbStore(); return sortDesc(filter(s.sessions, "userId", userId), "createdAt"); }
export async function updateSessionStatus(id: number, status: "em_andamento" | "concluido" | "abandonado", verdict?: string) { const s = await dbStore(); const r = byId(s.sessions,id); if (!r) return; Object.assign(r,{status, ...(verdict !== undefined ? {verdict}:{}) ,updatedAt:now()}); await persist(); }
export async function updateSessionJuryVoted(id: number, juriVotou: boolean) { const s=await dbStore(); const r=byId(s.sessions,id); if(r){r.juriVotou=juriVotou;r.updatedAt=now();await persist();} }
export async function updateSessionDecision(id:number, decisionDetails:string, status?: "em_andamento"|"concluido"|"abandonado") { const s=await dbStore(); const r=byId(s.sessions,id); if(r){r.decisionDetails=decisionDetails;if(status)r.status=status;r.updatedAt=now();await persist();} }
export async function getChildSessions(parentSessionId:number) { const s=await dbStore(); return filter(s.sessions,"parentSessionId",parentSessionId); }

export async function createMessage(message: InsertMessage) { return (await insertOne("messages", message, {createdAt:now()})).id; }
export async function getSessionMessages(sessionId: number) { const s=await dbStore(); return sortAsc(filter(s.messages,"sessionId",sessionId),"createdAt"); }

export async function createEvidence(evidence: InsertEvidence) { return (await insertOne("evidences", evidence,{createdAt:now()})).id; }
export async function getTrialEvidences(trialId: number) { const s=await dbStore(); return sortAsc(filter(s.evidences,"trialId",trialId),"createdAt"); }
export async function createMultipleEvidences(list: InsertEvidence[]) { const out=[]; for(const x of list) out.push(await insertOne("evidences",x,{createdAt:now()})); return out; }

export async function createParticipant(p: InsertParticipant) { return (await insertOne("participants",p,{isUser:false,createdAt:now()})).id; }
export async function getSessionParticipants(sessionId:number){const s=await dbStore();return sortAsc(filter(s.participants,"sessionId",sessionId),"createdAt");}
export async function createMultipleParticipants(list:InsertParticipant[]){const out=[];for(const x of list)out.push(await insertOne("participants",x,{isUser:false,createdAt:now()}));return out;}

export async function getVehicleHistory(trialId:number){const s=await dbStore();return sortAsc(filter(s.vehicleHistory,"trialId",trialId),"eventDate");}
export async function createMultipleVehicleHistory(list:InsertVehicleHistory[]){const out=[];for(const x of list)out.push(await insertOne("vehicleHistory",x,{createdAt:now()}));return out;}
export async function getDocuments(trialId:number){const s=await dbStore();return sortDesc(filter(s.documents,"trialId",trialId),"relevance").sort((a,b)=>String(a.createdAt??"").localeCompare(String(b.createdAt??"")));}
export async function createMultipleDocuments(list:InsertDocument[]){const out=[];for(const x of list)out.push(await insertOne("documents",x,{createdAt:now()}));return out;}

export async function createJuryVote(v:InsertJuryVote){return (await insertOne("juryVotes",v,{createdAt:now()})).id;}
export async function getJuryVotes(sessionId:number){const s=await dbStore();return filter(s.juryVotes,"sessionId",sessionId);}
export async function createPoliceReport(r:InsertPoliceReport){return (await insertOne("policeReports",r,{createdAt:now()})).id;}
export async function createMultiplePoliceReports(list:InsertPoliceReport[]){for(const x of list)await insertOne("policeReports",x,{createdAt:now()});}
export async function getPoliceReportsByTrial(trialId:number){const s=await dbStore();return filter(s.policeReports,"trialId",trialId);}
export async function updateTrial(id:number,data:Partial<InsertTrial>){const s=await dbStore();const r=byId(s.trials,id);if(r){Object.assign(r,data);await persist();}}
export async function createHearings(list:InsertHearing[]){for(const x of list)await insertOne("hearings",x,{createdAt:now()});}
export async function getHearingsByTrial(trialId:number){const s=await dbStore();return filter(s.hearings,"trialId",trialId);}

export async function createRoom(hostUserId:number,maxPlayers=7,isPublic=false){const code=Math.random().toString(36).substring(2,8).toUpperCase();const r=await insertOne("rooms",{code,hostUserId,maxPlayers,isPublic,status:"aguardando",theme:"tribunal_moderno"},{createdAt:now()});return {id:r.id,code};}
export async function getRoomByCode(code:string){const s=await dbStore();return s.rooms.find(r=>r.code===code)||null;}
export async function getRoomById(id:number){const s=await dbStore();return byId(s.rooms,id)||null;}
export async function addPlayerToRoom(roomId:number,userId:number,playerName:string){const s=await dbStore();let p=s.roomPlayers.find(x=>Number(x.roomId)===roomId&&Number(x.userId)===userId);if(p){p.isOnline=true;p.lastSeenAt=now();await persist();return p;}return insertOne("roomPlayers",{roomId,userId,playerName,isOnline:true,isReady:false},{createdAt:now()});}
export async function removePlayerFromRoom(roomId:number,userId:number){const s=await dbStore();s.roomPlayers=s.roomPlayers.filter(x=>!(Number(x.roomId)===roomId&&Number(x.userId)===userId));await persist();}
export async function getRoomPlayers(roomId:number){const s=await dbStore();return filter(s.roomPlayers,"roomId",roomId);}
export async function updatePlayerReady(roomId:number,userId:number,isReady:boolean){const s=await dbStore();const p=s.roomPlayers.find(x=>Number(x.roomId)===roomId&&Number(x.userId)===userId);if(p){p.isReady=isReady;await persist();}}
export async function updatePlayerRole(roomId:number,userId:number,role:string){const s=await dbStore();const p=s.roomPlayers.find(x=>Number(x.roomId)===roomId&&Number(x.userId)===userId);if(p){p.selectedRole=role;await persist();}}
export async function updateRoomStatus(roomId:number,status:"aguardando"|"em_andamento"|"concluido",sessionId?:number){const s=await dbStore();const r=byId(s.rooms,roomId);if(r){r.status=status;if(status==="em_andamento")r.startedAt=now();if(status==="concluido")r.finishedAt=now();if(sessionId)r.sessionId=sessionId;await persist();}}
export async function getPublicRooms(){const s=await dbStore();return sortAsc(s.rooms.filter(r=>r.isPublic===true),"createdAt");}

export async function createCampaign(c:InsertCampaign){return (await insertOne("campaigns",c,{createdAt:now()})).id;}
export async function getCampaignById(id:number){const s=await dbStore();return byId(s.campaigns,id);}
export async function getAllCampaigns(){const s=await dbStore();return sortDesc(s.campaigns.filter(x=>x.isPublic===true),"createdAt");}
export async function createCampaignProgress(p:InsertCampaignProgress){return (await insertOne("campaignProgress",p,{startedAt:now()})).id;}
export async function getCampaignProgress(userId:number,campaignId:number){const s=await dbStore();return s.campaignProgress.find(x=>Number(x.userId)===userId&&Number(x.campaignId)===campaignId);}
export async function updateCampaignProgress(id:number,data:Partial<InsertCampaignProgress>){const s=await dbStore();const r=byId(s.campaignProgress,id);if(r){Object.assign(r,data);await persist();}}
export async function getUserCampaigns(userId:number){const s=await dbStore();return sortDesc(filter(s.campaignProgress,"userId",userId),"startedAt");}
export async function createVisualDocument(d:InsertVisualDocument){return (await insertOne("visualDocuments",d,{createdAt:now()})).id;}
export async function getVisualDocuments(trialId:number){const s=await dbStore();return sortAsc(filter(s.visualDocuments,"trialId",trialId),"createdAt");}
export async function createTrialEvent(e:InsertTrialEvent){return (await insertOne("trialEvents",e,{triggeredAt:now()})).id;}
export async function getTrialEvents(sessionId:number){const s=await dbStore();return sortAsc(filter(s.trialEvents,"sessionId",sessionId),"triggeredAt");}
export async function updateTrialEvent(id:number,data:Partial<InsertTrialEvent>){const s=await dbStore();const r=byId(s.trialEvents,id);if(r){Object.assign(r,data);await persist();}}
export async function createCustomTrial(c:InsertCustomTrial){return (await insertOne("customTrials",c,{createdAt:now()})).id;}
export async function getCustomTrialById(id:number){const s=await dbStore();return byId(s.customTrials,id);}
export async function getUserCustomTrials(userId:number){const s=await dbStore();return sortDesc(filter(s.customTrials,"userId",userId),"createdAt");}
export async function getPublicCustomTrials(){const s=await dbStore();return [...s.customTrials.filter(x=>x.isPublic===true)].sort((a,b)=>((Number(b.timesPlayed)||0)-(Number(a.timesPlayed)||0))||((Number(b.rating)||0)-(Number(a.rating)||0)));}
export async function incrementCustomTrialPlays(id:number){const s=await dbStore();const r=byId(s.customTrials,id);if(r){r.timesPlayed=(Number(r.timesPlayed)||0)+1;await persist();}}

// Appeals / appellate judges
export async function createAppeal(data:RecordData){return (await insertOne("appeals",data,{status:"pendente",createdAt:now()})).id;}
export async function getAppealBySessionId(sessionId:number){const s=await dbStore();return s.appeals.find(x=>Number(x.sessionId)===sessionId)||null;}
export async function getAppealById(id:number){const s=await dbStore();return byId(s.appeals,id)||null;}
export async function getAppellateJudges(appealId:number){const s=await dbStore();return filter(s.appellateJudges,"appealId",appealId);}
export async function updateAppeal(id:number,data:RecordData){const s=await dbStore();const r=byId(s.appeals,id);if(r){Object.assign(r,data);await persist();}}
export async function createAppellateJudge(data:RecordData){return (await insertOne("appellateJudges",data,{createdAt:now()})).id;}

export function getLocalDatabasePath(){return DB_PATH;}
