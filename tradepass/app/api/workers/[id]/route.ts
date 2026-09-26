export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { store } from '@/lib/store';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const detail = store.getWorkerDetail(params.id);
  if (!detail) {
    return Response.json({ error: 'Worker not found' }, { status: 404 });
  }
  return Response.json(detail);
}
