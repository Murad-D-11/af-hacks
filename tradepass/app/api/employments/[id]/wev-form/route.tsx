export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { renderToBuffer } from '@react-pdf/renderer';
import { readDb } from '@/lib/store';
import { registerFonts } from '@/lib/pdf/fonts';
import { WevForm } from '@/lib/pdf/WevForm';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = readDb();
  const employment = db.employments.find((e) => e.id === params.id);
  if (!employment) {
    return Response.json({ error: 'Employment not found' }, { status: 404 });
  }

  const worker = db.workers.find((w) => w.id === employment.workerId);
  if (!worker) {
    return Response.json({ error: 'Worker not found' }, { status: 404 });
  }

  const request = employment.latestRequestId
    ? db.requests.find((r) => r.id === employment.latestRequestId)
    : null;
  if (!request || request.status !== 'completed' || !request.result || !request.answers) {
    return Response.json({ error: 'No completed verification available for this employment yet.' }, { status: 400 });
  }

  registerFonts();
  const buffer = await renderToBuffer(<WevForm worker={worker} request={request} />);

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="wev-form-${employment.id}.pdf"`,
      'Content-Length': String(buffer.length),
    },
  });
}
