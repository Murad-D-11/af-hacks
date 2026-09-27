import Card from '@/components/ui/Card';

export function BlockersPanel({ blockers }: { blockers: string[] }) {
  if (blockers.length === 0) return null;

  return (
    <Card tone="flagged" className="animate-punch-in">
      <p className="font-stamp text-sm font-bold uppercase tracking-wide text-caution">⚠ Not ready yet</p>
      <ul className="mt-3 space-y-1.5">
        {blockers.map((blocker, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground/75">
            <span className="mt-0.5 text-caution">›</span>
            <span>{blocker}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function ReadyBanner({ verifiedHours }: { verifiedHours: number }) {
  return (
    <div className="animate-punch-in animate-celebrate relative overflow-hidden border border-signal/40 border-t-2 border-t-signal bg-plate p-5 shadow-plate">
      <ConfettiBits />
      <div className="relative flex items-center gap-3">
        <span className="flex h-10 w-10 flex-none rotate-[-6deg] items-center justify-center border-2 border-signal text-lg font-bold text-signal">
          ✓
        </span>
        <p className="text-sm font-medium text-foreground/85 sm:text-base">
          <span className="font-stamp text-signal">READY TO SUBMIT</span> to Skilled Trades Ontario:{' '}
          <span className="font-mono font-semibold text-foreground">{verifiedHours.toLocaleString('en-CA')}</span> verified
          hours, 8/8 skill sets, every employer confirmed on video.
        </p>
      </div>
    </div>
  );
}

function ConfettiBits() {
  const colors = ['bg-orange', 'bg-caution', 'bg-signal', 'bg-steel'];
  const pieces = Array.from({ length: 12 }, (_, i) => ({
    left: `${(i * 8.3) % 100}%`,
    delay: `${(i % 5) * 90}ms`,
    color: colors[i % colors.length],
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={`animate-confetti absolute top-0 h-1.5 w-1.5 ${p.color}`}
          style={{ left: p.left, animationDelay: p.delay }}
        />
      ))}
    </div>
  );
}
