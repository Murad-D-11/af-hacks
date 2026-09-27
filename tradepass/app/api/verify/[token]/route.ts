export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { readDb, writeDb } from '@/lib/store';
import { clientInfo, recordFirst } from '@/lib/evidence/audit';

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const db = readDb();
  const request = db.requests.find((r) => r.token === params.token);

  if (!request) {
    return Response.json({ error: 'Bağlantı bulunamadı.' }, { status: 404 });
  }
  if (request.status === 'failed') {
    return Response.json({ error: 'Bu doğrulama bağlantısı artık geçerli değil.' }, { status: 410 });
  }

  const employment = db.employments.find((e) => e.id === request.employmentId);
  const worker = db.workers.find((w) => w.id === request.workerId);
  if (!employment || !worker) {
    // Data integrity issue (orphaned request) — treat as not found rather than 500.
    return Response.json({ error: 'Bağlantı bulunamadı.' }, { status: 404 });
  }

  // First open: fill audit ip/ua if not already set, and record the 'link_opened' event
  // exactly once. Uses recordFirst so repeated visits don't spam the audit trail.
  if (request.audit.ip === null && request.audit.userAgent === null) {
    const { ip, userAgent } = clientInfo(req);
    const idx = db.requests.findIndex((r) => r.id === request.id);
    if (idx >= 0) {
      db.requests[idx] = {
        ...db.requests[idx],
        audit: { ...db.requests[idx].audit, ip, userAgent },
      };
      writeDb(db);
    }
  }
  recordFirst(request.id, 'link_opened', 'Employer opened the verification link.');

  // Re-read so the response reflects the audit fields we may have just written.
  const fresh = readDb().requests.find((r) => r.id === request.id) ?? request;

  // NEVER return the worker's claimed dates, hours or tasks — the employer must enter
  // these themselves. Only company/reference identity, needed to prefill the form and
  // show who the employer is being asked to confirm.
  return Response.json({
    request: fresh,
    worker: { name: worker.name, trade: '309A Construction & Maintenance Electrician' },
    employerName: employment.employerName,
    reference: employment.reference,
  });
}
