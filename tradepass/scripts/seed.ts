// Run with: npx tsx scripts/seed.ts
// Writes the full demo seed to data/db.json and clears any existing videos.
import fs from 'fs';
import path from 'path';
import { writeDb } from '../lib/store';
import { buildSeed } from '../lib/seed';

function clearVideos() {
  const dir = path.join(process.cwd(), 'data', 'videos');
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, file), { force: true });
  }
}

function main() {
  const db = buildSeed('full');
  writeDb(db);
  clearVideos();
  console.log('Seeded data/db.json with scenario "full".');
}

main();
