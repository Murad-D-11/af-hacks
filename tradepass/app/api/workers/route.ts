export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { store } from '@/lib/store';

export async function GET() {
  const workers = store.listWorkers();
  return Response.json(workers);
}
