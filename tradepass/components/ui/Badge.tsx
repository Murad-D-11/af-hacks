export default function Badge({
  children,
  tone = 'gray',
}: {
  children: React.ReactNode;
  tone?: 'gray' | 'green' | 'amber' | 'red' | 'blue';
}) {
  const t = {
    gray: 'border-line text-foreground/60',
    green: 'border-signal/50 text-signal',
    amber: 'border-caution/50 text-caution',
    red: 'border-danger/50 text-danger',
    blue: 'border-steel/50 text-steel',
  }[tone];
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${t}`}>
      {children}
    </span>
  );
}
