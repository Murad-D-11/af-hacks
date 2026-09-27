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
            ? 'bg-foreground/25'
            : tone === 'confirmed'
              ? 'bg-orange'
              : tone === 'corrected'
                ? 'bg-caution'
                : 'bg-foreground/30';

        const rowClass =
          tone === 'pending'
            ? 'border-line bg-plate'
            : tone === 'confirmed'
              ? 'border-orange/40 bg-orange/[0.08]'
              : tone === 'corrected'
                ? 'border-caution/40 bg-caution/10'
                : 'border-line bg-background';

        return (
          <li
            key={field}
            className={`animate-slide-in-up border p-3 transition-colors ${rowClass}`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 flex-shrink-0 ${dot} ${tone === 'pending' ? 'animate-pulse-ring' : ''}`} />
              <span className="text-sm font-medium text-foreground/85">{FIELD_LABELS_TR[field]}</span>
            </div>
            <p className="mt-1 pl-[18px] text-xs text-foreground/50">{fieldValuePreview(field, answers)}</p>
            {confirmation?.note && (
              <p className="mt-1 pl-[18px] text-xs italic text-caution">{confirmation.note}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
