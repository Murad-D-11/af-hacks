'use client';
// EN: The employer-facing Turkish form. Every factual field starts EMPTY except
// company name and the employer's own name/title, which are prefilled from the
// worker's employment record and the reference contact (never the worker's claimed
// dates, hours, or tasks — the employer must enter those themselves).
import { useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { DUTIES_309A } from '@/lib/skills/309A';
import { monthTr } from '@/lib/hours';
import type { EmployerAnswers, VerificationRequest } from '@/lib/types';

// EN: The six Kocaeli duty ids from the Context Pack demo scenario, used by the
// low-contrast "Demo: fill" button (only shown with ?demo=1).
const DEMO_DUTY_IDS = ['d_mcc', 'd_plc', 'd_motors', 'd_drawings', 'd_conduit', 'd_loto'];

interface FormState {
  companyName: string;
  city: string;
  country: string;
  supervisorName: string;
  supervisorTitle: string;
  roleTitle: string;
  startMonth: string; // '1'..'12'
  startYear: string;
  endMonth: string;
  endYear: string;
  hoursPerWeek: string;
  dutyIds: string[];
  dutyNotesTr: string;
}

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function emptyForm(companyName: string, supervisorName: string, supervisorTitle: string): FormState {
  return {
    companyName,
    city: '',
    country: '',
    supervisorName,
    supervisorTitle,
    roleTitle: '',
    startMonth: '',
    startYear: '',
    endMonth: '',
    endYear: '',
    hoursPerWeek: '',
    dutyIds: [],
    dutyNotesTr: '',
  };
}

function demoFilled(base: FormState): FormState {
  return {
    ...base,
    city: 'Kocaeli',
    country: 'Türkiye',
    roleTitle: 'Endüstriyel Elektrikçi',
    startMonth: '7',
    startYear: '2013',
    endMonth: '3',
    endYear: '2019',
    hoursPerWeek: '45',
    dutyIds: DEMO_DUTY_IDS,
  };
}

function toMonthString(month: string, year: string): string | null {
  if (!month || !year) return null;
  const m = month.padStart(2, '0');
  return `${year}-${m}`;
}

// EN: Shared input styling — a hard-edged field on the dark plate surface with an
// orange focus rail, matching the rest of the ledger's surface language.
const INPUT_CLASS =
  'w-full border border-line bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 ' +
  'transition-colors focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange/40';

export default function EmployerForm({
  request,
  employerName,
  reference,
  isDemo,
  onSubmitted,
}: {
  request: VerificationRequest;
  employerName: string;
  reference: { name: string; title: string };
  isDemo: boolean;
  onSubmitted: (updated: VerificationRequest) => void;
}) {
  const [form, setForm] = useState<FormState>(() => emptyForm(employerName, reference.name, reference.title));
  const [phase, setPhase] = useState<'edit' | 'review'>('edit');
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const monthOptions = useMemo(
    () => MONTHS_TR.map((label, i) => ({ value: String(i + 1), label })),
    [],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleDuty = (id: string) => {
    setForm((prev) => ({
      ...prev,
      dutyIds: prev.dutyIds.includes(id) ? prev.dutyIds.filter((d) => d !== id) : [...prev.dutyIds, id],
    }));
  };

  const buildAnswers = (): Omit<EmployerAnswers, 'submittedAt'> | null => {
    const startDate = toMonthString(form.startMonth, form.startYear);
    const endDate = toMonthString(form.endMonth, form.endYear);
    if (!startDate || !endDate) return null;
    return {
      companyName: form.companyName,
      city: form.city,
      country: form.country,
      supervisorName: form.supervisorName,
      supervisorTitle: form.supervisorTitle,
      roleTitle: form.roleTitle,
      startDate,
      endDate,
      hoursPerWeek: Number(form.hoursPerWeek),
      dutyIds: form.dutyIds,
      dutyNotesTr: form.dutyNotesTr,
    };
  };

  const handleReviewClick = () => {
    const answers = buildAnswers();
    if (!answers) {
      setErrors(['Başlangıç ve bitiş tarihini seçmelisiniz.']);
      return;
    }
    setErrors([]);
    setPhase('review');
  };

  const handleSubmit = async () => {
    const answers = buildAnswers();
    if (!answers) {
      setErrors(['Başlangıç ve bitiş tarihini seçmelisiniz.']);
      setPhase('edit');
      return;
    }
    setSubmitting(true);
    setErrors([]);
    try {
      const res = await fetch(`/api/verify/${request.token}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      });
      const body = await res.json();
      if (!res.ok) {
        setErrors(body.errors ?? [body.error ?? 'Bir hata oluştu.']);
        setPhase('edit');
        return;
      }
      onSubmitted(body as VerificationRequest);
    } catch {
      setErrors(['Sunucuya bağlanılamadı. Lütfen tekrar deneyin.']);
      setPhase('edit');
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === 'review') {
    const answers = buildAnswers();
    return (
      <Card className="animate-stamp-in">
        <p className="text-xs uppercase tracking-wide text-foreground/40">Adım 1 · Özet</p>
        <h2 className="font-stamp mt-1 text-2xl font-bold uppercase tracking-wide text-foreground">Bilgilerinizi kontrol edin</h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <ReviewItem label="Şirket adı" value={form.companyName} />
          <ReviewItem label="Şehir / Ülke" value={`${form.city}, ${form.country}`} />
          <ReviewItem label="Adınız" value={form.supervisorName} />
          <ReviewItem label="Ünvanınız" value={form.supervisorTitle} />
          <ReviewItem label="Çalışanın pozisyonu" value={form.roleTitle} />
          <ReviewItem
            label="Çalışma dönemi"
            value={answers ? `${monthTr(answers.startDate)} – ${monthTr(answers.endDate)}` : '—'}
          />
          <ReviewItem label="Haftalık çalışma saati" value={`${form.hoursPerWeek} saat`} />
          <ReviewItem
            label="Görevler"
            value={
              form.dutyIds.length === 0
                ? '—'
                : form.dutyIds.map((id) => DUTIES_309A.find((d) => d.id === id)?.tr ?? id).join(', ')
            }
          />
          {form.dutyNotesTr && <ReviewItem label="Ek notlar" value={form.dutyNotesTr} />}
        </dl>

        {errors.length > 0 && (
          <ul className="mt-4 space-y-1 border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex gap-3">
          <Button variant="secondary" onClick={() => setPhase('edit')} disabled={submitting}>
            Düzenle
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Gönderiliyor…' : 'Görüntülü doğrulamaya geç'}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="animate-rise-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-foreground/40">Adım 1 · Bilgiler</p>
          <h2 className="font-stamp mt-1 text-2xl font-bold uppercase tracking-wide text-foreground">Çalışma bilgilerini girin</h2>
        </div>
        {isDemo && (
          <button
            type="button"
            onClick={() => setForm(demoFilled(form))}
            className="border border-line px-3 py-1 text-xs uppercase text-foreground/40 hover:border-orange/60 hover:text-orange"
          >
            Demo: doldur
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-foreground/50">
        {/* EN: You enter this information yourself. TradePass never fills in anything on your behalf. */}
        Bu bilgileri siz girersiniz. TradePass hiçbir bilgiyi sizin adınıza yazmaz.
      </p>

      {errors.length > 0 && (
        <ul className="mt-4 space-y-1 border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}

      <form
        className="mt-6 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          handleReviewClick();
        }}
      >
        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Şirket adı">
            <input className={INPUT_CLASS} value={form.companyName} onChange={(e) => set('companyName', e.target.value)} required />
          </Field>
          <Field label="Şehir">
            <input className={INPUT_CLASS} value={form.city} onChange={(e) => set('city', e.target.value)} required />
          </Field>
          <Field label="Ülke">
            <input className={INPUT_CLASS} value={form.country} onChange={(e) => set('country', e.target.value)} required />
          </Field>
          <Field label="Çalışanın pozisyonu">
            <input className={INPUT_CLASS} value={form.roleTitle} onChange={(e) => set('roleTitle', e.target.value)} required />
          </Field>
          <Field label="Adınız">
            <input className={INPUT_CLASS} value={form.supervisorName} onChange={(e) => set('supervisorName', e.target.value)} required />
          </Field>
          <Field label="Ünvanınız">
            <input className={INPUT_CLASS} value={form.supervisorTitle} onChange={(e) => set('supervisorTitle', e.target.value)} required />
          </Field>
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Başlangıç">
            <div className="flex gap-2">
              <select className={INPUT_CLASS} value={form.startMonth} onChange={(e) => set('startMonth', e.target.value)} required>
                <option value="">Ay</option>
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <input
                className={INPUT_CLASS}
                placeholder="Yıl"
                inputMode="numeric"
                value={form.startYear}
                onChange={(e) => set('startYear', e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
              />
            </div>
          </Field>
          <Field label="Bitiş">
            <div className="flex gap-2">
              <select className={INPUT_CLASS} value={form.endMonth} onChange={(e) => set('endMonth', e.target.value)} required>
                <option value="">Ay</option>
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <input
                className={INPUT_CLASS}
                placeholder="Yıl"
                inputMode="numeric"
                value={form.endYear}
                onChange={(e) => set('endYear', e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
              />
            </div>
          </Field>
        </fieldset>

        <Field label="Haftalık çalışma saati">
          <input
            className={`${INPUT_CLASS} max-w-[10rem]`}
            inputMode="numeric"
            value={form.hoursPerWeek}
            onChange={(e) => set('hoursPerWeek', e.target.value.replace(/\D/g, '').slice(0, 3))}
            required
          />
        </Field>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground/70">Görevler</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DUTIES_309A.map((duty) => (
              <label
                key={duty.id}
                className="flex items-start gap-2 border border-line p-3 text-sm transition-colors hover:border-orange/50 hover:bg-orange/5"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 accent-orange"
                  checked={form.dutyIds.includes(duty.id)}
                  onChange={() => toggleDuty(duty.id)}
                />
                <span>{duty.tr}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Ek notlar (isteğe bağlı)">
          <textarea
            className={`${INPUT_CLASS} min-h-[80px]`}
            value={form.dutyNotesTr}
            onChange={(e) => set('dutyNotesTr', e.target.value)}
          />
        </Field>

        <div className="flex items-center justify-between border-t border-line pt-4">
          <Badge tone="blue">Adım 1 / 3</Badge>
          <Button type="submit">İncele ve gönder</Button>
        </div>
      </form>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground/70">{label}</span>
      {children}
    </label>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-foreground/40">{label}</p>
      <p className="text-sm text-foreground/80">{value}</p>
    </div>
  );
}
