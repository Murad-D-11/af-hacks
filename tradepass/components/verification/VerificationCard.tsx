'use client';
// STUB (B1). Developer A owns this file and will build it out in A4.
import type { VerificationRequest, Employment } from '@/lib/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default function VerificationCard({ request, employment }: { request: VerificationRequest; employment: Employment }) {
  const outcome = request.result?.outcome ?? null;
  const tone = outcome === 'verified' ? 'green' : outcome === 'partial' ? 'amber' : outcome === 'failed' ? 'red' : 'gray';

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">{employment.employerName}</p>
          <p className="text-xs text-slate-500">Request status: {request.status}</p>
        </div>
        <Badge tone={tone}>{outcome ?? 'pending'}</Badge>
      </div>
    </Card>
  );
}
