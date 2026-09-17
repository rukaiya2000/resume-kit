import { format, isValid, parse } from 'date-fns';
import type { Design, Entry } from './schema';

export function formatMonth(value: string, fmt: Design['entry']['dateFormat']): string {
  if (!value) return '';
  const d = parse(value, 'yyyy-MM', new Date());
  return isValid(d) ? format(d, fmt) : value;
}

export function formatRange(entry: Pick<Entry, 'start' | 'end' | 'current'>, fmt: Design['entry']['dateFormat'], single = false): string {
  const start = formatMonth(entry.start, fmt);
  if (single) return start;
  const end = entry.current ? 'Present' : formatMonth(entry.end, fmt);
  if (start && end) return start === end ? start : `${start} – ${end}`;
  return start || end;
}
