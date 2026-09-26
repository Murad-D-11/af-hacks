import Card from '@/components/ui/Card';

export function BlockersPanel({ blockers }: { blockers: string[] }) {
  if (blockers.length === 0) return null;

  return (
    <Card className="animate-slide-in-up border-amber-200 bg-amber-50">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Not ready yet</p>
      <ul className="mt-2 space-y-1.5">
        {blockers.map((blocker, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
            <span className="mt-0.5 text-amber-500">•</span>
            <span>{blocker}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function ReadyBanner({ verifiedHours }: { verifiedHours: number }) {
  return (
    <div className="animate-slide-in-up animate-celebrate relative overflow-hidden rounded-xl border border-emerald-300 bg-emerald-50 p-5">
      <ConfettiBits />
      <div className="relative flex items-center gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-emerald-600 text-lg text-white">✓</span>
        <p className="text-sm font-medium text-emerald-900 sm:text-base">
          Ready to submit to Skilled Trades Ontario:{' '}
          <span className="font-mono font-semibold">{verifiedHours.toLocaleString('en-CA')}</span> verified hours, 8/8 skill
          sets, every employer confirmed on video.
        </p>
      </div>
    </div>
  );
}

function ConfettiBits() {
  const colors = ['bg-emerald-400', 'bg-amber-400', 'bg-sky-400', 'bg-emerald-600'];
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
          className={`animate-confetti absolute top-0 h-1.5 w-1.5 rounded-sm ${p.color}`}
          style={{ left: p.left, animationDelay: p.delay }}
        />
      ))}
    </div>
  );
}
