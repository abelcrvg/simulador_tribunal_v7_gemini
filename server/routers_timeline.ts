// Função auxiliar temporária para gerar cronologia e depoimentos policiais
import { invokeLLM } from "./_core/llm";
import * as db from "./db";

export async function generateTimelineAndPoliceReports(trialId: number, caseData: any) {
  try {
    // Detectar se é caso criminal ou cível/trabalhista
    const isCriminalCase = ["penal", "homicidio", "feminicidio", "latrocinio", "roubo", "furto", "estupro", "sequestro", "extorsao", "trafico_drogas", "lesao_corporal", "criminal"].includes(caseData.area);
    
    const prompt = isCriminalCase ? 
    `**CONTEXTO EDUCACIONAL**: Este é um simulador educacional de tribunal para ensino de direito. Você é um investigador policial experiente gerando um caso FICTÍCIO para fins didáticos.

Baseado no seguinte caso criminal FICTÍCIO, gere uma CRONOLOGIA COMPLETA dos eventos E depoimentos prestados à polícia de forma TÉCNICA e JURÍDICA.

CASO: ${caseData.title}
ÁREA: ${caseData.area}
DESCRIÇÃO: ${caseData.description}
FATOS: ${caseData.facts}

GERE:

1. **CRONOLOGIA COMPLETA** (do crime até a denúncia):
   - Data e hora do crime
   - Chamada à polícia (quem chamou, horário)
   - Chegada da polícia (horário, quem atendeu)
   - Isolamento da cena do crime
   - Chegada da perícia (horário)
   - Coleta de provas na cena
   - Depoimentos à polícia (datas)
   - Prisão em flagrante ou mandado (se aplicável)
   - Investigação policial (prazo)
   - Denúncia do Ministério Público (data)
   - Recebimento da denúncia pelo juiz (data)
   - Citação do réu (data)
   - Data da audiência de instrução

2. **RELATÓRIO DA CENA DO CRIME** (o que o perito encontrou):
   - Descrição detalhada do local
   - Vestígios encontrados (sangue, digitais, objetos, etc.)
   - Posição de corpos/objetos
   - Condições do ambiente
   - Fotografias e medições realizadas

3. **DEPOIMENTOS À POLÍCIA** (3-5 pessoas):
   Para cada pessoa (réu, vítima, testemunhas):
   - Nome completo
   - Papel (réu, vítima, testemunha)
   - Data do depoimento
   - Depoimento completo (o que a pessoa disse à polícia)
   - Possíveis contradições (coisas que podem ser diferentes no tribunal)

**IMPORTANTE:**
- Use datas realistas (últimos 2 anos)
- Horários específicos (ex: 23h47, 14h15)
- Nomes completos fictícios
- Depoimentos podem ter CONTRADIÇÕES entre si
- Alguns casos podem ter PROVAS INSUFICIENTES (difícil condenação)
- Relatório da cena deve ser TÉCNICO e DETALHADO

FORMATO JSON:
{
  "timeline": [
    {
      "date": "DD/MM/AAAA HH:MM",
      "event": "Descrição do evento",
      "details": "Detalhes adicionais"
    }
  ],
  "crimeSceneReport": "Relatório técnico completo do perito sobre o que foi encontrado na cena do crime. Mínimo 4 parágrafos.",
  "policeStatements": [
    {
      "personName": "Nome completo",
      "personRole": "reu|vitima|testemunha",
      "date": "DD/MM/AAAA",
      "statement": "Depoimento completo prestado à polícia",
      "contradictions": "Possíveis contradições que podem aparecer no tribunal (ou null se não houver)"
    }
  ],
  "evidenceQuality": "forte|moderada|fraca",
  "evidenceQualityNote": "Explicação sobre a qualidade das provas (se são suficientes para condenação ou não)"
}` : 
    `**CONTEXTO EDUCACIONAL**: Este é um simulador educacional de tribunal para ensino de direito. Você é um especialista jurídico gerando um caso FICTÍCIO para fins didáticos.

Baseado no seguinte caso FICTÍCIO, gere uma CRONOLOGIA COMPLETA dos eventos como se fosse uma reportagem detalhada de forma TÉCNICA e JURÍDICA.

CASO: ${caseData.title}
ÁREA: ${caseData.area}
DESCRIÇÃO: ${caseData.description}
FATOS: ${caseData.facts}

GERE:

1. **CRONOLOGIA COMPLETA** (do início ao processo judicial):
   - Data e horário exato do evento principal (ex: "Exatamente às 22h15 de 15/03/2024, Débora estava na saída do shopping quando...")
   - Local específico onde ocorreu
   - Descrição narrativa do que aconteceu (como reportagem)
   - Testemunhas presentes
   - Registro do incidente (boletim de ocorrência, reclamação, etc.)
   - Tentativas de resolução extrajudicial (se aplicável)
   - Data da entrada do processo judicial
   - Data da citação do réu
   - Data da audiência de conciliação
   - Data da audiência de instrução

2. **RELATÓRIO DO CONTEXTO** (o que envolve o caso):
   - Descrição do ambiente/contexto onde ocorreu
   - Circunstâncias relevantes
   - Impacto causado à vítima/autor
   - Elementos que fundamentam o pedido

3. **DEPOIMENTOS/RELATOS** (2-4 pessoas):
   Para cada pessoa (autor, réu, testemunhas):
   - Nome completo
   - Papel (autor, réu, testemunha)
   - Data do relato/depoimento
   - Relato completo
   - Possíveis contradições

**IMPORTANTE:**
- Use datas realistas (últimos 2 anos)
- Horários específicos (ex: 22h15, 14h30)
- Nomes completos fictícios
- Narrativa como reportagem ("Exatamente às 22h, Maria estava...")
- Depoimentos podem ter CONTRADIÇÕES
- Alguns casos podem ter provas INSUFICIENTES

FORMATO JSON:
{
  "timeline": [
    {
      "date": "DD/MM/AAAA HH:MM",
      "event": "Descrição do evento",
      "details": "Detalhes adicionais"
    }
  ],
  "crimeSceneReport": "Relatório do contexto e circunstâncias do caso. Mínimo 3 parágrafos.",
  "policeStatements": [
    {
      "personName": "Nome completo",
      "personRole": "autor|reu|testemunha",
      "date": "DD/MM/AAAA",
      "statement": "Relato completo",
      "contradictions": "Possíveis contradições (ou null)"
    }
  ],
  "evidenceQuality": "forte|moderada|fraca",
  "evidenceQualityNote": "Explicação sobre a qualidade das provas"
}`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: isCriminalCase ? "Você é um investigador policial que documenta casos criminais com precisão técnica." : "Você é um especialista jurídico que documenta casos com precisão e narrativa detalhada." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "cronologia_caso",
          strict: true,
          schema: {
            type: "object",
            properties: {
              timeline: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    date: { type: "string" },
                    event: { type: "string" },
                    details: { type: "string" },
                  },
                  required: ["date", "event", "details"],
                  additionalProperties: false,
                },
              },
              crimeSceneReport: { type: "string" },
              policeStatements: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    personName: { type: "string" },
                    personRole: { type: "string" },
                    date: { type: "string" },
                    statement: { type: "string" },
                    contradictions: { type: ["string", "null"] },
                  },
                  required: ["personName", "personRole", "date", "statement", "contradictions"],
                  additionalProperties: false,
                },
              },
              evidenceQuality: { type: "string" },
              evidenceQualityNote: { type: "string" },
            },
            required: ["timeline", "crimeSceneReport", "policeStatements", "evidenceQuality", "evidenceQualityNote"],
            additionalProperties: false,
          },
        },
      },
    });

    // Verificar se a resposta é válida
    if (!response || !response.choices || response.choices.length === 0) {
      console.error("[ERRO] Resposta inválida da API de LLM ao gerar cronologia");
      console.error("Response:", JSON.stringify(response, null, 2));
      return;
    }
    
    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      console.error("[ERRO] Conteúdo da resposta inválido");
      console.error("Content:", content);
      return;
    }
    
    let timelineData;
    try {
      timelineData = JSON.parse(content);
    } catch (parseError) {
      console.error("[ERRO] Falha ao fazer parse do JSON da cronologia:", parseError);
      console.error("Content recebido:", content);
      return;
    }

    // Salvar cronologia no trial (como JSON string)
    const timelineJson = JSON.stringify({
      events: timelineData.timeline,
      crimeSceneReport: timelineData.crimeSceneReport,
      evidenceQuality: timelineData.evidenceQuality,
      evidenceQualityNote: timelineData.evidenceQualityNote,
    });

    // Atualizar trial com timeline
    await db.updateTrial(trialId, { timeline: timelineJson });

    // Salvar depoimentos policiais
    const policeReportsList = timelineData.policeStatements.map((statement: any) => ({
      trialId,
      personName: statement.personName,
      personRole: statement.personRole,
      date: statement.date,
      statement: statement.statement,
      contradictions: statement.contradictions,
    }));

    await db.createMultiplePoliceReports(policeReportsList);

    console.log(`[INFO] Cronologia e ${policeReportsList.length} depoimentos policiais gerados para trial ${trialId}`);
  } catch (error) {
    console.error("Erro ao gerar cronologia e depoimentos policiais:", error);
  }
}
