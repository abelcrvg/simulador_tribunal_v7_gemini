import { createMessage } from './db';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function testConcurrency() {
  const DB_PATH = resolve(process.cwd(), 'data/tribunal-local.json');
  const SESSION_ID = 1; // Use an existing or dummy session
  const COUNT = 50;

  console.log(`Starting concurrency test: ${COUNT} messages...`);

  try {
    const promises = [];
    for (let i = 0; i < COUNT; i++) {
      promises.push(createMessage({
        sessionId: SESSION_ID,
        role: 'test_role',
        content: `Concurrent message ${i}`,
        isAI: true,
      }));
    }

    await Promise.all(promises);
    console.log('All promises resolved.');

    const data = JSON.parse(await readFile(DB_PATH, 'utf8'));
    const messages = data.messages || [];
    const sessionMessages = messages.filter((m: any) => m.sessionId === SESSION_ID);

    console.log(`Messages for session ${SESSION_ID} in JSON: ${sessionMessages.length}`);

    if (sessionMessages.length >= COUNT) {
      console.log('✅ SUCCESS: No messages lost.');
    } else {
      console.error(`❌ FAILURE: Lost ${COUNT - sessionMessages.length} messages.`);
      process.exit(1);
    }

    const ids = sessionMessages.map((m: any) => m.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size === sessionMessages.length) {
      console.log('✅ SUCCESS: No duplicate IDs.');
    } else {
      console.error('❌ FAILURE: Duplicate IDs found.');
      process.exit(1);
    }

  } catch (err) {
    console.error('Test crashed:', err);
    process.exit(1);
  }
}

testConcurrency();
