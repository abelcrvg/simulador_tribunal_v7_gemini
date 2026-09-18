import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function read(file){return fs.readFileSync(path.join(root,file),'utf8');}
function write(file,content){fs.writeFileSync(path.join(root,file),content,'utf8');}

// 1) Schema: habeas corpus + issue key.
let schema=read('drizzle/schema.ts');
schema=schema.replace(
  'tipo: mysqlEnum("tipo", ["apelacao", "agravo", "embargos"]).notNull(),',
  'tipo: mysqlEnum("tipo", ["apelacao", "agravo", "embargos", "habeas_corpus"]).notNull(),\n  questao: varchar("questao", { length: 500 }).notNull().default("questao não especificada"),'
);
write('drizzle/schema.ts',schema);

// 2) Local DB: keep compatibility with the old single-appeal lookup and add a multi-appeal lookup.
let db=read('server/db.ts');
db=db.replace(
  'export async function getAppealBySessionId(sessionId:number){const s=await dbStore();return s.appeals.find(x=>Number(x.sessionId)===sessionId)||null;}\n',
  'export async function getAppealBySessionId(sessionId:number){const s=await dbStore();return s.appeals.find(x=>Number(x.sessionId)===sessionId)||null;}\nexport async function getAppealsBySessionId(sessionId:number){const s=await dbStore();return sortDesc(filter(s.appeals,"sessionId",sessionId),"createdAt");}\n'
);
write('server/db.ts',db);

// 3) Feedback is generated once when the final judgment closes the session and cached locally.
write('server/feedback.ts', `import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import * as db from "./db";

const FEEDBACK_PATH = resolve(process.env.LOCAL_FEEDBACK_PATH || resolve(process.cwd(), "data/feedback-local.json"));
type FeedbackStore = Record<string, any>;

async function loadStore(): Promise<FeedbackStore> {
  try { return JSON.parse(await readFile(FEEDBACK_PATH, "utf8")); }
  catch { return {}; }
}

async function saveStore(store: FeedbackStore) {
  await mkdir(dirname(FEEDBACK_PATH), { recursive: true });
  const tmp = FEEDBACK_PATH + ".tmp";
  await writeFile(tmp, JSON.stringify(store, null, 2), "utf8");
  const { rename } = await import("node:fs/promises");
  await rename(tmp, FEEDBACK_PATH);
}

export async function getCachedFeedback(sessionId: number) {
  const store = await loadStore();
  return store[String(sessionId)] ?? null;
}

export async function generateFeedbackForSession(sessionId: number, invokeLLM: (request: any) => Promise<any>) {
  const cached = await getCachedFeedback(sessionId);
  if (cached) return cached;
  const session = await db.getSessionById(sessionId);
  if (!session) throw new Error("Sessão não encontrada");
  const trial = await db.getTrialById(session.trialId);
  if (!trial) throw new Error("Caso não encontrado");
  const allMessages = await db.getSessionMessages(sessionId);
  const userMessages = allMessages.filter(m => !m.isAI && m.role === session.userRole);
  const userParticipation = userMessages.map(m => m.content).join("\\n\\n") || "O usuário não enviou manifestações diretas.";
  const fullConversation = allMessages.map(m => String(m.role) + ": " + String(m.content)).join("\\n\\n");
  const prompt = "Você é um PROFESSOR DE DIREITO EXPERIENTE analisando a performance de um aluno que atuou como " + session.userRole.toUpperCase() + " em um julgamento simulado.\\n\\n" +
    "=== INFORMAÇÕES DO CASO ===\\n" +
    "Título: " + trial.title + "\\nÁrea: " + trial.area + "\\nDescrição: " + trial.description + "\\nFatos: " + trial.facts + "\\n" +
    "Fundamentação Legal: " + trial.legalBasis + "\\nJurisprudência: " + (trial.jurisprudence || "Não informada") + "\\n\\n" +
    "=== PARTICIPAÇÃO DO ALUNO ===\\n" + userParticipation + "\\n\\n" +
    "=== CONVERSAÇÃO COMPLETA ===\\n" + fullConversation + "\\n\\n" +
    "=== MISSÃO ===\\nGere um feedback educacional em JSON com os campos pontosPositivos, pontosNegativos, jurisprudenciasAplicaveis, leisQueFaltaram, comoMelhorar, notaFinal e comentarioGeral. Avalie somente a atuação registrada no histórico. Seja específico, honesto e construtivo. A nota deve ser de 0 a 10. Responda APENAS com JSON válido.";
  const response = await invokeLLM({ messages: [
    { role: "system", content: "Você é um professor de direito experiente e rigoroso." },
    { role: "user", content: prompt },
  ]});
  const raw = response?.choices?.[0]?.message?.content;
  if (typeof raw !== "string") throw new Error("Resposta inválida ao gerar feedback");
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error("Feedback não retornou JSON válido");
  const feedback = JSON.parse(raw.slice(first, last + 1));
  const store = await loadStore();
  store[String(sessionId)] = { ...feedback, generatedAt: new Date().toISOString() };
  await saveStore(store);
  return store[String(sessionId)];
}
`);

