export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { readDb, writeDb } from '@/lib/store';
import {
  saveVideo,
  resolveTranscriptAndConfirmations,
  computeVerificationResult,
  buildAuditPatch,
} from '@/lib/evidence/finalize';
import type { FieldConfirmation, TranscriptLine, VoiceMode } from '@/lib/types';

interface CompletePayload {
  transcript: TranscriptLine[];
  confirmations: FieldConfirmation[];
  conversationId: string | null;
  durationSec: number;
  mode?: VoiceMode;
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const db = readDb();
  const idx = db.requests.findIndex((r) => r.token === params.token);
  if (idx < 0) {
    return Response.json({ error: 'Bağlantı bulunamadı.' }, { status: 404 });
  }

  const request = db.requests[idx];
  if (request.status !== 'interviewing' && request.status !== 'completed') {
    return Response.json(
      { error: 'Görüntülü doğrulama tamamlanamadı. Görüşme başlatılmamış olabilir.' },
      { status: 400 },
    );
  }
  if (!request.answers) {
    return Response.json({ error: 'Önce bilgi formunu doldurmalısınız.' }, { status: 400 });
  }

  const claim = db.employments.find((e) => e.id === request.employmentId);
  if (!claim) {
    return Response.json({ error: 'Bağlantı bulunamadı.' }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }

  const videoEntry = form.get('video');
  const payloadEntry = form.get('payload');

  if (typeof payloadEntry !== 'string') {
    return Response.json({ error: 'Geçersiz istek: payload eksik.' }, { status: 400 });
  }

  let payload: CompletePayload;
  try {
    payload = JSON.parse(payloadEntry) as CompletePayload;
  } catch {
    return Response.json({ error: 'Geçersiz istek: payload JSON değil.' }, { status: 400 });
  }

  const mode: VoiceMode = payload.mode === 'live' ? 'live' : request.audit.interviewMode ?? 'simulated';

  // Save the video, if one was uploaded. A missing/empty video is tolerated defensively
  // (e.g. a browser that failed to produce a blob) rather than blocking finalization —
  // the demo should never hard-fail here.
  let video = null;
  if (videoEntry instanceof File && videoEntry.size > 0) {
    const buffer = Buffer.from(await videoEntry.arrayBuffer());
    video = saveVideo(request.id, buffer, videoEntry.type || 'video/webm');
  }

  const { transcript, confirmations, transcriptSource, analysisUnavailable } =
    await resolveTranscriptAndConfirmations({
      mode,
      conversationId: payload.conversationId ?? null,
      clientTranscript: Array.isArray(payload.transcript) ? payload.transcript : [],
      clientConfirmations: Array.isArray(payload.confirmations) ? payload.confirmations : [],
    });

  const result = computeVerificationResult(request.answers, confirmations, claim);

  const auditPatch = buildAuditPatch({
    conversationId: payload.conversationId ?? null,
    transcriptSource,
    video,
    videoDurationSec: typeof payload.durationSec === 'number' ? payload.durationSec : null,
  });

  const now = new Date().toISOString();
  const events = [...request.audit.events];
  if (video) {
    events.push({ at: now, type: 'video_uploaded', detail: `Video saved (${video.bytes} bytes, sha256 ${video.sha256}).` });
  }
  if (analysisUnavailable) {
    events.push({ at: now, type: 'analysis_unavailable', detail: 'ElevenLabs analysis was unavailable; used client-captured transcript instead.' });
  }
  events.push({ at: now, type: 'interview_completed', detail: `Verification completed with outcome "${result.outcome}".` });

  db.requests[idx] = {
    ...request,
    status: 'completed',
    completedAt: now,
    transcript,
    confirmations,
    videoFile: video?.videoFile ?? request.videoFile,
    audit: { ...request.audit, ...auditPatch, events },
    result,
    error: null,
  };

  const employmentIdx = db.employments.findIndex((e) => e.id === claim.id);
  if (employmentIdx >= 0) {
    const dateStr = now.slice(0, 10);
    db.employments[employmentIdx] = {
      ...db.employments[employmentIdx],
      status: result.outcome,
      latestRequestId: request.id,
      attemptLog: [
        ...db.employments[employmentIdx].attemptLog,
        `${dateStr}: Employer video verification (${mode}): ${result.outcome}.`,
      ],
    };
  }

  writeDb(db);

  return Response.json(db.requests[idx]);
}
