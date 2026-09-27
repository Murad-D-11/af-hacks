// Developer A's finalize logic: turns a completed interview (video blob + client-side
// transcript/confirmations, or a live ElevenLabs conversation id) into a saved video
// file, a resolved transcript/confirmations set, and a DETERMINISTIC VerificationResult
// (no AI involved in computing the result itself — only in producing the raw transcript).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import { waitForConversation, parseJsonField, toTranscriptLines } from '../elevenlabs/server';
import { CONFIRM_FIELDS, type ConfirmField } from '../types';
import type {
  AuditTrail,
  Employment,
  EmployerAnswers,
  FieldConfirmation,
  TranscriptLine,
  VerificationResult,
  VoiceMode,
} from '../types';
import { hoursFor, monthEn } from '../hours';
import { DUTIES_309A } from '../skills/309A';

const VIDEOS_DIR = path.join(process.cwd(), 'data', 'videos');

export interface SaveVideoResult {
  videoFile: string; // relative filename, e.g. '<requestId>.webm'
  sha256: string;
  bytes: number;
  mimeType: string;
}

/** Saves the interview video buffer to data/videos/<requestId>.webm and fingerprints it. */
export function saveVideo(requestId: string, buffer: Buffer, mimeType: string): SaveVideoResult {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  const videoFile = `${requestId}.webm`;
  fs.writeFileSync(path.join(VIDEOS_DIR, videoFile), buffer);
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  return { videoFile, sha256, bytes: buffer.length, mimeType: mimeType || 'video/webm' };
}

interface ConfirmationsJson {
  confirmations?: { field?: string; status?: string; note?: string | null }[];
}

const VALID_STATUSES = new Set(['confirmed', 'corrected', 'unclear']);
const VALID_FIELDS = new Set<string>(CONFIRM_FIELDS);

/**
 * Resolves the transcript and field confirmations for a completed interview.
 *
 * - LIVE with a conversationId: waits for the ElevenLabs conversation, maps its
 *   transcript, and fills in any of the 7 CONFIRM_FIELDS the client missed (dropped
 *   tool call, page reload mid-call, etc.) from confirmations_json, tagging the note
 *   so it's clear the value came from post-call analysis rather than the live tool call.
 *   If the conversation can't be fetched at all, falls back to the client-provided data.
 * - SIMULATED (or LIVE with no conversationId): uses the client-provided transcript and
 *   confirmations as-is.
 */
export async function resolveTranscriptAndConfirmations(params: {
  mode: VoiceMode;
  conversationId: string | null;
  clientTranscript: TranscriptLine[];
  clientConfirmations: FieldConfirmation[];
}): Promise<{
  transcript: TranscriptLine[];
  confirmations: FieldConfirmation[];
  transcriptSource: 'elevenlabs' | 'client' | 'simulated';
  analysisUnavailable: boolean;
}> {
  const { mode, conversationId, clientTranscript, clientConfirmations } = params;

  if (mode === 'simulated') {
    return {
      transcript: clientTranscript,
      confirmations: clientConfirmations,
      transcriptSource: 'simulated',
      analysisUnavailable: false,
    };
  }

  if (mode === 'live' && conversationId) {
    const conv = await waitForConversation(conversationId, { timeoutMs: 60_000 });
    if (conv) {
      const transcript = toTranscriptLines(conv, 'employer');
      const confirmations = fillMissingConfirmations(clientConfirmations, conv, conversationId);
      return { transcript, confirmations, transcriptSource: 'elevenlabs', analysisUnavailable: false };
    }
    // Analysis never came back — fall back to whatever the browser captured live.
    return {
      transcript: clientTranscript,
      confirmations: clientConfirmations,
      transcriptSource: 'client',
      analysisUnavailable: true,
    };
  }

  // live mode but no conversationId (session never connected) — client data is all we have.
  return {
    transcript: clientTranscript,
    confirmations: clientConfirmations,
    transcriptSource: 'client',
    analysisUnavailable: false,
  };
}

