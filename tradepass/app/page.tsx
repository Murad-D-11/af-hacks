// Temporary contractor dashboard (B1). Full dashboard lands in B4.
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { store } from '@/lib/store';

export default function HomePage() {
  const workers = store.listWorkers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-slate-900">Contractor dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Temporary listing — the full dashboard (assessment, coverage, evidence) lands in B4.</p>
      </div>

      {workers.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">
            No workers yet. Seed the database with <code className="rounded bg-slate-100 px-1.5 py-0.5">npx tsx scripts/seed.ts</code> or{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">POST /api/demo/reset</code>.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {workers.map((w) => (
            <Link key={w.id} href={`/workers/${w.id}`}>
              <Card className="transition hover:border-slate-300 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-serif text-lg font-medium text-slate-900">{w.name}</p>
                    <p className="text-xs text-slate-500">{w.currentRole} · {w.contractorName}</p>
                  </div>
                  <Badge tone="blue">{w.trade}</Badge>
                </div>
                <p className="mt-3 text-xs text-slate-500">From {w.homeCountry} · prefers {w.preferredLanguage}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
