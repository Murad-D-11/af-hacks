import { REQUIRED_HOURS_309A } from '@/lib/skills/309A';

export default function HoursMeter({ verifiedHours, claimedHours }: { verifiedHours: number; claimedHours: number }) {
  const verifiedPct = Math.min(100, (verifiedHours / REQUIRED_HOURS_309A) * 100);
  const claimedPct = Math.min(100, (claimedHours / REQUIRED_HOURS_309A) * 100);

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Verified hours</p>
          <p className="font-mono text-4xl font-semibold text-slate-900 sm:text-5xl">
            {verifiedHours.toLocaleString('en-CA')}
            <span className="text-lg font-normal text-slate-400"> / {REQUIRED_HOURS_309A.toLocaleString('en-CA')}</span>
          </p>
        </div>
        <p className="text-right text-xs text-slate-500">
          Claimed: <span className="font-mono text-slate-700">{claimedHours.toLocaleString('en-CA')}</span>
        </p>
      </div>

      <div className="mt-4 h-4 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="relative h-full w-full">
          {/* Ghost bar: total claimed, behind the solid verified bar. */}
          <div
            className="absolute inset-y-0 left-0 animate-bar-fill rounded-full bg-amber-200"
            style={{ width: `${claimedPct}%` }}
          />
          {/* Solid bar: verified hours, drawn on top. */}
          <div
            className="absolute inset-y-0 left-0 animate-bar-fill rounded-full bg-emerald-600"
            style={{ width: `${verifiedPct}%` }}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-600" /> Verified
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-200" /> Claimed by worker
        </span>
      </div>
    </div>
  );
}
