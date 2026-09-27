// EN: The live 7-field checklist shown during the interview: grey (pending) -> green
// (confirmed) / amber (corrected, with note) -> the employer's own value for context.
import type { ConfirmField, EmployerAnswers, FieldConfirmation } from '@/lib/types';
import { CONFIRM_FIELDS } from '@/lib/types';
import { DUTIES_309A } from '@/lib/skills/309A';
import { monthTr } from '@/lib/hours';

const FIELD_LABELS_TR: Record<ConfirmField, string> = {
  consent: 'Onay',
  identity: 'Kimlik',
  company: 'Şirket',
  role: 'Pozisyon',
  dates: 'Tarihler',
  hours: 'Haftalık saat',
  duties: 'Görevler',
};

function fieldValuePreview(field: ConfirmField, answers: EmployerAnswers): string {
  switch (field) {
    case 'consent':
      return 'Kayıt onayı';
    case 'identity':
      return `${answers.supervisorName}, ${answers.supervisorTitle}`;
    case 'company':
      return answers.companyName;
    case 'role':
      return answers.roleTitle;
    case 'dates':
      return `${monthTr(answers.startDate)} – ${monthTr(answers.endDate)}`;
    case 'hours':
      return `${answers.hoursPerWeek} saat/hafta`;
    case 'duties':
      return answers.dutyIds.map((id) => DUTIES_309A.find((d) => d.id === id)?.tr ?? id).join(', ');
    default:
      return '';
  }
}

export default function FieldChecklist({
  answers,
  confirmations,
}: {
  answers: EmployerAnswers;
  confirmations: FieldConfirmation[];
}) {
  const byField = new Map(confirmations.map((c) => [c.field, c]));

  return (
    <ol className="space-y-2">
      {CONFIRM_FIELDS.map((field) => {
        const confirmation = byField.get(field);
        const tone = !confirmation
          ? 'pending'
          : confirmation.status === 'confirmed'
            ? 'confirmed'
            : confirmation.status === 'corrected'
              ? 'corrected'
              : 'unclear';

        const dot =
          tone === 'pending'
            ? 'bg-slate-300'
            : tone === 'confirmed'
              ? 'bg-emerald-500'
              : tone === 'corrected'
                ? 'bg-amber-500'
                : 'bg-slate-400';

        const rowClass =
          tone === 'pending'
            ? 'border-slate-200 bg-white'
            : tone === 'confirmed'
              ? 'border-emerald-200 bg-emerald-50'
              : tone === 'corrected'
                ? 'border-amber-200 bg-amber-50'
                : 'border-slate-200 bg-slate-50';

        return (
          <li
            key={field}
            className={`animate-slide-in-up rounded-lg border p-3 transition-colors ${rowClass}`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${dot} ${tone === 'pending' ? 'animate-pulse-ring' : ''}`} />
              <span className="text-sm font-medium text-slate-800">{FIELD_LABELS_TR[field]}</span>
            </div>
            <p className="mt-1 pl-[18px] text-xs text-slate-500">{fieldValuePreview(field, answers)}</p>
            {confirmation?.note && (
              <p className="mt-1 pl-[18px] text-xs italic text-amber-700">{confirmation.note}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
