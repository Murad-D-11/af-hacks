export function localTime(tz: string, d = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}
export function isWorkingHours(tz: string, d = new Date()): boolean {
  const [h] = localTime(tz, d).split(':').map(Number);
  return h >= 9 && h < 18;
}
