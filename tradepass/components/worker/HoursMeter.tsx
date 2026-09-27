import { REQUIRED_HOURS_309A } from '@/lib/skills/309A';

export default function HoursMeter({ verifiedHours, claimedHours }: { verifiedHours: number; claimedHours: number }) {
  const verifiedPct = Math.min(100, (verifiedHours / REQUIRED_HOURS_309A) * 100);
  const claimedPct = Math.min(100, (claimedHours / REQUIRED_HOURS_309A) * 100);

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-foreground/40">Verified hours</p>
          <p className="font-mono text-4xl font-semibold text-orange sm:text-5xl">
            {verifiedHours.toLocaleString('en-CA')}
            <span className="text-lg font-normal text-foreground/40"> / {REQUIRED_HOURS_309A.toLocaleString('en-CA')}</span>
          </p>
        </div>
        <p className="text-right text-xs text-foreground/50">
          Claimed: <span className="font-mono text-foreground/70">{claimedHours.toLocaleString('en-CA')}</span>
        </p>
      </div>

      {/* EN: A hard-edged gauge, not a rounded pill — the verified bar carries a
          marching hazard-stripe texture (like caution tape), the claimed ghost
          bar behind it is a flat dim fill. */}
      <div className="mt-4 h-4 w-full border border-line bg-background">
        <div className="relative h-full w-full">
          <div
            className="absolute inset-y-0 left-0 animate-bar-fill bg-caution/25"
            style={{ width: `${claimedPct}%` }}
          />
          <div
            className="animate-march absolute inset-y-0 left-0 animate-bar-fill"
            style={{
              width: `${verifiedPct}%`,
              backgroundImage:
                'repeating-linear-gradient(135deg, var(--orange) 0px, var(--orange) 8px, var(--orange-dim) 8px, var(--orange-dim) 16px)',
            }}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center gap-4 text-xs text-foreground/50">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 bg-orange" /> Verified
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 bg-caution/40" /> Claimed by worker
        </span>
      </div>
    </div>
  );
}
