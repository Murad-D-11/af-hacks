export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { readDb, writeDb, newId } from '@/lib/store';
import type { Employment, IntakeRecord, TranscriptLine, VoiceMode } from '@/lib/types';
import { waitForConversation, parseJsonField, toTranscriptLines } from '@/lib/elevenlabs/server';
import { mapRawEmploymentsPayload, type RawEmploymentsPayload } from '@/lib/intake/parse';
import { CANNED_KOCAELI_EMPLOYMENT } from '@/lib/intake/simulated';

interface IntakeRequestBody {
  mode: VoiceMode;
  conversationId: string | null;
  clientTranscript: TranscriptLine[];
}

function transcriptMentionsKocaeli(transcript: TranscriptLine[]): boolean {
  return transcript.some(line =>
    line.original.toLowerCase().includes('kocaeli') || (line.english ?? '').toLowerCase().includes('kocaeli')
  );
}

/** Employments still owned by a request in progress or done — never overwritten by intake. */
const LOCKED_STATUSES = new Set(['verified', 'partial', 'requested']);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json()) as IntakeRequestBody;
  const db = readDb();
  const worker = db.workers.find(w => w.id === params.id);

  if (!worker) {
    return Response.json({ error: 'Worker not found' }, { status: 404 });
  }

  let transcript: TranscriptLine[] = body.clientTranscript ?? [];
  let mappedNewEmployments: ReturnType<typeof mapRawEmploymentsPayload> = [];
  let source: 'elevenlabs' | 'fallback' = 'fallback';

  // LIVE path: try to resolve the real conversation via A's ElevenLabs server helper.
  if (body.mode === 'live' && body.conversationId) {
    const conv = await waitForConversation(body.conversationId, { timeoutMs: 60000 });

    if (conv) {
      const employmentsPayload = parseJsonField<RawEmploymentsPayload>(conv, 'employments_json');
      const mapped = mapRawEmploymentsPayload(employmentsPayload, worker.preferredLanguage);

      if (mapped.length > 0) {
        transcript = toTranscriptLines(conv, 'worker');
        mappedNewEmployments = mapped;
        source = 'elevenlabs';
      }
      // else: bad JSON or empty employments -> fall through to the fallback below.
    }
    // else: null conversation (missing key, network error, timeout) -> fall through.
  }

  // Fallback path: SIMULATED mode, or LIVE that failed/returned nothing usable.
  if (source === 'fallback') {
    mappedNewEmployments = transcriptMentionsKocaeli(transcript)
      ? [
          {
            employerName: CANNED_KOCAELI_EMPLOYMENT.employerName,
            city: CANNED_KOCAELI_EMPLOYMENT.city,
            country: CANNED_KOCAELI_EMPLOYMENT.country,
            startDate: CANNED_KOCAELI_EMPLOYMENT.startDate,
            endDate: CANNED_KOCAELI_EMPLOYMENT.endDate,
            hoursPerWeek: CANNED_KOCAELI_EMPLOYMENT.hoursPerWeek,
            roleTitle: CANNED_KOCAELI_EMPLOYMENT.roleTitle,
            tasks: CANNED_KOCAELI_EMPLOYMENT.tasks,
            reference: CANNED_KOCAELI_EMPLOYMENT.reference,
          },
        ]
      : [];
  }

  // Upsert by employerName (case-insensitive), keeping the existing id when one exists.
  // Never modify employments that are verified, partial, or requested.
  const existingForWorker = db.employments.filter(e => e.workerId === worker.id);

  for (const mapped of mappedNewEmployments) {
    const existing = existingForWorker.find(
      e => e.employerName.toLowerCase() === mapped.employerName.toLowerCase()
    );

    if (existing && LOCKED_STATUSES.has(existing.status)) {
      // Do not touch an employment that already has a request in flight or completed.
      continue;
    }

    const isKocaeli = mapped.employerName.toLowerCase() === CANNED_KOCAELI_EMPLOYMENT.employerName.toLowerCase();
    const id = existing?.id ?? (isKocaeli ? 'e_kocaeli' : newId());

    const employment: Employment = {
      id,
      workerId: worker.id,
      employerName: mapped.employerName,
      city: mapped.city,
      country: mapped.country,
      startDate: mapped.startDate,
      endDate: mapped.endDate,
      hoursPerWeek: mapped.hoursPerWeek,
      roleTitle: mapped.roleTitle,
      tasks: mapped.tasks,
      reference: mapped.reference,
      status: 'unverified',
      latestRequestId: null,
      attemptLog: existing?.attemptLog ?? [],
      origin: 'voice_intake',
    };

    const idx = db.employments.findIndex(e => e.id === id);
    if (idx >= 0) db.employments[idx] = employment;
    else db.employments.push(employment);
  }

  const intake: IntakeRecord = {
    mode: body.mode,
    conversationId: body.conversationId,
    transcript,
    source,
    completedAt: new Date().toISOString(),
  };

  const workerIdx = db.workers.findIndex(w => w.id === worker.id);
  db.workers[workerIdx] = { ...db.workers[workerIdx], intake };

  writeDb(db);

  const employments = db.employments.filter(e => e.workerId === worker.id);
  return Response.json({ employments, intake });
}
