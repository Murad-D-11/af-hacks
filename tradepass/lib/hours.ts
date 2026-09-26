export const WEEKS_PER_MONTH = 4.33;

export function monthsInclusive(start: string, end: string | null): number {
  const [sy, sm] = start.split('-').map(Number);
  const e = end ?? new Date().toISOString().slice(0, 7);
  const [ey, em] = e.split('-').map(Number);
  return Math.max(0, (ey - sy) * 12 + (em - sm) + 1);
}
export function hoursFor(start: string, end: string | null, hoursPerWeek: number): number {
  return Math.round(monthsInclusive(start, end) * WEEKS_PER_MONTH * hoursPerWeek);
}

const TR_MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const EN_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const monthTr = (ym: string) => { const [y, m] = ym.split('-').map(Number); return `${TR_MONTHS[m - 1]} ${y}`; };
export const monthEn = (ym: string) => { const [y, m] = ym.split('-').map(Number); return `${EN_MONTHS[m - 1]} ${y}`; };

// Checks: hoursFor('2019-06','2022-05',40)=6235; hoursFor('2013-07','2019-03',45)=13445; hoursFor('2013-06','2019-03',45)=13640
