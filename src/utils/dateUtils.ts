import { Holiday, WorkingHoursTier } from '../types';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

export function formatDateToYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = padZero(date.getMonth() + 1);
  const d = padZero(date.getDate());
  return `${y}-${m}-${d}`;
}

export function formatReadableDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function formatTime(timeStr: string | null): string {
  if (!timeStr) return '--:--';
  // If it's an ISO string or HH:mm:ss
  if (timeStr.includes('T')) {
    const d = new Date(timeStr);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
  // If it's HH:mm or HH:mm:ss
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${padZero(displayH)}:${padZero(m)} ${period}`;
  }
  return timeStr;
}

export function formatMinutesToDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0h 0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

export function getDaysInMonth(year: number, month: number): number {
  // month is 1-12
  return new Date(year, month, 0).getDate();
}

export function getCalendarGridDays(year: number, month: number): {
  dateStr: string;
  dayNumber: number;
  dayOfWeek: number; // 0 = Sunday
  isSunday: boolean;
  isCurrentMonth: boolean;
}[] {
  const daysInMonth = getDaysInMonth(year, month);
  const days = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay();
    const dateStr = `${year}-${padZero(month)}-${padZero(day)}`;
    days.push({
      dateStr,
      dayNumber: day,
      dayOfWeek,
      isSunday: dayOfWeek === 0,
      isCurrentMonth: true
    });
  }

  return days;
}

/**
 * 6-working-day organization rule:
 * - Sundays are non-working days
 * - Configured Holidays that fall on Monday-Saturday are non-working days
 * (If a holiday falls on Sunday, it is not double-subtracted)
 */
export function calculateWorkingDaysDetails(
  year: number,
  month: number,
  holidays: Holiday[]
): {
  totalCalendarDays: number;
  sundaysCount: number;
  sundaysList: string[];
  holidaysOnWorkingDaysCount: number;
  holidaysList: { date: string; name: string; isSunday: boolean }[];
  netWorkingDays: number;
} {
  const totalCalendarDays = getDaysInMonth(year, month);
  const sundaysList: string[] = [];
  const holidaysInMonth: { date: string; name: string; isSunday: boolean }[] = [];

  // Month string prefix e.g. "2026-10"
  const monthPrefix = `${year}-${padZero(month)}`;

  for (let day = 1; day <= totalCalendarDays; day++) {
    const d = new Date(year, month - 1, day);
    const dateStr = `${year}-${padZero(month)}-${padZero(day)}`;
    if (d.getDay() === 0) {
      sundaysList.push(dateStr);
    }
  }

  const sundaysCount = sundaysList.length;

  // Filter holidays for this month
  const relevantHolidays = holidays.filter(h => h.date.startsWith(monthPrefix));
  let holidaysOnWorkingDaysCount = 0;

  for (const h of relevantHolidays) {
    const [, , dStr] = h.date.split('-');
    const dayNum = parseInt(dStr, 10);
    const d = new Date(year, month - 1, dayNum);
    const isSunday = d.getDay() === 0;
    holidaysInMonth.push({
      date: h.date,
      name: h.name,
      isSunday
    });
    if (!isSunday) {
      holidaysOnWorkingDaysCount++;
    }
  }

  const netWorkingDays = totalCalendarDays - sundaysCount - holidaysOnWorkingDaysCount;

  return {
    totalCalendarDays,
    sundaysCount,
    sundaysList,
    holidaysOnWorkingDaysCount,
    holidaysList: holidaysInMonth,
    netWorkingDays: Math.max(0, netWorkingDays)
  };
}

export function getWorkingHoursTier(minutes: number): WorkingHoursTier {
  const hours = minutes / 60;
  if (hours >= 8) return 'completed';
  if (hours >= 7) return 'green';
  if (hours >= 5) return 'yellow';
  return 'red';
}

export function getWorkingHoursTierLabel(tier: WorkingHoursTier): {
  label: string;
  colorClass: string;
  badgeClass: string;
} {
  switch (tier) {
    case 'completed':
      return {
        label: 'Normal (≥ 8h)',
        colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        badgeClass: 'bg-slate-900 text-white'
      };
    case 'green':
      return {
        label: 'Optimal (7h - 8h)',
        colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        badgeClass: 'bg-emerald-600 text-white'
      };
    case 'yellow':
      return {
        label: 'Short (5h - 7h)',
        colorClass: 'text-amber-700 bg-amber-50 border-amber-200',
        badgeClass: 'bg-amber-500 text-white'
      };
    case 'red':
    default:
      return {
        label: 'Under (< 5h)',
        colorClass: 'text-rose-700 bg-rose-50 border-rose-200',
        badgeClass: 'bg-rose-600 text-white'
      };
  }
}