/** Fills any of the 7 CONFIRM_FIELDS missing from the client's confirmations using confirmations_json. */
function fillMissingConfirmations(
  clientConfirmations: FieldConfirmation[],
  conv: Parameters<typeof parseJsonField>[0],
  _conversationId: string,
): FieldConfirmation[] {
  const have = new Set(clientConfirmations.map((c) => c.field));
  const missing = CONFIRM_FIELDS.filter((f) => !have.has(f));
  if (missing.length === 0) return clientConfirmations;

  const parsed = parseJsonField<ConfirmationsJson>(conv, 'confirmations_json');
  const fromAnalysis = Array.isArray(parsed?.confirmations) ? parsed!.confirmations! : [];

  const filled: FieldConfirmation[] = [...clientConfirmations];
  for (const field of missing) {
    const match = fromAnalysis.find(
      (c) => c.field === field && typeof c.status === 'string' && VALID_STATUSES.has(c.status),
    );
    if (match && VALID_FIELDS.has(match.field as string)) {
      filled.push({
        field: field as ConfirmField,
        status: match.status as FieldConfirmation['status'],
        note: match.note ? `${match.note} (from post-call analysis)` : '(from post-call analysis)',
      });
    }
  }
  return filled;
}

/** Maps a duty id to its English label, skipping unknown ids defensively. */
function dutyEnLabel(id: string): string | null {
  return DUTIES_309A.find((d) => d.id === id)?.en ?? null;
}

/**
 * Computes the DETERMINISTIC verification result: no AI involved. Every value comes
 * from either the employer's own answers (facts) or the resolved confirmations (whether
 * the employer confirmed/corrected/found-unclear each fact).
 */
export function computeVerificationResult(
  answers: EmployerAnswers,
  confirmations: FieldConfirmation[],
  claim: Employment,
): VerificationResult {
  const byField = new Map(confirmations.map((c) => [c.field, c]));
  const allFieldsConfirmed = CONFIRM_FIELDS.every((f) => byField.get(f)?.status === 'confirmed');

  const consent = byField.get('consent');
  const identity = byField.get('identity');
  const consentMissingOrCorrected = !consent || consent.status === 'corrected';
  const identityNotConfirmed = !identity || identity.status !== 'confirmed';

  let outcome: VerificationResult['outcome'];
  if (consentMissingOrCorrected || identityNotConfirmed) {
    outcome = 'failed';
  } else if (allFieldsConfirmed) {
    outcome = 'verified';
  } else {
    outcome = 'partial';
  }

  const confirmedTasks = answers.dutyIds
    .map(dutyEnLabel)
    .filter((label): label is string => label !== null);

  const verifiedHours =
    outcome === 'verified' || outcome === 'partial'
      ? hoursFor(answers.startDate, answers.endDate, answers.hoursPerWeek)
      : 0;

  const discrepancies = computeDiscrepancies(answers, claim, confirmations);

  const summaryEnglish = buildSummaryEnglish(answers, confirmedTasks, outcome, discrepancies);

  return {
    confirmedRoleTitle: answers.roleTitle,
    confirmedStartDate: answers.startDate,
    confirmedEndDate: answers.endDate,
    confirmedHoursPerWeek: answers.hoursPerWeek,
    confirmedDutyIds: answers.dutyIds,
    confirmedTasks,
    discrepancies,
    allFieldsConfirmed,
    outcome,
    verifiedHours,
    summaryEnglish,
  };
}

/**
 * Compares the employer's CONFIRMED answers against the worker's ORIGINAL CLAIM
 * (the Employment record as it stood before this verification), plus surfaces any
 * 'corrected' confirmation notes. Dates/hours/tasks differences are reported even
 * when the employer "confirmed" a field, if the confirmed value differs from what
 * the worker claimed — the whole point of this cross-check.
 */
