// EN: Three-step progress indicator: 1 Info -> 2 Video verification -> 3 Done.
type StepKey = 'form' | 'interview' | 'done';

const STEPS: { key: StepKey; label: string }[] = [
  { key: 'form', label: '1. Bilgiler' },
  { key: 'interview', label: '2. Görüntülü doğrulama' },
  { key: 'done', label: '3. Tamamlandı' },
];

export default function StepIndicator({ current }: { current: StepKey }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
      {STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <li key={step.key} className="flex items-center gap-2">
            <span
              className={
                'rounded-full px-2.5 py-1 ' +
                (active
                  ? 'bg-emerald-600 text-white'
                  : done
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-400')
              }
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && <span className="text-slate-300">→</span>}
          </li>
        );
      })}
    </ol>
  );
}