// 4) Routers: feedback helper.
let routers=read('server/routers.ts');
routers=routers.replace(
  'import {\n  buildHearingDirectorPrompt,\n  parseHearingDirectorDecision,\n} from "./ai/hearing-director";\n',
  'import {\n  buildHearingDirectorPrompt,\n  parseHearingDirectorDecision,\n} from "./ai/hearing-director";\nimport { generateFeedbackForSession, getCachedFeedback } from "./feedback";\n'
);

const feedbackPattern=/    \/\/ Gerar feedback detalhado sobre a performance do usuário[\s\S]*?    \/\/ Buscar sessão por ID \(alias para getById\)/;
const feedbackReplacement=`    // Gerar/obter feedback detalhado sobre a performance do usuário
    getFeedback: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const session = await db.getSessionById(input.sessionId);
        if (!session) throw new Error("Sessão não encontrada");
        if (session.userId !== ctx.user.id) throw new Error("Acesso negado");
        if (session.status !== "concluido") {
          throw new Error("O feedback será calculado automaticamente quando o juiz encerrar a sessão.");
        }
        const cached = await getCachedFeedback(input.sessionId);
        if (cached) return cached;
        return generateFeedbackForSession(input.sessionId, invokeLLM);
      }),

    // Buscar sessão por ID (alias para getById)`;
if(!feedbackPattern.test(routers)) throw new Error('Bloco getFeedback não encontrado');
routers=routers.replace(feedbackPattern,feedbackReplacement);

const oldConclusion=`        const shouldConclude = session.status === 'concluido' ||
                              realMessages.length > 15 && // Pelo menos 15 mensagens trocadas
                              (lastMessage.content.toLowerCase().includes('encerrar') ||
                               lastMessage.content.toLowerCase().includes('concluir') ||
                               lastMessage.content.toLowerCase().includes('sentenca') ||
                               lastMessage.content.toLowerCase().includes('sentença') ||
                               lastMessage.content.toLowerCase().includes('veredicto') ||
                               lastMessage.content.toLowerCase().includes('decisão final'));`;
const newConclusion=`        const directorRequestsConclusion =
          directorDecision.action === "sentenca" ||
          directorDecision.action === "encerramento" ||
          /sentença|sentenca|encerramento|decisão final|decisao final|veredicto/i.test(
            directorDecision.content || ""
          );

        const shouldConclude =
          session.status === "concluido" ||
          directorRequestsConclusion ||
          (realMessages.length > 15 &&
            /encerrar|concluir|sentença|sentenca|veredicto|decisão final|decisao final/i.test(
              lastMessage.content
            ));`;
if(!routers.includes(oldConclusion)) throw new Error('Regra antiga de conclusão não encontrada');
routers=routers.replace(oldConclusion,newConclusion);

const oldUpdate=`        if (shouldConclude && nextRole === 'juiz') {
          await db.updateSessionStatus(input.sessionId, 'concluido', aiContent);
        }`;
