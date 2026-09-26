export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { store } from '@/lib/store';
import { computeAssessment } from '@/lib/assessment';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const worker = store.getWorker(params.id);
  if (!worker) {
    return Response.json({ error: 'Worker not found' }, { status: 404 });
  }
  const assessment = computeAssessment(params.id);
  return Response.json(assessment);
}
