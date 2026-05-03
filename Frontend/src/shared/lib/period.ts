export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function periodCutoff(period: Period): string {
  const now = new Date();
  const d = new Date(now);
  switch (period) {
    case 'daily':
      d.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      d.setDate(d.getDate() - 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() - 1);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() - 1);
      break;
  }
  return d.toISOString();
}

export function inPeriod(iso: string, period: Period): boolean {
  return iso >= periodCutoff(period);
}
