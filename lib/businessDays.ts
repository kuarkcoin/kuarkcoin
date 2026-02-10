function parseDay(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isBusinessDay(date: Date): boolean {
  const weekday = date.getUTCDay();
  return weekday !== 0 && weekday !== 6;
}

export function getLastNBusinessDays(inclusiveDay: string, n: number): string[] {
  const out: string[] = [];
  const cursor = parseDay(inclusiveDay);

  while (out.length < n) {
    if (isBusinessDay(cursor)) {
      out.push(formatDay(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return out;
}

export function getBusinessDayCutoff(inclusiveDay: string, keepLastN: number): string {
  const days = getLastNBusinessDays(inclusiveDay, keepLastN);
  return days[days.length - 1];
}

export function isDayOnOrAfter(day: string, cutoffDay: string): boolean {
  return day >= cutoffDay;
}
