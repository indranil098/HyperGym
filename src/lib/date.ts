const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function dayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function shift(key: string, days: number): string {
  const date = fromKey(key);
  date.setDate(date.getDate() + days);
  return dayKey(date);
}

export function dayLabel(key: string): string {
  const today = dayKey();
  if (key === today) {
    return 'Today';
  }
  if (key === shift(today, -1)) {
    return 'Yesterday';
  }
  const date = fromKey(key);
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function shortDate(key: string): string {
  const date = fromKey(key);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function monthDay(key: string): string {
  const date = fromKey(key);
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function clockLabel(at: number): string {
  const date = new Date(at);
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function sortedDesc(keys: string[]): string[] {
  return [...keys].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

const MONTHS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function monthLabel(year: number, month: number): string {
  return `${MONTHS_FULL[month]} ${year}`;
}

export function monthCells(year: number, month: number): (number | null)[] {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const total = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= total; day += 1) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export function keyOf(year: number, month: number, day: number): string {
  return dayKey(new Date(year, month, day));
}

export function countLabel(count: number, word: string, plural?: string): string {
  return `${count} ${count === 1 ? word : (plural ?? `${word}s`)}`;
}

export function relativeDays(key: string): string {
  const today = fromKey(dayKey());
  const then = fromKey(key);
  const days = Math.round((today.getTime() - then.getTime()) / 86400000);
  if (days <= 0) {
    return 'today';
  }
  if (days === 1) {
    return 'yesterday';
  }
  if (days < 7) {
    return `${days} days ago`;
  }
  if (days < 14) {
    return 'last week';
  }
  return `${Math.round(days / 7)} weeks ago`;
}
