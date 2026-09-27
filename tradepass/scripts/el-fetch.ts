// Run with: npx tsx scripts/el-fetch.ts <conversation_id>
//
// Fetches a finished ElevenLabs conversation via lib/elevenlabs/server.ts (the same
// helper the real app uses) and prints its transcript, tool calls, and parsed
// data-collection fields. Useful for checking a conversation without going through
// the app's own routes.
//
// Reads ELEVENLABS_API_KEY from .env.local (via dotenv). Never prints the key.

import path from 'node:path';
import { config } from 'dotenv';

config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

import { waitForConversation, parseJsonField, toTranscriptLines } from '../lib/elevenlabs/server';

const JSON_FIELDS = ['employments_json', 'transcript_english_json', 'confirmations_json'] as const;

function hr(title: string): void {
  console.log(`\n=== ${title} ${'='.repeat(Math.max(0, 70 - title.length))}`);
}

async function main(): Promise<void> {
  const id = (process.argv[2] ?? '').trim();
  if (!id) {
    console.error('Usage: npx tsx scripts/el-fetch.ts <conversation_id>');
    process.exit(2);
  }

  hr(`Fetching ${id}`);
  const conv = await waitForConversation(id, { timeoutMs: 90_000, intervalMs: 2_000 });

  if (!conv) {
    console.error('waitForConversation returned null — missing API key, timed out, or the request failed. Check the warnings above.');
    process.exit(1);
  }

  hr('Status');
  console.log(`conversationId: ${conv.conversationId}`);
  console.log(`status:         ${conv.status}`);

  hr('Transcript (mapped ElTranscriptTurn[])');
  if (conv.transcript.length === 0) {
    console.log('(no transcript turns)');
  } else {
    for (const turn of conv.transcript) {
      const t = typeof turn.timeInCallSecs === 'number' ? `${turn.timeInCallSecs}s`.padStart(5) : '   ?s';
      console.log(`${t} ${turn.role.padEnd(5)} ${turn.message}`);
    }
  }

  hr('toTranscriptLines (userSpeaker: "worker")');
  const lines = toTranscriptLines(conv, 'worker');
  console.log(JSON.stringify(lines, null, 2));

  hr('Raw data collection (id -> string value)');
  console.log(JSON.stringify(conv.dataCollection, null, 2));

  hr('Parsed data-collection fields');
  for (const field of JSON_FIELDS) {
    const value = conv.dataCollection[field];
    if (value === undefined || value === null) {
      console.log(`\n--- ${field}: MISSING (not configured on this agent, or analysis not run)`);
      continue;
    }
    const parsed = parseJsonField<unknown>(conv, field);
    if (parsed === null) {
      console.log(`\n--- ${field}: FAILED TO PARSE. Raw value:`);
      console.log(value);
    } else {
      console.log(`\n--- ${field}: parsed`);
      console.log(JSON.stringify(parsed, null, 2));
    }
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
