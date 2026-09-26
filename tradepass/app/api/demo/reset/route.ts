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

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const scenarioParam = searchParams.get('scenario');
  const scenario = scenarioParam === 'intake' ? 'intake' : 'full';

  const db = buildSeed(scenario);
  writeDb(db);
  clearVideos();

  return Response.json({ ok: true });
}
