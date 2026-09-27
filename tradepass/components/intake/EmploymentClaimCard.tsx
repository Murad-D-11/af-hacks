import type { Employment } from '@/lib/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { hoursFor, monthTr } from '@/lib/hours';
import { DUTIES_309A, matchSkillSets } from '@/lib/skills/309A';

/** Displays the Turkish label for a claimed task when it matches a known duty
 * exactly, falling back to the raw (English) task string otherwise — this only
 * changes what's shown, never the underlying employment.tasks data that the
 * verification/PDF pipeline consumes downstream. */
function taskLabel(task: string): string {
  const duty = DUTIES_309A.find((d) => d.en.toLowerCase() === task.toLowerCase());
  return duty?.tr ?? task;
}

export default function EmploymentClaimCard({ employment }: { employment: Employment }) {
  const hours = hoursFor(employment.startDate, employment.endDate, employment.hoursPerWeek);
  // EN: "Present"
  const endLabel = employment.endDate ? monthTr(employment.endDate) : 'Şu an';

  return (
    <Card className="animate-stamp-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-stamp text-xl font-bold uppercase tracking-wide text-foreground">{employment.employerName}</p>
          <p className="text-xs text-foreground/50">
            {employment.city}
            {employment.city && employment.country ? ', ' : ''}
            {employment.country}
          </p>
        </div>
        {/* EN: Claimed by the worker. Not yet verified. */}
        <Badge tone="amber">Çalışanın beyanı. Henüz doğrulanmadı.</Badge>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          {/* EN: Dates */}
          <dt className="text-xs uppercase tracking-wide text-foreground/40">Tarihler</dt>
          <dd className="font-mono text-foreground/80">{monthTr(employment.startDate)} – {endLabel}</dd>
        </div>
        <div>
          {/* EN: Hours / week */}
          <dt className="text-xs uppercase tracking-wide text-foreground/40">Haftalık saat</dt>
          <dd className="font-mono text-foreground/80">{employment.hoursPerWeek}</dd>
        </div>
        <div>
          {/* EN: Role */}
          <dt className="text-xs uppercase tracking-wide text-foreground/40">Pozisyon</dt>
          <dd className="text-foreground/80">{employment.roleTitle || '—'}</dd>
        </div>
        <div>
          {/* EN: Supervisor */}
          <dt className="text-xs uppercase tracking-wide text-foreground/40">Amir</dt>
          <dd className="text-foreground/80">{employment.reference.name || '—'}{employment.reference.title ? `, ${employment.reference.title}` : ''}</dd>
        </div>
      </dl>

      <div className="mt-4">
        {/* EN: Claimed hours */}
        <p className="text-xs uppercase tracking-wide text-foreground/40">Beyan edilen saat</p>
        <p className="font-mono text-2xl font-semibold text-foreground">{hours.toLocaleString('en-CA')}</p>
      </div>

      {employment.tasks.length > 0 && (
        <div className="mt-4">
          {/* EN: Duties */}
          <p className="mb-2 text-xs uppercase tracking-wide text-foreground/40">Görevler</p>
          <div className="flex flex-wrap gap-2">
            {employment.tasks.map((task) => {
              const skillSets = matchSkillSets(task);
              return (
                <span key={task} className="inline-flex items-center gap-1.5 border border-line px-2.5 py-1 text-xs text-foreground/70">
                  {taskLabel(task)}
                  {skillSets.map((s) => (
                    <span key={s.id} className="bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] text-foreground/60">{s.code}</span>
                  ))}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
