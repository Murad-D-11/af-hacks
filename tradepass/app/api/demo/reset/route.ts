export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import fs from 'fs';
import path from 'path';
import { writeDb } from '@/lib/store';
import { buildSeed } from '@/lib/seed';

function clearVideos() {
  const dir = path.join(process.cwd(), 'data', 'videos');
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, file), { force: true });
  }
}

// EN: 'scenario' used to select between two different starting states, but
// buildSeed() no longer branches on it — every worker's starting state is fixed
// regardless of scenario (see lib/seed.ts). POST takes no body/params now.
export async function POST() {
  const db = buildSeed('full');
  writeDb(db);
  clearVideos();

  return Response.json({ ok: true });
}
