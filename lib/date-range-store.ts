const KEY = 'upshot_date_range';

export function getStoredDateRange(): { start: string; end: string } {
  if (typeof window === 'undefined') return { start: '', end: '' };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { start: '', end: '' };
    const parsed = JSON.parse(raw);
    if (parsed?.start && parsed?.end) return { start: parsed.start, end: parsed.end };
  } catch {}
  return { start: '', end: '' };
}

export function setStoredDateRange(start: string, end: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ start, end }));
  } catch {}
}