const newUpdate=`        if (shouldConclude && nextRole === 'juiz') {
          await db.updateSessionStatus(input.sessionId, 'concluido', aiContent);
          try {
            await generateFeedbackForSession(input.sessionId, invokeLLM);
          } catch (feedbackError) {
            console.error("[Feedback automático] Falha ao calcular feedback:", feedbackError);
          }
        }`;
if(!routers.includes(oldUpdate)) throw new Error('Atualização de conclusão não encontrada');
routers=routers.replace(oldUpdate,newUpdate);

const oldInput=`        tipo: z.enum(["apelacao", "agravo", "embargos"]),
        recorrente: z.string(), // "defesa" ou "acusacao"
        razoes: z.string(), // Argumentação do recurso`;
const newInput=`        tipo: z.enum(["apelacao", "agravo", "embargos", "habeas_corpus"]),
        recorrente: z.string(), // "defesa" ou "acusacao"
        questao: z.string().min(5).max(500), // Questão processual específica
        razoes: z.string().min(10), // Argumentação do recurso`;
if(!routers.includes(oldInput)) throw new Error('Input de recurso não encontrado');
routers=routers.replace(oldInput,newInput);

const oldCreate=`      .mutation(async ({ input, ctx }) => {
        const appealId = await db.createAppeal({
          sessionId: input.sessionId,
          tipo: input.tipo,
          recorrente: input.recorrente,
          razoes: input.razoes,
          status: "pendente",
        });
        return { appealId, success: true };
      }),

    // Buscar recurso por sessionId`;
const newCreate=`      .mutation(async ({ input, ctx }) => {
        const session = await db.getSessionById(input.sessionId);
        if (!session) throw new Error("Sessão não encontrada");
        if (session.userId !== ctx.user.id) throw new Error("Acesso negado");

        const existingAppeals = await db.getAppealsBySessionId(input.sessionId);
        const normalizeIssue = (value: string) => value
          .normalize("NFD")
          .replace(/[\\u0300-\\u036f]/g, "")
          .toLowerCase()
          .replace(/\\s+/g, " ")
          .trim();
        const issue = normalizeIssue(input.questao);
        const duplicate = existingAppeals.find(appeal => normalizeIssue(String(appeal.questao || "")) === issue);
        if (duplicate) {
          throw new Error("Já existe um recurso sobre esta mesma questão. Apresente outro recurso somente quando houver uma questão processual diferente.");
        }

        const appealId = await db.createAppeal({
          sessionId: input.sessionId,
          tipo: input.tipo,
          recorrente: input.recorrente,
          questao: input.questao.trim(),
          razoes: input.razoes,
          status: "pendente",
        });
        return { appealId, success: true };
      }),

    // Listar todos os recursos da sessão
    list: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input, ctx }) => {
        const session = await db.getSessionById(input.sessionId);
        if (!session) throw new Error("Sessão não encontrada");
        if (session.userId !== ctx.user.id) throw new Error("Acesso negado");
        return db.getAppealsBySessionId(input.sessionId);
      }),

    // Buscar recurso por sessionId`;
if(!routers.includes(oldCreate)) throw new Error('Criação de recurso não encontrada');
routers=routers.replace(oldCreate,newCreate);

const oldPrompt=`TIPO: ${appeal.tipo.toUpperCase()}
RECORRENTE: ${appeal.recorrente}
RAZÕES DO RECURSO:
${appeal.razoes}`;
const newPrompt=`TIPO: ${appeal.tipo.toUpperCase()}
RECORRENTE: ${appeal.recorrente}
QUESTÃO PROCESSUAL: ${appeal.questao || "Não especificada"}
RAZÕES DO RECURSO:
${appeal.razoes}

${appeal.tipo === "habeas_corpus" ? "HABEAS CORPUS: analise especificamente eventual violência ou coação ilegal à liberdade de locomoção, inclusive as hipóteses dos arts. 647 e 648 do CPP. Neste simulador, MANTER representa denegar o HC, REFORMAR representa conceder o HC e ANULAR representa considerar o pedido prejudicado conforme a fundamentação." : "Analise o recurso conforme sua natureza."}`;
if(!routers.includes(oldPrompt)) throw new Error('Prompt de recurso não encontrado');
routers=routers.replace(oldPrompt,newPrompt);
write('server/routers.ts',routers);

