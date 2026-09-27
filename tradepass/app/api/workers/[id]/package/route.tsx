export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { renderToBuffer } from '@react-pdf/renderer';
import { readDb } from '@/lib/store';
import { computeAssessment } from '@/lib/assessment';
import { registerFonts } from '@/lib/pdf/fonts';
import { ApplicationPackage } from '@/lib/pdf/ApplicationPackage';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = readDb();
  const worker = db.workers.find((w) => w.id === params.id);
  if (!worker) {
    return Response.json({ error: 'Worker not found' }, { status: 404 });
  }

  const employments = db.employments.filter((e) => e.workerId === worker.id);
  const requests = db.requests.filter((r) => r.workerId === worker.id);
  const assessment = computeAssessment(worker.id);

  registerFonts();
  const buffer = await renderToBuffer(
    <ApplicationPackage worker={worker} employments={employments} requests={requests} assessment={assessment} />,
  );

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="tradepass-package-${worker.id}.pdf"`,
      'Content-Length': String(buffer.length),
    },
  });
}
