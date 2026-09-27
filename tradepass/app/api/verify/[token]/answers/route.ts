export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { readDb, writeDb } from '@/lib/store';
import { DUTIES_309A } from '@/lib/skills/309A';
import type { EmployerAnswers } from '@/lib/types';

/** Request statuses from which the employer is still allowed to (re-)submit the form. */
const SUBMITTABLE_STATUSES = new Set(['sent', 'form_submitted']);

const VALID_DUTY_IDS = new Set(DUTIES_309A.map((d) => d.id));

type AnswersBody = Omit<EmployerAnswers, 'submittedAt'>;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidMonthString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** Validates the employer's submitted answers. Returns a list of Turkish error messages. */
function validate(body: Partial<AnswersBody>): string[] {
  const errors: string[] = [];

  if (!isNonEmptyString(body.companyName)) errors.push('Şirket adı boş olamaz.');
  if (!isNonEmptyString(body.city)) errors.push('Şehir boş olamaz.');
  if (!isNonEmptyString(body.country)) errors.push('Ülke boş olamaz.');
  if (!isNonEmptyString(body.supervisorName)) errors.push('Adınız boş olamaz.');
  if (!isNonEmptyString(body.supervisorTitle)) errors.push('Ünvanınız boş olamaz.');
  if (!isNonEmptyString(body.roleTitle)) errors.push('Çalışanın pozisyonu boş olamaz.');

  if (!isValidMonthString(body.startDate)) {
    errors.push('Başlangıç tarihi geçerli bir ay ve yıl olmalıdır.');
  }
  if (!isValidMonthString(body.endDate)) {
    errors.push('Bitiş tarihi geçerli bir ay ve yıl olmalıdır.');
  }
  if (isValidMonthString(body.startDate) && isValidMonthString(body.endDate)) {
    if (body.startDate! >= body.endDate!) {
      errors.push('Başlangıç tarihi bitiş tarihinden önce olmalıdır.');
    }
  }

  if (
    typeof body.hoursPerWeek !== 'number' ||
    !Number.isFinite(body.hoursPerWeek) ||
    body.hoursPerWeek < 1 ||
    body.hoursPerWeek > 80
  ) {
    errors.push('Haftalık çalışma saati 1 ile 80 arasında olmalıdır.');
  }

  if (!Array.isArray(body.dutyIds) || body.dutyIds.length === 0) {
    errors.push('En az bir görev seçmelisiniz.');
  } else if (!body.dutyIds.every((id) => typeof id === 'string' && VALID_DUTY_IDS.has(id))) {
    errors.push('Geçersiz görev seçimi.');
  }

  return errors;
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const db = readDb();
  const idx = db.requests.findIndex((r) => r.token === params.token);
  if (idx < 0) {
    return Response.json({ error: 'Bağlantı bulunamadı.' }, { status: 404 });
  }

  const request = db.requests[idx];
  if (!SUBMITTABLE_STATUSES.has(request.status)) {
    return Response.json(
      { error: 'Bu form artık düzenlenemez. Görüntülü doğrulama aşamasına geçilmiş veya tamamlanmış.' },
      { status: 400 },
    );
  }

  let body: Partial<AnswersBody>;
  try {
    body = (await req.json()) as Partial<AnswersBody>;
  } catch {
    return Response.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }

  const errors = validate(body);
  if (errors.length > 0) {
    return Response.json({ errors }, { status: 400 });
  }

  const answers: EmployerAnswers = {
    companyName: body.companyName!.trim(),
    city: body.city!.trim(),
    country: body.country!.trim(),
    supervisorName: body.supervisorName!.trim(),
    supervisorTitle: body.supervisorTitle!.trim(),
    roleTitle: body.roleTitle!.trim(),
    startDate: body.startDate!,
    endDate: body.endDate!,
    hoursPerWeek: body.hoursPerWeek!,
    dutyIds: body.dutyIds!,
    dutyNotesTr: typeof body.dutyNotesTr === 'string' ? body.dutyNotesTr.trim() : '',
    submittedAt: new Date().toISOString(),
  };

  const wasResubmission = request.status === 'form_submitted';
  db.requests[idx] = { ...request, answers, status: 'form_submitted' };
  db.requests[idx].audit.events.push({
    at: answers.submittedAt,
    type: 'form_submitted',
    detail: wasResubmission
      ? `Employer re-submitted the form for ${answers.companyName}.`
      : `Employer submitted the form for ${answers.companyName}.`,
  });
  writeDb(db);

  return Response.json(db.requests[idx]);
}
