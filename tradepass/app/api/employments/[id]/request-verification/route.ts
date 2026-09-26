export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { readDb, writeDb, newId, newToken } from '@/lib/store';
import type { VerificationRequest } from '@/lib/types';
import { emptyAudit } from '@/lib/types';

/** Request statuses that count as "still open" — reuse rather than duplicate. */
const OPEN_STATUSES = new Set(['sent', 'form_submitted', 'interviewing']);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const db = readDb();
  const employment = db.employments.find(e => e.id === params.id);

  if (!employment) {
    return Response.json({ error: 'Employment not found' }, { status: 404 });
  }

  // Reuse an open request for this employment instead of creating a duplicate.
  const existingOpen = employment.latestRequestId
    ? db.requests.find(r => r.id === employment.latestRequestId && OPEN_STATUSES.has(r.status))
    : null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (existingOpen) {
    return Response.json({
      requestId: existingOpen.id,
      token: existingOpen.token,
      url: `${appUrl}/verify/${existingOpen.token}`,
    });
  }

  const request: VerificationRequest = {
    id: newId(),
    token: newToken(),
    employmentId: employment.id,
    workerId: employment.workerId,
    status: 'sent',
    createdAt: new Date().toISOString(),
    completedAt: null,
    answers: null,
    transcript: [],
    confirmations: [],
    videoFile: null,
    audit: emptyAudit(),
    result: null,
    error: null,
  };
  request.audit.events.push({
    at: request.createdAt,
    type: 'request_created',
    detail: `Verification request created for ${employment.employerName}.`,
  });

  db.requests.push(request);

  const employmentIdx = db.employments.findIndex(e => e.id === employment.id);
  db.employments[employmentIdx] = { ...employment, status: 'requested', latestRequestId: request.id };

  writeDb(db);

  return Response.json({
    requestId: request.id,
    token: request.token,
    url: `${appUrl}/verify/${request.token}`,
  });
}
