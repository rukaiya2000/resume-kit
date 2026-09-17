import { Design, type DeepPartial } from './schema';

export const FONT_OPTIONS = [
  { family: 'IBM Plex Sans', kind: 'sans' },
  { family: 'Source Sans 3', kind: 'sans' },
  { family: 'Lato', kind: 'sans' },
  { family: 'Open Sans', kind: 'sans' },
  { family: 'Source Serif 4', kind: 'serif' },
  { family: 'Merriweather', kind: 'serif' },
] as const;

export const DEFAULT_DESIGN: Design = {
  page: { size: 'Letter', margin: { top: 0.5, right: 0.6, bottom: 0.5, left: 0.6 } },
  font: { family: 'IBM Plex Sans', base: 10.5, name: 20, headline: 11, sectionTitle: 11.5, meta: 10 },
  spacing: {
    lineHeight: 1.25,
    letterSpacing: 0,
    section: 10,
    entry: 6,
    bullet: 1.5,
    sectionPadding: 0,
    bulletIndent: 12,
    header: 6,
  },
  colors: { text: '#111111', accent: '#1a3d6d', divider: '#333333', muted: '#444444' },
  header: { align: 'center', separator: '|', nameCase: 'upper', divider: false },
  sectionTitle: {
    case: 'upper',
    bold: true,
    color: 'accent',
    border: { enabled: true, width: 0.75, style: 'solid', gap: 2 },
  },
  entry: { datePosition: 'right', bullet: '•', dateFormat: 'MMM yyyy', titleBold: true, subtitleItalic: true },
  sectionOverrides: {},
  fit: { enabled: true, minScale: 0.8, maxScale: 1.15, minBaseFont: 9 },
};

export const PAGE_SIZES_IN = {
  Letter: { width: 8.5, height: 11 },
  A4: { width: 8.27, height: 11.69 },
} as const;

export const PX_PER_IN = 96;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) return (patch === undefined ? base : patch) as T;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    out[k] = isPlainObject(v) && isPlainObject(out[k]) ? deepMerge(out[k], v) : v;
  }
  return out as T;
}

/** Template design + resume overrides → validated design. Falls back to the template on bad overrides. */
export function resolveDesign(templateDesign: Design, overrides: DeepPartial<Design> | Record<string, unknown>): Design {
  const merged = deepMerge(templateDesign, overrides);
  const parsed = Design.safeParse(merged);
  return parsed.success ? parsed.data : templateDesign;
}

/** Sets `value` at `path` inside a (possibly empty) overrides object, returning a new object. */
export function setOverride(overrides: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> {
  if (path.length === 0) return overrides;
  const [head, ...rest] = path;
  const current = isPlainObject(overrides[head]) ? (overrides[head] as Record<string, unknown>) : {};
  return { ...overrides, [head]: rest.length ? setOverride(current, rest, value) : value };
}

export function countOverrides(overrides: unknown): number {
  if (!isPlainObject(overrides)) return overrides === undefined ? 0 : 1;
  return Object.values(overrides).reduce<number>((n, v) => n + countOverrides(v), 0);
}

export function getAt(obj: unknown, path: string[]): unknown {
  return path.reduce<unknown>((o, k) => (isPlainObject(o) ? o[k] : undefined), obj);
}
