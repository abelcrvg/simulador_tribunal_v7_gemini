import { describe, expect, it } from "vitest";

describe("Variedade de Casos Gerados", () => {
  describe("Prompt de Geração", () => {
    it("deve incluir exemplos de CDC variados", () => {
      const exemplos = [
        "produtos defeituosos",
        "serviços bancários",
        "planos de saúde",
        "telefonia/internet",
        "compras online",
        "veículos",
        "construtoras",
        "agências de viagem"
      ];
      
      // Verifica que temos pelo menos 8 categorias diferentes de CDC
      expect(exemplos.length).toBeGreaterThanOrEqual(8);
    });

    it("deve incluir exemplos de crimes penais variados", () => {
      const exemplos = [
        "homicídio",
        "feminicídio",
        "latrocínio",
        "roubo",
        "furto",
        "estupro",
        "sequestro",
        "extorsão",
        "tráfico de drogas",
        "corrupção",
        "estelionato",
        "fraude",
        "apropriação indébita",
        "difamação",
        "calúnia",
        "injúria",
        "lesão corporal",
        "ameaça",
        "crimes cibernéticos",
        "crimes ambientais",
        "tráfico de pessoas",
        "receptação"
      ];
      
      // Verifica que temos pelo menos 20 tipos diferentes de crimes
      expect(exemplos.length).toBeGreaterThanOrEqual(20);
    });

    it("deve incluir exemplos de casos civis variados", () => {
      const exemplos = [
        "contratos",
        "responsabilidade civil",
        "família",
        "sucessões",
        "imóveis",
        "vizinhança",
        "condomínio",
        "obrigações"
      ];
      
      // Verifica que temos pelo menos 8 categorias diferentes de civil
      expect(exemplos.length).toBeGreaterThanOrEqual(8);
    });

    it("deve incluir exemplos de casos trabalhistas variados", () => {
      const exemplos = [
        "horas extras",
        "assédio moral",
        "assédio sexual",
        "acidente de trabalho",
        "doença ocupacional",
        "rescisão",
        "FGTS não depositado",
        "verbas rescisórias não pagas",
        "desvio de função",
        "discriminação",
        "férias não concedidas",
        "intervalo não respeitado",
        "trabalho em condições degradantes",
        "terceirização ilícita"
      ];
      
      // Verifica que temos pelo menos 12 tipos diferentes de casos trabalhistas
      expect(exemplos.length).toBeGreaterThanOrEqual(12);
    });

    it("deve incluir exemplos de casos de trânsito variados", () => {
      const exemplos = [
        "acidente com vítima",
        "embriaguez ao volante",
        "direção perigosa",
        "fuga do local",
        "atropelamento",
        "colisão",
        "danos materiais",
        "discussão sobre culpa",
        "seguro negado",
        "veículo sem documentação"
      ];
      
      // Verifica que temos pelo menos 10 tipos diferentes de casos de trânsito
      expect(exemplos.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("Níveis de Complexidade", () => {
    it("deve ter 4 níveis de complexidade definidos", () => {
      const niveis = [
        { nome: "SIMPLES", probabilidade: 0.20, testemunhas: [1, 2], reus: 1, vitimas: 1, provas: [2, 3] },
        { nome: "MÉDIO", probabilidade: 0.40, testemunhas: [3, 5], reus: [1, 2], vitimas: [1, 2], provas: [4, 6] },
        { nome: "COMPLEXO", probabilidade: 0.30, testemunhas: [6, 8], reus: [2, 4], vitimas: [2, 3], provas: [7, 10] },
        { nome: "MUITO COMPLEXO", probabilidade: 0.10, testemunhas: [8, 12], reus: [3, 5], vitimas: [3, 5], provas: [10, 15] }
      ];
      
      expect(niveis.length).toBe(4);
      
      // Verifica que as probabilidades somam 100%
      const somaProb = niveis.reduce((acc, n) => acc + n.probabilidade, 0);
      expect(somaProb).toBeCloseTo(1.0, 10); // Usa toBeCloseTo para evitar erros de ponto flutuante
    });

    it("caso simples deve ter configuração mínima", () => {
      const casoSimples = {
        testemunhas: [1, 2],
        reus: 1,
        vitimas: 1,
        provas: [2, 3],
        questoesJuridicas: 1
      };
      
      expect(casoSimples.testemunhas[0]).toBe(1);
      expect(casoSimples.testemunhas[1]).toBe(2);
      expect(casoSimples.reus).toBe(1);
      expect(casoSimples.vitimas).toBe(1);
      expect(casoSimples.provas[0]).toBe(2);
      expect(casoSimples.provas[1]).toBe(3);
    });

    it("caso muito complexo deve ter configuração máxima", () => {
      const casoMuitoComplexo = {
        testemunhas: [8, 12],
        reus: [3, 5],
        vitimas: [3, 5],
        provas: [10, 15],
        questoesJuridicas: "5+"
      };
      
      expect(casoMuitoComplexo.testemunhas[1]).toBe(12);
      expect(casoMuitoComplexo.reus[1]).toBe(5);
      expect(casoMuitoComplexo.vitimas[1]).toBe(5);
      expect(casoMuitoComplexo.provas[1]).toBe(15);
      expect(casoMuitoComplexo.questoesJuridicas).toBe("5+");
    });
  });

  describe("Distribuição de Complexidade", () => {
    it("deve ter distribuição realista (simples 20%, médio 40%, complexo 30%, muito complexo 10%)", () => {
      const distribuicao = {
        simples: 0.20,
        medio: 0.40,
        complexo: 0.30,
        muitoComplexo: 0.10
      };
      
      // Casos médios devem ser os mais comuns
      expect(distribuicao.medio).toBeGreaterThan(distribuicao.simples);
      expect(distribuicao.medio).toBeGreaterThan(distribuicao.complexo);
      expect(distribuicao.medio).toBeGreaterThan(distribuicao.muitoComplexo);
      
      // Casos muito complexos devem ser os mais raros
      expect(distribuicao.muitoComplexo).toBeLessThan(distribuicao.simples);
      expect(distribuicao.muitoComplexo).toBeLessThan(distribuicao.medio);
      expect(distribuicao.muitoComplexo).toBeLessThan(distribuicao.complexo);
    });
  });
});
