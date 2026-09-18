import { InferenceClient } from "@huggingface/inference";
import fs from "node:fs/promises";

const token = process.env.HF_TOKEN;

if (!token) {
  throw new Error("HF_TOKEN não configurado");
}

const client = new InferenceClient(token);

async function main() {
  console.log("Iniciando geração...");
  console.log("Modelo: black-forest-labs/FLUX.1-dev");
  console.log("Provider: auto");

  const timeout = setTimeout(() => {
    console.error("TIMEOUT: Hugging Face não respondeu em 90 segundos.");
    process.exit(2);
  }, 90000);

  try {
    const image = await client.textToImage({
      model: "black-forest-labs/FLUX.1-dev",
      inputs:
        "A realistic Brazilian crime scene investigation at night, forensic police officers examining evidence, police tape, realistic documentary photography",
      provider: "auto",
    });

    clearTimeout(timeout);

    const buffer = Buffer.from(await image.arrayBuffer());

    await fs.writeFile("test_hf_image.png", buffer);

    console.log("SUCESSO!");
    console.log("Arquivo: test_hf_image.png");
    console.log("Tamanho:", buffer.length, "bytes");
  } catch (error) {
    clearTimeout(timeout);

    console.error("ERRO:");
    console.error(error);
  }
}

main().catch((error) => {
  console.error("ERRO FATAL:");
  console.error(error);
  process.exit(1);
});
