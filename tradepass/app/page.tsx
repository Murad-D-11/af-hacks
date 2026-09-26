'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Assessment, Worker } from '@/lib/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { REQUIRED_HOURS_309A } from '@/lib/skills/309A';

interface WorkerRow {
  worker: Worker;
  assessment: Assessment;
}

const STATUS_LABEL: Record<string, { label: string; tone: 'gray' | 'green' | 'amber' | 'blue' }> = {
  ready: { label: 'Ready to submit', tone: 'green' },
  in_progress: { label: 'In progress', tone: 'blue' },
  not_started: { label: 'Not started', tone: 'gray' },
};

function MiniBar({ verifiedHours }: { verifiedHours: number }) {
  const pct = Math.min(100, (verifiedHours / REQUIRED_HOURS_309A) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-slate-500">{verifiedHours.toLocaleString('en-CA')}/{REQUIRED_HOURS_309A.toLocaleString('en-CA')}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [rows, setRows] = useState<WorkerRow[] | null>(null);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    const workersRes = await fetch('/api/workers');
    const workers: Worker[] = await workersRes.json();
    const rowsData = await Promise.all(
      workers.map(async (worker) => {
        const res = await fetch(`/api/workers/${worker.id}/assessment`);
        const assessment: Assessment = await res.json();
        return { worker, assessment };
      })
    );
    setRows(rowsData);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleReset = async (scenario: 'full' | 'intake') => {
    setResetting(true);
    try {
      await fetch(`/api/demo/reset?scenario=${scenario}`, { method: 'POST' });
      await load();
    } finally {
      setResetting(false);
    }
  };

  if (!rows) {
    return (
      <Card>
        <p className="text-sm text-slate-500">Loading…</p>
      </Card>
    );
  }

  const workersInProgress = rows.filter((r) => !r.assessment.readyToSubmit && r.assessment.verifiedHours + r.assessment.claimedHours > 0).length;
  const employersVerified = rows.reduce(
    (sum, r) => sum + new Set(r.assessment.coverage.flatMap((c) => c.evidence.filter((e) => e.source === 'verified').map((e) => e.employmentId))).size,
    0
  );
  const totalVerifiedHours = rows.reduce((sum, r) => sum + r.assessment.verifiedHours, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-slate-900">Your crew&apos;s path to licensing</h1>
        <p className="mt-1 text-sm text-slate-600">
          Verified experience files for 309A Construction &amp; Maintenance Electrician, built from voice claims and
          employer-confirmed video.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-400">Workers in progress</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-slate-900">{workersInProgress}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-400">Employers verified</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-slate-900">{employersVerified}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-400">Total verified hours</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-slate-900">{totalVerifiedHours.toLocaleString('en-CA')}</p>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-600">
            No workers yet. Seed the database with <code className="rounded bg-slate-100 px-1.5 py-0.5">npx tsx scripts/seed.ts</code>.
          </p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Country</th>
                <th className="pb-2 pr-4">Role</th>
                <th className="pb-2 pr-4">Verified hours</th>
                <th className="pb-2 pr-4">Skill sets</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ worker, assessment }) => {
                const statusKey = assessment.readyToSubmit ? 'ready' : assessment.verifiedHours + assessment.claimedHours > 0 ? 'in_progress' : 'not_started';
                const status = STATUS_LABEL[statusKey];
                return (
                  <tr key={worker.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-4 font-medium text-slate-900">{worker.name}</td>
                    <td className="py-3 pr-4 text-slate-600">{worker.homeCountry}</td>
                    <td className="py-3 pr-4 text-slate-600">{worker.currentRole}</td>
                    <td className="py-3 pr-4"><MiniBar verifiedHours={assessment.verifiedHours} /></td>
                    <td className="py-3 pr-4 font-mono text-slate-700">{assessment.verifiedCount}/{assessment.totalSkillSets}</td>
                    <td className="py-3 pr-4"><Badge tone={status.tone}>{status.label}</Badge></td>
                    <td className="py-3 text-right">
                      <Link href={`/workers/${worker.id}`} className="text-xs font-medium text-emerald-700 hover:text-emerald-800">
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <footer className="flex items-center justify-between border-t border-slate-200 pt-4">
        <p className="text-xs text-slate-400">Demo controls</p>
        <div className="flex gap-2">
          <Button variant="ghost" disabled={resetting} onClick={() => handleReset('intake')}>
            Reset (intake)
          </Button>
          <Button variant="secondary" disabled={resetting} onClick={() => handleReset('full')}>
            Reset (full)
          </Button>
        </div>
      </footer>
    </div>
  );
}
