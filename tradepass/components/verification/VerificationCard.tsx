'use client';
// Developer A's real implementation, replacing B1's stub. Props are FIXED per the
// Context Pack: { request, employment }.
import { useState } from 'react';
import type { AuditEvent, ConfirmField, Employment, FieldConfirmation, TranscriptLine, VerificationRequest } from '@/lib/types';
import { CONFIRM_FIELDS } from '@/lib/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { DUTIES_309A } from '@/lib/skills/309A';
import { monthEn } from '@/lib/hours';

const FIELD_LABELS: Record<ConfirmField, string> = {
  consent: 'Consent',
  identity: 'Identity',
  company: 'Company',
  role: 'Role',
  dates: 'Dates',
  hours: 'Hours',
  duties: 'Duties',
};

const TRANSCRIPT_SOURCE_LABEL: Record<NonNullable<VerificationRequest['audit']['transcriptSource']>, string> = {
  elevenlabs: 'ElevenLabs conversation analysis',
  client: 'Captured live in the browser (analysis unavailable)',
  simulated: 'Simulated interview (no ElevenLabs credits used)',
};

function outcomeTone(outcome: NonNullable<VerificationRequest['result']>['outcome']): 'green' | 'amber' | 'red' {
  if (outcome === 'verified') return 'green';
  if (outcome === 'partial') return 'amber';
  return 'red';
}

function dutyLabel(id: string): { en: string; code: string } | null {
  const duty = DUTIES_309A.find((d) => d.id === id);
  if (!duty) return null;
  return { en: duty.en, code: duty.skillSetIds.join('/') };
}

function ChecklistRow({ confirmation }: { confirmation: FieldConfirmation | undefined; field: ConfirmField }) {
  if (!confirmation) {
    return <span className="inline-flex h-2 w-2 bg-foreground/20" title="Pending" />;
  }
  const tone =
    confirmation.status === 'confirmed'
      ? 'bg-orange'
      : confirmation.status === 'corrected'
        ? 'bg-caution'
        : 'bg-foreground/30';
  return <span className={`inline-flex h-2 w-2 ${tone}`} title={confirmation.status} />;
}

function TranscriptView({ transcript }: { transcript: TranscriptLine[] }) {
  if (transcript.length === 0) {
    return <p className="text-sm text-foreground/40">No transcript available.</p>;
  }
  return (
    <ol className="max-h-80 space-y-2 overflow-y-auto text-sm">
      {transcript.map((line, i) => (
        <li key={i} className="border border-line p-2">
          <p className="text-xs uppercase tracking-wide text-foreground/40">{line.speaker}</p>
          <p className="text-foreground/80">{line.original}</p>
          <p className="text-xs italic text-foreground/50">
            {line.english ?? 'translation unavailable'}
          </p>
        </li>
      ))}
    </ol>
  );
}

function AuditView({ request }: { request: VerificationRequest }) {
  const { audit } = request;
  return (
    <div className="space-y-3 text-sm">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <AuditItem label="IP" value={audit.ip ?? '—'} />
        <AuditItem label="User agent" value={audit.userAgent ?? '—'} />
        <AuditItem label="Client timezone" value={audit.clientTimezone ?? '—'} />
        <AuditItem label="Mode" value={audit.interviewMode ?? '—'} />
        <AuditItem label="Conversation ID" value={audit.conversationId ?? '—'} mono />
        <AuditItem label="Transcript source" value={audit.transcriptSource ? TRANSCRIPT_SOURCE_LABEL[audit.transcriptSource] : '—'} />
        <AuditItem label="Video SHA-256" value={audit.videoSha256 ?? '—'} mono />
        <AuditItem label="Video bytes" value={audit.videoBytes ? audit.videoBytes.toLocaleString('en-CA') : '—'} />
        <AuditItem label="Video duration" value={audit.videoDurationSec ? `${audit.videoDurationSec}s` : '—'} />
      </dl>
      <div>
        <p className="mb-1 text-xs uppercase tracking-wide text-foreground/40">Event timeline</p>
        <EventTimeline events={audit.events} />
      </div>
    </div>
  );
}

function AuditItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-foreground/40">{label}</dt>
      <dd className={`break-all text-foreground/80 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}

function EventTimeline({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) return <p className="text-xs text-foreground/40">No events recorded.</p>;
  return (
    <ol className="space-y-1.5">
      {events.map((e, i) => (
        <li key={i} className="flex gap-2 text-xs text-foreground/60">
          <span className="font-mono text-foreground/40">{new Date(e.at).toLocaleString('en-CA')}</span>
          <span className="font-medium text-foreground/50">{e.type}</span>
          <span>{e.detail}</span>
        </li>
      ))}
    </ol>
  );
}

export default function VerificationCard({ request, employment }: { request: VerificationRequest; employment: Employment }) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  const { result, answers } = request;
  if (!result || !answers) {
    return (
      <Card>
        <p className="text-sm text-foreground/50">Verification result not available yet.</p>
      </Card>
    );
  }

  const confirmationByField = new Map(request.confirmations.map((c) => [c.field, c]));
  const completedDate = request.completedAt ? new Date(request.completedAt).toLocaleDateString('en-CA') : null;
  const isSimulated = request.audit.interviewMode === 'simulated';

  const datesMatch = answers.startDate === employment.startDate && answers.endDate === employment.endDate;
  const hoursMatch = answers.hoursPerWeek === employment.hoursPerWeek;

  return (
    <Card className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone={outcomeTone(result.outcome)}>{result.outcome.toUpperCase()}</Badge>
            {isSimulated && <Badge tone="gray">Simulated interview</Badge>}
          </div>
          <p className="mt-2 text-sm text-foreground/60">
            Confirmed by the employer on recorded video
            {completedDate ? ` · ${completedDate}` : ''} · consent given
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.3fr]">
        {/* Left: video */}
        <div>
          {request.videoFile ? (
            <video
              className="w-full border border-line bg-background"
              controls
              src={`/api/requests/${request.id}/video`}
              aria-label="Recorded verification interview"
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center border border-line bg-background text-sm text-foreground/40">
              Recording on file
            </div>
          )}
        </div>

        {/* Right: employer states vs worker claimed */}
        <div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="border border-line bg-background p-3">
              <p className="text-xs uppercase tracking-wide text-foreground/40">Employer states</p>
              <dl className="mt-2 space-y-2">
                <div>
                  <dt className="text-xs text-foreground/40">Dates</dt>
                  <dd className="font-mono text-foreground/80">{monthEn(answers.startDate)} – {monthEn(answers.endDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-foreground/40">Hours / week</dt>
                  <dd className="font-mono text-foreground/80">{answers.hoursPerWeek}</dd>
                </div>
                <div>
                  <dt className="text-xs text-foreground/40">Role</dt>
                  <dd className="text-foreground/80">{answers.roleTitle}</dd>
                </div>
              </dl>
            </div>
            <div className="border border-line bg-background p-3">
              <p className="text-xs uppercase tracking-wide text-foreground/40">Worker claimed</p>
              <dl className="mt-2 space-y-2">
                <div>
                  <dt className="text-xs text-foreground/40">Dates</dt>
                  <dd className={`font-mono ${datesMatch ? 'text-foreground/80' : 'text-caution line-through'}`}>
                    {monthEn(employment.startDate)} – {employment.endDate ? monthEn(employment.endDate) : 'Present'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-foreground/40">Hours / week</dt>
                  <dd className={`font-mono ${hoursMatch ? 'text-foreground/80' : 'text-caution line-through'}`}>
                    {employment.hoursPerWeek}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-foreground/40">Role</dt>
                  <dd className="text-foreground/80">{employment.roleTitle}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-3 border border-orange/40 bg-orange/[0.08] p-3">
            <p className="text-xs uppercase tracking-wide text-orange">Verified hours</p>
            <p className="font-mono text-2xl font-semibold text-orange">{result.verifiedHours.toLocaleString('en-CA')}</p>
          </div>

          {/* Duty chips */}
          <div className="mt-3">
            <p className="mb-1.5 text-xs uppercase tracking-wide text-foreground/40">Confirmed duties</p>
            <div className="flex flex-wrap gap-1.5">
              {result.confirmedDutyIds.map((id) => {
                const label = dutyLabel(id);
                if (!label) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 border border-orange/40 bg-orange/10 px-2.5 py-1 text-xs font-medium text-orange"
                  >
                    {label.en}
                    <span className="font-mono text-orange/70">{label.code}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Compact 7-field checklist */}
          <div className="mt-3">
            <p className="mb-1.5 text-xs uppercase tracking-wide text-foreground/40">Confirmation checklist</p>
            <div className="flex flex-wrap gap-3">
              {CONFIRM_FIELDS.map((field) => (
                <span key={field} className="inline-flex items-center gap-1.5 text-xs text-foreground/60">
                  <ChecklistRow confirmation={confirmationByField.get(field)} field={field} />
                  {FIELD_LABELS[field]}
                </span>
              ))}
            </div>
          </div>

          {/* Discrepancies */}
          {result.discrepancies.length > 0 && (
            <div className="mt-3 border border-caution/40 bg-caution/10 p-3">
              <p className="text-xs uppercase tracking-wide text-caution">Discrepancies</p>
              <ul className="mt-1.5 space-y-1 text-xs text-caution">
                {result.discrepancies.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Collapsible transcript */}
      <div className="border-t border-line pt-3">
        <button
          type="button"
          onClick={() => setTranscriptOpen((v) => !v)}
          className="text-sm font-medium text-foreground/70 hover:text-orange"
        >
          {transcriptOpen ? '▾' : '▸'} Transcript
        </button>
        {transcriptOpen && <div className="animate-punch-in mt-2"><TranscriptView transcript={request.transcript} /></div>}
      </div>

      {/* Collapsible audit trail */}
      <div className="border-t border-line pt-3">
        <button
          type="button"
          onClick={() => setAuditOpen((v) => !v)}
          className="text-sm font-medium text-foreground/70 hover:text-orange"
        >
          {auditOpen ? '▾' : '▸'} Audit trail
        </button>
        {auditOpen && <div className="animate-punch-in mt-2"><AuditView request={request} /></div>}
      </div>

      <div className="flex justify-end border-t border-line pt-3">
        <a href={`/api/employments/${employment.id}/wev-form`} target="_blank" rel="noopener noreferrer">
          <Button variant="secondary">Download employer letter draft (PDF)</Button>
        </a>
      </div>
    </Card>
  );
}
