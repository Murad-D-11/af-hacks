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
      <div className="h-2 w-20 overflow-hidden border border-line bg-background">
        <div className="h-full bg-orange" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-foreground/50">{verifiedHours.toLocaleString('en-CA')}/{REQUIRED_HOURS_309A.toLocaleString('en-CA')}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [rows, setRows] = useState<WorkerRow[] | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

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

  const handleReset = async () => {
    setResetting(true);
    setResetMessage(null);
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      if (!res.ok) throw new Error(`Reset failed: ${res.status}`);
      await load();
      setResetMessage({ tone: 'ok', text: 'Demo data reset.' });
    } catch (err) {
      console.error(err);
      setResetMessage({ tone: 'error', text: "Couldn't reset demo data. Check the server log and try again." });
    } finally {
      setResetting(false);
    }
  };

  if (!rows) {
    return (
      <Card>
        <p className="text-sm text-foreground/50">Loading…</p>
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
      <div className="animate-rise-in">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-orange">Site Ledger</p>
        <h1 className="font-stamp mt-1 text-4xl font-bold uppercase tracking-wide text-foreground">
          Your crew&apos;s path to licensing
        </h1>
        <p className="mt-2 text-sm text-foreground/60">
          Verified experience files for skilled trades workers, built from voice claims and employer-confirmed
          video.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="animate-stamp-in" style={{ animationDelay: '40ms' }}>
          <p className="text-xs uppercase tracking-wide text-foreground/40">Workers in progress</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-foreground">{workersInProgress}</p>
        </Card>
        <Card className="animate-stamp-in" style={{ animationDelay: '100ms' }}>
          <p className="text-xs uppercase tracking-wide text-foreground/40">Employers verified</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-foreground">{employersVerified}</p>
        </Card>
        <Card className="animate-stamp-in" style={{ animationDelay: '160ms' }}>
          <p className="text-xs uppercase tracking-wide text-foreground/40">Total verified hours</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-orange">{totalVerifiedHours.toLocaleString('en-CA')}</p>
        </Card>
      </div>

      <Card className="animate-rise-in overflow-x-auto" style={{ animationDelay: '220ms' }}>
        {rows.length === 0 ? (
          <p className="text-sm text-foreground/60">
            No workers yet. Seed the database with <code className="bg-background px-1.5 py-0.5 text-foreground/80">npx tsx scripts/seed.ts</code>.
          </p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-foreground/40">
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
                  <tr key={worker.id} className="border-b border-line/60 last:border-0 hover:bg-plate-raised">
                    <td className="py-3 pr-4 font-medium text-foreground">{worker.name}</td>
                    <td className="py-3 pr-4 text-foreground/60">{worker.homeCountry}</td>
                    <td className="py-3 pr-4 text-foreground/60">{worker.currentRole}</td>
                    <td className="py-3 pr-4"><MiniBar verifiedHours={assessment.verifiedHours} /></td>
                    <td className="py-3 pr-4 font-mono text-foreground/70">{assessment.verifiedCount}/{assessment.totalSkillSets}</td>
                    <td className="py-3 pr-4"><Badge tone={status.tone}>{status.label}</Badge></td>
                    <td className="py-3 text-right">
                      <Link href={`/workers/${worker.id}`} className="text-xs font-semibold uppercase text-orange hover:text-[#ff7038]">
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

      <footer className="flex items-center justify-between border-t border-line pt-4">
        <p className="text-xs uppercase tracking-wide text-foreground/40">Demo controls</p>
        <div className="flex items-center gap-3">
          {resetMessage && (
            <p className={`text-xs ${resetMessage.tone === 'ok' ? 'text-foreground/60' : 'text-danger'}`}>
              {resetMessage.text}
            </p>
          )}
          <Button variant="secondary" disabled={resetting} onClick={() => void handleReset()}>
            {resetting ? 'Resetting…' : 'Reset demo data'}
          </Button>
        </div>
      </footer>
    </div>
  );
}
