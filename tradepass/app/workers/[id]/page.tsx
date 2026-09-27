'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Assessment, WorkerDetail } from '@/lib/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import IntakeSummary from '@/components/worker/IntakeSummary';
import HoursMeter from '@/components/worker/HoursMeter';
import SkillSetGrid from '@/components/worker/SkillSetGrid';
import EmploymentList from '@/components/worker/EmploymentList';
import { BlockersPanel, ReadyBanner } from '@/components/worker/BlockersPanel';

const POLL_INTERVAL_MS = 3000;

export default function WorkerPage() {
  const params = useParams<{ id: string }>();
  const workerId = params.id;

  const [detail, setDetail] = useState<WorkerDetail | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const [detailRes, assessmentRes] = await Promise.all([
        fetch(`/api/workers/${workerId}`),
        fetch(`/api/workers/${workerId}/assessment`),
      ]);

      if (detailRes.status === 404) {
        setNotFound(true);
        return;
      }
      if (!detailRes.ok || !assessmentRes.ok) throw new Error('Failed to load worker.');

      const detailData: WorkerDetail = await detailRes.json();
      const assessmentData: Assessment = await assessmentRes.json();
      setDetail(detailData);
      setAssessment(assessmentData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const hasOpenRequest = detail?.employments.some((e) => e.status === 'requested') ?? false;

    if (hasOpenRequest) {
      pollTimer.current = setTimeout(load, POLL_INTERVAL_MS);
    }

    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [detail, load]);

  if (notFound) {
    return (
      <Card>
        <p className="text-sm text-foreground/60">Worker not found.</p>
        <Link href="/" className="mt-3 inline-block text-sm font-semibold uppercase text-orange hover:text-[#ff7038]">
          ← Back to dashboard
        </Link>
      </Card>
    );
  }

  if (loading || !detail || !assessment) {
    return (
      <Card>
        <p className="text-sm text-foreground/50">Loading…</p>
      </Card>
    );
  }

  const { worker, employments, requests } = detail;

  return (
    <div className="space-y-6">
      <div className="animate-rise-in">
        <Link href="/" className="text-xs font-semibold uppercase tracking-wide text-foreground/40 hover:text-orange">
          ← Dashboard
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-stamp text-4xl font-bold uppercase tracking-wide text-foreground">{worker.name}</h1>
            <p className="mt-1 text-sm text-foreground/60">
              {worker.contractorName} · {worker.currentRole} · from {worker.homeCountry}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Badge tone={assessment.readyToSubmit ? 'green' : 'amber'}>
              {assessment.readyToSubmit ? 'READY TO SUBMIT' : 'NOT READY'}
            </Badge>
            {!worker.intake && (
              <Link
                href={`/workers/${worker.id}/intake`}
                className="text-sm font-semibold uppercase text-orange hover:text-[#ff7038]"
              >
                Record work history (voice) →
              </Link>
            )}
          </div>
        </div>
      </div>

      <IntakeSummary intake={worker.intake} workerId={worker.id} />

      <Card className="animate-rise-in" style={{ animationDelay: '60ms' }}>
        <HoursMeter verifiedHours={assessment.verifiedHours} claimedHours={assessment.claimedHours} />
      </Card>

      <Card className="animate-rise-in" style={{ animationDelay: '120ms' }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-stamp text-lg font-bold uppercase tracking-wide text-foreground">Skill-set coverage</h2>
          <span className="font-mono text-sm text-foreground/50">{assessment.verifiedCount}/{assessment.totalSkillSets}</span>
        </div>
        <SkillSetGrid coverage={assessment.coverage} />
      </Card>

      {assessment.readyToSubmit ? (
        <ReadyBanner verifiedHours={assessment.verifiedHours} />
      ) : (
        <BlockersPanel blockers={assessment.blockers} />
      )}

      <div>
        <h2 className="mb-3 font-stamp text-lg font-bold uppercase tracking-wide text-foreground">Employment history</h2>
        <EmploymentList employments={employments} requests={requests} onRequestCreated={load} />
      </div>

      <div className="flex justify-end pt-2">
        <a href={`/api/workers/${worker.id}/package`} target="_blank" rel="noopener noreferrer">
          <Button variant="secondary">Download evidence package (PDF)</Button>
        </a>
      </div>
    </div>
  );
}
