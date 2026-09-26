import type { Employment } from '@/lib/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { hoursFor, monthEn } from '@/lib/hours';
import { matchSkillSets } from '@/lib/skills/309A';

export default function EmploymentClaimCard({ employment }: { employment: Employment }) {
  const hours = hoursFor(employment.startDate, employment.endDate, employment.hoursPerWeek);
  const endLabel = employment.endDate ? monthEn(employment.endDate) : 'Present';

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-serif text-lg font-medium text-slate-900">{employment.employerName}</p>
          <p className="text-xs text-slate-500">
            {employment.city}
            {employment.city && employment.country ? ', ' : ''}
            {employment.country}
          </p>
        </div>
        <Badge tone="amber">Claimed by the worker. Not yet verified.</Badge>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Dates</dt>
          <dd className="font-mono text-slate-800">{monthEn(employment.startDate)} – {endLabel}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Hours / week</dt>
          <dd className="font-mono text-slate-800">{employment.hoursPerWeek}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Role</dt>
          <dd className="text-slate-800">{employment.roleTitle || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Supervisor</dt>
          <dd className="text-slate-800">{employment.reference.name || '—'}{employment.reference.title ? `, ${employment.reference.title}` : ''}</dd>
        </div>
      </dl>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">Claimed hours</p>
        <p className="font-mono text-2xl font-semibold text-slate-900">{hours.toLocaleString('en-CA')}</p>
      </div>

      {employment.tasks.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Duties</p>
          <div className="flex flex-wrap gap-2">
            {employment.tasks.map((task) => {
              const skillSets = matchSkillSets(task);
              return (
                <span key={task} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                  {task}
                  {skillSets.map((s) => (
                    <span key={s.id} className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">{s.code}</span>
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