function computeDiscrepancies(
  answers: EmployerAnswers,
  claim: Employment,
  confirmations: FieldConfirmation[],
): string[] {
  const out: string[] = [];

  if (answers.startDate !== claim.startDate) {
    out.push(
      `Start date: worker claimed ${monthEn(claim.startDate)}; employer states ${monthEn(answers.startDate)}.`,
    );
  }
  if (claim.endDate && answers.endDate !== claim.endDate) {
    out.push(`End date: worker claimed ${monthEn(claim.endDate)}; employer states ${monthEn(answers.endDate)}.`);
  }
  if (answers.hoursPerWeek !== claim.hoursPerWeek) {
    out.push(
      `Hours per week: worker claimed ${claim.hoursPerWeek}; employer states ${answers.hoursPerWeek}.`,
    );
  }

  const claimedTasks = new Set(claim.tasks);
  const confirmedTaskEn = new Set(
    answers.dutyIds.map(dutyEnLabel).filter((t): t is string => t !== null),
  );
  const claimedNotSelected = Array.from(claimedTasks).filter((t) => !confirmedTaskEn.has(t));
  const selectedNotClaimed = Array.from(confirmedTaskEn).filter((t) => !claimedTasks.has(t));
  if (claimedNotSelected.length > 0) {
    out.push(`Tasks claimed by worker but not confirmed by employer: ${claimedNotSelected.join(', ')}.`);
  }
  if (selectedNotClaimed.length > 0) {
    out.push(`Tasks confirmed by employer but not originally claimed: ${selectedNotClaimed.join(', ')}.`);
  }

  // Surface any 'corrected' confirmation's note as its own discrepancy line (e.g. the
  // employer corrected hours from what the agent read back).
  for (const c of confirmations) {
    if (c.status === 'corrected' && c.note) {
      out.push(`${fieldLabelEn(c.field)}: employer correction — ${c.note}.`);
    }
  }

  return out;
}

function fieldLabelEn(field: ConfirmField): string {
  const labels: Record<ConfirmField, string> = {
    consent: 'Consent',
    identity: 'Identity',
    company: 'Company',
    role: 'Role',
    dates: 'Dates',
    hours: 'Hours',
    duties: 'Duties',
  };
  return labels[field];
}

function buildSummaryEnglish(
  answers: EmployerAnswers,
  confirmedTasks: string[],
  outcome: VerificationResult['outcome'],
  discrepancies: string[],
): string {
  const period = `${monthEn(answers.startDate)} to ${monthEn(answers.endDate)}`;
  const tasksPart = confirmedTasks.length > 0 ? `, including ${confirmedTasks.join(', ')}` : '';
  const base = `${answers.supervisorName} confirmed the worker was employed as ${answers.roleTitle} at ${answers.companyName} from ${period}, ${answers.hoursPerWeek} hours per week${tasksPart}.`;
  if (outcome === 'failed') {
    return `${base} Verification could not be completed: consent or identity was not confirmed.`;
  }
  if (discrepancies.length === 0) {
    return `${base} All fields confirmed, no discrepancies.`;
  }
  return `${base} ${discrepancies.length} discrepanc${discrepancies.length === 1 ? 'y' : 'ies'} noted between the worker's claim and the employer's confirmation.`;
}

/** Builds the audit patch (video + transcript source fields) to merge into the request's AuditTrail. */
export function buildAuditPatch(params: {
  conversationId: string | null;
  transcriptSource: 'elevenlabs' | 'client' | 'simulated';
  video: SaveVideoResult | null;
  videoDurationSec: number | null;
}): Partial<AuditTrail> {
  return {
    conversationId: params.conversationId,
    transcriptSource: params.transcriptSource,
    videoSha256: params.video?.sha256 ?? null,
    videoBytes: params.video?.bytes ?? null,
    videoMimeType: params.video?.mimeType ?? null,
    videoDurationSec: params.videoDurationSec,
  };
}
