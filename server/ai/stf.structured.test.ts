import { describe, expect, it } from "vitest";
import {
  collectSTFVotes,
  createSTFVoteFromSpeech,
  mergeSTFVotes,
} from "./stf";

describe("votos estruturados do STF", () => {
  it("extrai cargo, posição e tese da fala do ministro", () => {
    const vote = createSTFVoteFromSpeech({
      speech: "[VOTO] Voto pela procedência da ação. [TESE] A reserva de jurisdição exige autorização judicial prévia.",
      participant: {
        name: "Ministro Aureliano Bastos",
        description: "[PRESIDENTE] Presidente do STF.",
        isUser: false,
      },
      messageId: 42,
    });

    expect(vote).not.toBeNull();
    expect(vote?.position).toBe("procedente");
    expect(vote?.office).toBe("presidente");
    expect(vote?.tese).toContain("reserva de jurisdição");
    expect(vote?.origin).toBe("voto");
    expect(vote?.messageId).toBe(42);
  });

  it("reconhece pedido de vista e divergência", () => {
    const vista = createSTFVoteFromSpeech({
      speech: "Peço vista dos autos para melhor apreciação.",
      participant: { name: "Ministra Clara Villela", description: "[VOGAL] Vogal." },
    });
    expect(vista?.vista).toBe(true);

    const divergencia = createSTFVoteFromSpeech({
      speech: "[DIVERGÊNCIA] Voto pela improcedência, com modulação.",
      participant: { name: "Ministro Otávio Ribeiro", description: "[VOGAL] Vogal." },
    });
    expect(divergencia?.divergencia).toBe(true);
    expect(divergencia?.origin).toBe("divergencia");
  });

  it("não registra voto quando a fala não manifesta posição", () => {
    const vote = createSTFVoteFromSpeech({
      speech: "Cumprimento o Relator pela leitura do relatório.",
      participant: { name: "Ministro Sérgio Portela", description: "[VOGAL] Vogal." },
    });
    expect(vote).toBeNull();
  });

  it("prefere o voto estruturado ao inferido e não duplica ministros", () => {
    const structured = createSTFVoteFromSpeech({
      speech: "[VOTO] Procedente. [TESE] Tese fixada pelo Plenário.",
      participant: { name: "Ministro Aureliano Bastos", description: "[PRESIDENTE] Presidente." },
    })!;

    const votes = collectSTFVotes(
      [{ role: "ministro", senderName: "Ministro Aureliano Bastos", content: "[VOTO] Procedente." }],
      [{ name: "Ministro Aureliano Bastos", role: "ministro" }],
      [structured],
    );

    expect(votes).toHaveLength(1);
    expect(votes[0].office).toBe("presidente");
    expect(votes[0].tese).toContain("Tese fixada");
  });

  it("mescla votos inferidos de ministros ainda não registrados", () => {
    const merged = mergeSTFVotes(
      [{ ministerName: "A", isUser: false, position: "procedente", origin: "voto", excerpt: "" }],
      [{ ministerName: "B", isUser: false, position: "improcedente", origin: "inferido", excerpt: "" }],
    );
    expect(merged.map(v => v.ministerName)).toEqual(["A", "B"]);
  });
});
