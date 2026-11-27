import { DayOfWeek } from '@/types';

const IST_TIMEZONE = 'Asia/Kolkata';
const DAY_NAMES: readonly DayOfWeek[] = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];

export function getNowIST(): { date: string; time: string } {
  const now = new Date();
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const timeParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
  return { date: dateParts, time: timeParts };
}

export function getTodayIST(): string {
  return getNowIST().date;
}

export function isScheduleInPastIST(
  travelDate: string | undefined,
  departureTime: string
): boolean {
  const date = travelDate?.trim();
  if (!date) return false;
  const now = getNowIST();
  if (date < now.date) return true;
  if (date > now.date) return false;
  return departureTime.trim() <= now.time;
}

export function addDaysIST(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
}

export function getWeekdayIST(dateStr: string): DayOfWeek | null {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(utc.getTime())) return null;
  return DAY_NAMES[utc.getUTCDay()] ?? null;
}
