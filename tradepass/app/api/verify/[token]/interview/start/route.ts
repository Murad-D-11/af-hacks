export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { readDb, writeDb } from '@/lib/store';
import { clientInfo } from '@/lib/evidence/audit';
import type { VoiceMode } from '@/lib/types';

// 'completed' is included so an employer can redo the video interview from their same
// link after finishing once — /interview/complete already tolerates re-submission from
// 'completed' by overwriting the previous result, so re-opening 'interviewing' here is
// consistent with that.
const STARTABLE_STATUSES = new Set(['form_submitted', 'interviewing', 'completed']);

interface StartBody {
  mode?: VoiceMode;
  clientTimezone?: string;
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const db = readDb();
  const idx = db.requests.findIndex((r) => r.token === params.token);
  if (idx < 0) {
    return Response.json({ error: 'Bağlantı bulunamadı.' }, { status: 404 });
  }

  const request = db.requests[idx];
  if (!STARTABLE_STATUSES.has(request.status)) {
    return Response.json(
      { error: 'Görüntülü doğrulama başlatılamaz. Önce bilgi formunu doldurmalısınız.' },
      { status: 400 },
    );
  }

  let body: StartBody;
  try {
    body = (await req.json()) as StartBody;
  } catch {
    body = {};
  }

  const mode: VoiceMode = body.mode === 'live' ? 'live' : 'simulated';
  const { ip, userAgent } = clientInfo(req);

  const audit = { ...request.audit };
  audit.interviewMode = mode;
  audit.clientTimezone = typeof body.clientTimezone === 'string' ? body.clientTimezone : audit.clientTimezone;
  // Fill ip/ua if still missing (defensive — the GET route usually sets these first).
  if (audit.ip === null) audit.ip = ip;
  if (audit.userAgent === null) audit.userAgent = userAgent;

  const now = new Date().toISOString();
  audit.events.push({
    at: now,
    type: 'interview_started',
    detail: `Video interview session started (${mode} mode).`,
  });

  db.requests[idx] = { ...request, status: 'interviewing', audit };
  writeDb(db);

  return Response.json(db.requests[idx]);
}
