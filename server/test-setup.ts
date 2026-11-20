import { readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterAll } from "vitest";

const worker = process.env.VITEST_POOL_ID ?? process.pid;
const dbPath = join(tmpdir(), `simulador-tribunal-test-${worker}.json`);
const prefix = basename(dbPath);

process.env.LOCAL_DB_PATH = dbPath;

function cleanup() {
  for (const name of readdirSync(tmpdir())) {
    if (name.startsWith(prefix)) rmSync(join(tmpdir(), name), { force: true });
  }
}

cleanup();
afterAll(cleanup);