// 5) Client: HC + multiple-resource UI.
let trial=read('client/src/pages/Trial.tsx');
trial=trial.replace(
  'const [tipo, setTipo] = useState<"apelacao" | "agravo" | "embargos">("apelacao");',
  'const [tipo, setTipo] = useState<"apelacao" | "agravo" | "embargos" | "habeas_corpus">("apelacao");'
);
trial=trial.replace(
  'const [recorrente, setRecorrente] = useState("");\n  \n  const interporRecurso',
  'const [recorrente, setRecorrente] = useState("");\n  const [questao, setQuestao] = useState("");\n  \n  const interporRecurso'
);
trial=trial.replace(
  '    if (!recorrente) {\n      alert("Por favor, identifique quem está recorrendo (defesa ou acusação).");\n      return;\n    }\n    interporRecurso.mutate({ sessionId, tipo, recorrente, razoes });',
  '    if (!recorrente) {\n      alert("Por favor, identifique quem está recorrendo (defesa ou acusação).");\n      return;\n    }\n    if (!questao.trim()) {\n      alert("Informe qual questão processual está sendo impugnada. Um novo recurso precisa tratar de uma questão diferente dos anteriores.");\n      return;\n    }\n    interporRecurso.mutate({ sessionId, tipo, recorrente, questao: questao.trim(), razoes });'
);
trial=trial.replace(
  '          <option value="embargos">Embargos</option>\n        </select>',
  '          <option value="embargos">Embargos</option>\n          <option value="habeas_corpus">Habeas Corpus</option>\n        </select>'
);
trial=trial.replace(
  '          {tipo === "embargos" && "Recurso para esclarecer contradições ou omissões"}\n        </p>',
  '          {tipo === "embargos" && "Recurso para esclarecer contradições ou omissões"}\n          {tipo === "habeas_corpus" && "Remédio constitucional para proteger a liberdade de locomoção diante de ilegalidade ou abuso de poder"}\n        </p>'
);
const reasonsMarker=`      <div>\n        <label className="block text-sm font-semibold mb-2">\n          Razões do Recurso (Argumentação Jurídica)\n        </label>`;
const reasonsReplacement=`      <div>\n        <label className="block text-sm font-semibold mb-2">Questão processual impugnada</label>\n        <Textarea\n          value={questao}\n          onChange={(e) => setQuestao(e.target.value)}\n          placeholder="Ex.: nulidade por cerceamento de defesa; prisão cautelar sem fundamentação; omissão na sentença..."\n          className="min-h-[90px]"\n          required\n        />\n        <p className="text-xs text-muted-foreground mt-1">\n          O sistema não permitirá outro recurso sobre a mesma questão. Recursos diferentes podem ser interpostos na mesma sessão.\n        </p>\n      </div>\n\n${reasonsMarker}`;
if(!trial.includes(reasonsMarker)) throw new Error('Campo de razões não encontrado');
trial=trial.replace(reasonsMarker,reasonsReplacement);

