import { format, startOfWeek } from 'date-fns';

/** "Jane Street" → "JaneStreet", "AT&T" → "ATT", "google deepmind" → "GoogleDeepmind". */
export function pascalCompany(input: string): string {
  return input
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');
}

/** "Rukaiya Khan" → { first: "Rukaiya", last: "Khan" }. */
export function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: 'Resume', last: 'My' };
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  return { first: parts[0], last: parts[parts.length - 1] };
}

export function weekFolder(date: Date): string {
  return `week-of-${format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')}`;
}

export interface ExportNameInput {
  fullName: string;
  company: string;
  role?: string;
  date: Date;
  includeRole?: boolean;
  kind?: 'resume' | 'coverLetter';
}

/** Khan_Rukaiya_Google_2026-09-16.pdf (relative path under resumes/: week-of-…/file.pdf). */
export function exportRelativePath({ fullName, company, role, date, includeRole, kind = 'resume' }: ExportNameInput): string {
  const { first, last } = splitName(fullName);
  const clean = (s: string) => pascalCompany(s) || s;
  const parts = [clean(last), clean(first)];
  const co = pascalCompany(company);
  parts.push(co || 'Resume');
  if (includeRole && role && pascalCompany(role)) parts.push(roleAbbrev(role));
  if (kind === 'coverLetter') parts.push('CoverLetter');
  parts.push(format(date, 'yyyy-MM-dd'));
  return `${weekFolder(date)}/${parts.join('_')}.pdf`;
}

/** "Machine Learning Engineer" → "MLE"; single words stay whole ("Intern" → "Intern"). */
export function roleAbbrev(role: string): string {
  const words = role.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (words.length <= 1) return pascalCompany(role);
  return words.map((w) => w[0].toUpperCase()).join('');
}
