import { nanoid } from 'nanoid';
import type { Entry, Section, SectionType } from './schema';

type EntryField = 'title' | 'subtitle' | 'location' | 'dates' | 'link' | 'meta' | 'description' | 'bullets' | 'items';

export interface SectionTypeConfig {
  label: string;
  defaultTitle: string;
  /** Labels for the entry fields this type uses; fields not listed are hidden in the editor. */
  fields: Partial<Record<EntryField, string>>;
  /** Single date instead of a start–end range. */
  singleDate?: boolean;
  /** Render subtitle on the same line as the title ("Name | tech"). */
  inlineSubtitle?: boolean;
  /** One-line entries ("Award, Issuer — description"). */
  compact?: boolean;
  /** Paragraph layout is allowed / default. */
  paragraph?: 'only' | 'optional';
  addLabel: string;
}

export const SECTION_CONFIG: Record<SectionType, SectionTypeConfig> = {
  basics: { label: 'Basic Info', defaultTitle: 'Basic Info', fields: {}, addLabel: '' },
  summary: { label: 'Summary', defaultTitle: 'Summary', fields: {}, paragraph: 'only', addLabel: '' },
  education: {
    label: 'Education',
    defaultTitle: 'Education',
    fields: { title: 'School', subtitle: 'Degree', location: 'Location', dates: 'Dates', meta: 'GPA / coursework', bullets: 'Bullets' },
    addLabel: 'Add school',
  },
  skills: {
    label: 'Skills',
    defaultTitle: 'Technical Skills',
    fields: { title: 'Category', items: 'Skills' },
    addLabel: 'Add category',
  },
  employment: {
    label: 'Employment',
    defaultTitle: 'Experience',
    fields: { title: 'Company', subtitle: 'Job title', location: 'Location', dates: 'Dates', bullets: 'Bullets' },
    addLabel: 'Add position',
  },
  projects: {
    label: 'Projects',
    defaultTitle: 'Projects',
    fields: { title: 'Project name', subtitle: 'Tech stack', link: 'Link', dates: 'Dates', bullets: 'Bullets' },
    inlineSubtitle: true,
    addLabel: 'Add project',
  },
  awards: {
    label: 'Awards',
    defaultTitle: 'Awards & Activities',
    fields: { title: 'Name', subtitle: 'Organization', dates: 'Dates', description: 'Description' },
    compact: true,
    addLabel: 'Add award',
  },
  volunteering: {
    label: 'Volunteering',
    defaultTitle: 'Volunteering',
    fields: { title: 'Organization', subtitle: 'Role', location: 'Location', dates: 'Dates', bullets: 'Bullets' },
    addLabel: 'Add role',
  },
  activities: {
    label: 'Activities',
    defaultTitle: 'Activities',
    fields: { title: 'Activity', subtitle: 'Role', dates: 'Dates', bullets: 'Bullets' },
    addLabel: 'Add activity',
  },
  custom: {
    label: 'Custom',
    defaultTitle: 'Custom Section',
    fields: { title: 'Title', subtitle: 'Subtitle', location: 'Location', dates: 'Dates', bullets: 'Bullets' },
    paragraph: 'optional',
    addLabel: 'Add entry',
  },
};

export const newId = (prefix: string) => `${prefix}_${nanoid(8)}`;

export function newEntry(partial: Partial<Entry> = {}): Entry {
  return {
    id: newId('e'),
    visible: true,
    title: '',
    subtitle: '',
    location: '',
    start: '',
    end: '',
    current: false,
    link: '',
    meta: '',
    description: '',
    bullets: [],
    items: [],
    ...partial,
  };
}

export function newSection(type: SectionType, title?: string): Section {
  const cfg = SECTION_CONFIG[type];
  return {
    id: newId('s'),
    type,
    title: title ?? cfg.defaultTitle,
    visible: true,
    layout: cfg.paragraph === 'only' ? 'paragraph' : 'entries',
    paragraph: '',
    basics:
      type === 'basics'
        ? { name: '', headline: '', email: '', phone: '', location: '', workAuth: '', links: [] }
        : undefined,
    entries: [],
  };
}