const insertionPoint='// Componente para galeria de documentos visuais';
const recursosComponent=`function RecursoItem({ appeal }: { appeal: any }) {
  const { data: judges } = trpc.appeal.getJudges.useQuery({ appealId: appeal.id }, { enabled: !!appeal.id });
  const julgar = trpc.appeal.judge.useMutation({
    onSuccess: () => window.location.reload(),
    onError: (error) => alert("❌ Erro ao julgar recurso: " + error.message),
  });
  const isHC = appeal.tipo === "habeas_corpus";
  const decisionLabel = isHC
    ? (appeal.decisao === "reformar" ? "🟢 HABEAS CORPUS CONCEDIDO" : appeal.decisao === "anular" ? "🟡 PEDIDO PREJUDICADO" : "🔴 HABEAS CORPUS DENEGADO")
    : (appeal.decisao === "manter" ? "✅ SENTENÇA MANTIDA" : appeal.decisao === "reformar" ? "🔄 SENTENÇA REFORMADA" : "❌ SENTENÇA ANULADA");
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-base">{isHC ? "🛡️ Habeas Corpus" : appeal.tipo.charAt(0).toUpperCase() + appeal.tipo.slice(1)}</CardTitle>
        <CardDescription>Questão: {appeal.questao || "Não especificada"} · Status: {appeal.status === "pendente" ? "Pendente" : "Julgado"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-3 rounded-lg"><p className="text-sm font-semibold mb-1">Razões</p><p className="text-sm whitespace-pre-wrap">{appeal.razoes}</p></div>
        {appeal.status === "pendente" && (
          <Button className="w-full" onClick={() => julgar.mutate({ appealId: appeal.id })} disabled={julgar.isPending}>
            {julgar.isPending ? "Julgando..." : "Solicitar Julgamento"}
          </Button>
        )}
        {appeal.status === "julgado" && appeal.decisao && (
          <div className="space-y-3">
            <div className="text-center py-4 bg-primary/10 rounded-lg font-bold">{decisionLabel}</div>
            {appeal.ementa && <p className="text-sm whitespace-pre-wrap bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">{appeal.ementa}</p>}
            {judges && judges.length > 0 && <div className="space-y-3">{judges.map((judge: any) => (
              <Card key={judge.id}><CardHeader className="pb-2"><CardTitle className="text-sm">{judge.nome} - {judge.cargo}</CardTitle></CardHeader><CardContent><p className="text-xs font-semibold">Voto: {judge.voto.toUpperCase()}</p><p className="text-sm whitespace-pre-wrap mt-2">{judge.fundamentacao}</p></CardContent></Card>
            ))}</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecursosView({ sessionId }: { sessionId: number }) {
  const { data: appeals, isLoading } = trpc.appeal.list.useQuery({ sessionId });
  if (isLoading) return <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  if (!appeals || appeals.length === 0) return <p className="text-center text-muted-foreground py-8">Nenhum recurso interposto para esta sessão.</p>;
  return <ScrollArea className="max-h-[60vh] pr-4"><div className="space-y-4">{appeals.map((appeal: any) => <RecursoItem key={appeal.id} appeal={appeal} />)}</div></ScrollArea>;
}

`;
if(!trial.includes(insertionPoint)) throw new Error('Ponto de inserção de RecursosView não encontrado');
trial=trial.replace(insertionPoint,recursoComponent);
trial=trial.replace('<AcordaoView sessionId={sessionId} />','<RecursosView sessionId={sessionId} />');
trial=trial.replace('⚖️ Acórdão - Tribunal de Justiça','⚖️ Recursos e Acórdãos');
trial=trial.replace('Decisão colegiada dos desembargadores sobre o recurso interposto','Acompanhe todos os recursos desta sessão, incluindo Habeas Corpus, e seus respectivos julgamentos');

trial=trial.replace(
  '              <p className="text-xs sm:text-sm text-muted-foreground">\n                Você é: <span className="font-semibold text-foreground">{roleLabels[session.userRole]}</span>\n              </p>',
  `              <p className="text-xs sm:text-sm text-muted-foreground">
                Você é: <span className="font-semibold text-foreground">{roleLabels[session.userRole]}</span>
              </p>
              <div className="mt-1">
                <span className={\`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold \${session.status === "concluido" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : session.status === "abandonado" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"}\`}>
                  {session.status === "concluido" ? "✓ Sentença proferida · Sessão encerrada" : session.status === "abandonado" ? "Sessão abandonada" : "Aguardando sentença do juiz"}
                </span>
              </div>`
);
trial=trial.replace(
  '<span className="hidden sm:inline">Solicitar Feedback</span><span className="sm:hidden">Feedback</span>',
  '<span className="hidden sm:inline">{session.status === "concluido" ? "Ver Feedback" : "Feedback"}</span><span className="sm:hidden">Feedback</span>'
);
write('client/src/pages/Trial.tsx',trial);

let gi=read('.gitignore');
if(!gi.includes('data/feedback-local.json')) gi += '\n# Local generated feedback\ndata/feedback-local.json\n';
write('.gitignore',gi);

console.log('Aplicação das melhorias do simulador concluída.');
