import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DESIGN,
  Resume,
  Template,
  classicTemplate,
  countOverrides,
  deepMerge,
  exportRelativePath,
  formatRange,
  pascalCompany,
  resolveDesign,
  roleAbbrev,
  sampleBaseResume,
  setOverride,
  splitName,
  weekFolder,
} from './index';

describe('naming', () => {
  it('pascal-cases company names and drops symbols', () => {
    expect(pascalCompany('Jane Street')).toBe('JaneStreet');
    expect(pascalCompany('AT&T')).toBe('ATT');
    expect(pascalCompany('google')).toBe('Google');
    expect(pascalCompany('  ')).toBe('');
  });

  it('splits names into first/last', () => {
    expect(splitName('Rukaiya Khan')).toEqual({ first: 'Rukaiya', last: 'Khan' });
    expect(splitName('Rukaiya A. Khan')).toEqual({ first: 'Rukaiya', last: 'Khan' });
  });

  it('uses the Monday of the week for the folder', () => {
    // 2026-09-16 is a Wednesday; 2026-09-20 is a Sunday.
    expect(weekFolder(new Date(2026, 8, 16))).toBe('week-of-2026-09-14');
    expect(weekFolder(new Date(2026, 8, 20))).toBe('week-of-2026-09-14');
    expect(weekFolder(new Date(2026, 8, 21))).toBe('week-of-2026-09-21');
  });

  it('builds export paths', () => {
    const date = new Date(2026, 8, 16);
    expect(exportRelativePath({ fullName: 'Rukaiya Khan', company: 'Google', date })).toBe(
      'week-of-2026-09-14/Khan_Rukaiya_Google_2026-09-16.pdf',
    );
    expect(exportRelativePath({ fullName: 'Rukaiya Khan', company: '', date })).toBe(
      'week-of-2026-09-14/Khan_Rukaiya_Resume_2026-09-16.pdf',
    );
    expect(
      exportRelativePath({ fullName: 'Rukaiya Khan', company: 'Google', role: 'Machine Learning Engineer', includeRole: true, date }),
    ).toBe('week-of-2026-09-14/Khan_Rukaiya_Google_MLE_2026-09-16.pdf');
    expect(roleAbbrev('Intern')).toBe('Intern');
  });
});

describe('design overrides', () => {
  it('deep merges without mutating', () => {
    const merged = deepMerge(DEFAULT_DESIGN, { page: { margin: { top: 0.3 } } });
    expect(merged.page.margin).toEqual({ ...DEFAULT_DESIGN.page.margin, top: 0.3 });
    expect(DEFAULT_DESIGN.page.margin.top).toBe(0.5);
  });

  it('falls back to the template design when overrides are invalid', () => {
    expect(resolveDesign(DEFAULT_DESIGN, { page: { size: 'Tabloid' } })).toEqual(DEFAULT_DESIGN);
  });

  it('sets and counts overrides', () => {
    let o = setOverride({}, ['font', 'base'], 10);
    o = setOverride(o, ['page', 'margin', 'top'], 0.4);
    expect(o).toEqual({ font: { base: 10 }, page: { margin: { top: 0.4 } } });
    expect(countOverrides(o)).toBe(2);
    expect(resolveDesign(DEFAULT_DESIGN, o).font.base).toBe(10);
  });
});

describe('schemas and samples', () => {
  it('ships a valid template and base resume', () => {
    expect(Template.safeParse(classicTemplate()).success).toBe(true);
    expect(Resume.safeParse(sampleBaseResume('r_test')).success).toBe(true);
  });

  it('formats date ranges', () => {
    expect(formatRange({ start: '2024-05', end: '', current: true }, 'MMM yyyy')).toBe('May 2024 – Present');
    expect(formatRange({ start: '2023-06', end: '2024-04', current: false }, 'MM/yyyy')).toBe('06/2023 – 04/2024');
    expect(formatRange({ start: '2024-04', end: '', current: false }, 'yyyy', true)).toBe('2024');
  });
});
