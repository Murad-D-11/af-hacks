'use client';

import { useState } from 'react';
import type { AuditEvent, Employment, VerificationRequest } from '@/lib/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import VerificationCard from '@/components/verification/VerificationCard';
import RequestVerificationModal from './RequestVerificationModal';
import { monthEn, hoursFor } from '@/lib/hours';
import { localTime } from '@/lib/timezones';

const STATUS_TONE: Record<Employment['status'], 'gray' | 'green' | 'amber' | 'red' | 'blue'> = {
  unverified: 'gray',
  requested: 'blue',
  verified: 'green',
  partial: 'amber',
  failed: 'red',
};

const TIMELINE_EVENT_TYPES = ['link_opened', 'form_submitted', 'interview_started', 'video_uploaded', 'interview_completed'];

function MiniTimeline({ events }: { events: AuditEvent[] }) {
  const relevant = events.filter((e) => TIMELINE_EVENT_TYPES.includes(e.type));

  if (relevant.length === 0) {
    return <p className="text-xs text-foreground/40">No activity yet. The employer hasn&apos;t opened the link.</p>;
  }

  return (
    <ol className="space-y-1.5">
      {relevant.map((e, i) => (
        <li key={i} className="flex items-center gap-2 text-xs text-foreground/60">
          <span className="h-1.5 w-1.5 bg-steel" />
          <span className="font-mono text-foreground/40">{new Date(e.at).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          <span>{e.detail}</span>
        </li>
      ))}
    </ol>
  );
}

function EmploymentCard({
  employment,
  request,
  onRequestCreated,
}: {
  employment: Employment;
  request: VerificationRequest | null;
  onRequestCreated: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const claimedHours = hoursFor(employment.startDate, employment.endDate, employment.hoursPerWeek);
  const endLabel = employment.endDate ? monthEn(employment.endDate) : 'Present';
  const employerTime = localTime(employment.reference.timezone);

  const handleCopyAgain = async () => {
    if (!request) return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    try {
      await navigator.clipboard.writeText(`${appUrl}/verify/${request.token}`);
    } catch {
      // Ignore — clipboard access can fail silently in some browsers/contexts.
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-stamp text-xl font-bold uppercase tracking-wide text-foreground">{employment.employerName}</p>
          <p className="text-xs text-foreground/50">
            {employment.city}
            {employment.city && employment.country ? ', ' : ''}
            {employment.country}
          </p>
        </div>
        <Badge tone={STATUS_TONE[employment.status]}>{employment.status.replace('_', ' ')}</Badge>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-foreground/40">Claimed dates</dt>
          <dd className="font-mono text-foreground/80">{monthEn(employment.startDate)} – {endLabel}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-foreground/40">Hours / week</dt>
          <dd className="font-mono text-foreground/80">{employment.hoursPerWeek}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-foreground/40">Role</dt>
          <dd className="text-foreground/80">{employment.roleTitle || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-foreground/40">Claimed hours</dt>
          <dd className="font-mono font-semibold text-foreground">{claimedHours.toLocaleString('en-CA')}</dd>
        </div>
      </dl>

      <div className="mt-4 border border-line bg-background px-3 py-2 text-xs text-foreground/60">
        <span className="font-medium text-foreground/75">{employment.reference.name || 'No reference on file'}</span>
        {employment.reference.title ? `, ${employment.reference.title}` : ''}
        {employment.reference.name && (
          <span className="text-foreground/40"> · speaks {employment.reference.language} · local time {employerTime} ({employment.reference.timezone})</span>
        )}
      </div>

      {employment.attemptLog.length > 0 && (
        <div className="mt-3">
          <p className="text-xs uppercase tracking-wide text-foreground/40">Earlier attempts</p>
          <ul className="mt-1 space-y-1">
            {employment.attemptLog.map((entry, i) => (
              <li key={i} className="text-xs text-foreground/50">{entry}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 border-t border-line pt-4">
        {(employment.status === 'unverified' || employment.status === 'failed') && (
          <Button onClick={() => setModalOpen(true)}>Request employer verification</Button>
        )}

        {employment.status === 'partial' && (
          <div className="flex flex-wrap items-center gap-3">
            {request && <VerificationCard request={request} employment={employment} />}
            <Button variant="secondary" onClick={() => setModalOpen(true)}>Request again</Button>
          </div>
        )}

        {employment.status === 'requested' && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring bg-steel/60" />
                <span className="relative inline-flex h-2.5 w-2.5 bg-steel" />
              </span>
              <p className="text-sm font-medium text-foreground/70">Waiting for employer</p>
            </div>
            {request && <MiniTimeline events={request.audit.events} />}
            <div className="mt-3">
              <Button variant="secondary" onClick={handleCopyAgain}>Copy link again</Button>
            </div>
          </div>
        )}

        {employment.status === 'verified' && request && <VerificationCard request={request} employment={employment} />}
      </div>

      {modalOpen && (
        <RequestVerificationModal
          employment={employment}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            onRequestCreated();
          }}
        />
      )}
    </Card>
  );
}

export default function EmploymentList({
  employments,
  requests,
  onRequestCreated,
}: {
  employments: Employment[];
  requests: VerificationRequest[];
  onRequestCreated: () => void;
}) {
  const requestById = new Map(requests.map((r) => [r.id, r]));

  return (
    <div className="space-y-4">
      {employments.map((employment) => (
        <EmploymentCard
          key={employment.id}
          employment={employment}
          request={employment.latestRequestId ? requestById.get(employment.latestRequestId) ?? null : null}
          onRequestCreated={onRequestCreated}
        />
      ))}
    </div>
  );
}
