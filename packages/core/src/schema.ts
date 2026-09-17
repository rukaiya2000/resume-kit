import { z } from 'zod';

export const SECTION_TYPES = [
  'basics',
  'summary',
  'education',
  'skills',
  'employment',
  'projects',
  'awards',
  'volunteering',
  'activities',
  'custom',
] as const;
export const SectionType = z.enum(SECTION_TYPES);
export type SectionType = z.infer<typeof SectionType>;

// ---------- Design (what a template holds) ----------

const Margin = z.object({ top: z.number(), right: z.number(), bottom: z.number(), left: z.number() });

export const SectionOverride = z.object({
  marginTop: z.number().optional(),
  paddingY: z.number().optional(),
  titleColor: z.string().optional(),
  hideTitleBorder: z.boolean().optional(),
});
export type SectionOverride = z.infer<typeof SectionOverride>;

export const Design = z.object({
  page: z.object({ size: z.enum(['Letter', 'A4']), margin: Margin }), // inches
  font: z.object({
    family: z.string(),
    base: z.number(), // pt
    name: z.number(),
    headline: z.number(),
    sectionTitle: z.number(),
    meta: z.number(),
  }),
  spacing: z.object({
    lineHeight: z.number(),
    letterSpacing: z.number(), // em
    section: z.number(), // pt
    entry: z.number(),
    bullet: z.number(),
    sectionPadding: z.number(),
    bulletIndent: z.number(),
    header: z.number(),
  }),
  colors: z.object({ text: z.string(), accent: z.string(), divider: z.string(), muted: z.string() }),
  header: z.object({
    align: z.enum(['left', 'center']),
    separator: z.enum(['|', '•', '·']),
    nameCase: z.enum(['upper', 'normal']),
    divider: z.boolean(),
  }),
  sectionTitle: z.object({
    case: z.enum(['upper', 'title']),
    bold: z.boolean(),
    color: z.enum(['accent', 'text']),
    border: z.object({
      enabled: z.boolean(),
      width: z.number(),
      style: z.enum(['solid', 'dashed', 'dotted']),
      gap: z.number(),
    }),
  }),
  entry: z.object({
    datePosition: z.enum(['right', 'below']),
    bullet: z.enum(['•', '–', '▪', '◦']),
    dateFormat: z.enum(['MMM yyyy', 'MMMM yyyy', 'MM/yyyy', 'yyyy']),
    titleBold: z.boolean(),
    subtitleItalic: z.boolean(),
    // Added after v1 templates were saved: defaults keep older template files valid.
    skillSeparator: z.enum([', ', ' • ', ' | ']).default(', '),
    awardDescription: z.enum(['inline', 'below']).default('inline'),
  }),
  sectionOverrides: z.record(z.string(), SectionOverride),
  fit: z.object({
    enabled: z.boolean(),
    minScale: z.number(),
    maxScale: z.number(),
    minBaseFont: z.number(),
  }),
});
export type Design = z.infer<typeof Design>;

export type DeepPartial<T> = T extends object
  ? T extends unknown[]
    ? T
    : { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export const Template = z.object({
  id: z.string(),
  name: z.string(),
  schemaVersion: z.literal(1),
  design: Design,
  defaultSections: z.array(SectionType),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Template = z.infer<typeof Template>;

// ---------- Resume content ----------

export const Link = z.object({ id: z.string(), label: z.string(), url: z.string() });
export type Link = z.infer<typeof Link>;

export const Basics = z.object({
  name: z.string(),
  headline: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  workAuth: z.string(),
  links: z.array(Link),
});
export type Basics = z.infer<typeof Basics>;

/** One generic entry shape; each section type decides which fields it shows (see sectionTypes.ts). */
export const Entry = z.object({
  id: z.string(),
  visible: z.boolean(),
  title: z.string(),
  subtitle: z.string(),
  location: z.string(),
  start: z.string(), // "YYYY-MM" or ""
  end: z.string(),
  current: z.boolean(),
  link: z.string(),
  meta: z.string(),
  description: z.string(),
  bullets: z.array(z.string()),
  items: z.array(z.string()),
});
export type Entry = z.infer<typeof Entry>;

export const Section = z.object({
  id: z.string(),
  type: SectionType,
  title: z.string(),
  visible: z.boolean(),
  layout: z.enum(['entries', 'paragraph']),
  paragraph: z.string(),
  basics: Basics.optional(),
  entries: z.array(Entry),
});
export type Section = z.infer<typeof Section>;

export const ExportRecord = z.object({ path: z.string(), at: z.string(), pages: z.number() });
export type ExportRecord = z.infer<typeof ExportRecord>;

export const Requirement = z.object({
  requirement: z.string(),
  strength: z.enum(['strong', 'weak', 'missing']),
  evidence: z.string(),
});
export type Requirement = z.infer<typeof Requirement>;

export const MatchReport = z.object({
  keywords: z.object({
    score: z.number(),
    mustHave: z.object({ matched: z.number(), total: z.number() }),
    niceToHave: z.object({ matched: z.number(), total: z.number() }),
    matched: z.array(z.string()),
    aliasOnly: z.array(z.string()),
    missingRequired: z.array(z.string()),
    missingPreferred: z.array(z.string()),
  }),
  requirements: z.array(Requirement).default([]),
  gaps: z.object({ real: z.array(z.string()), weak: z.array(z.string()) }).default({ real: [], weak: [] }),
  improvements: z
    .object({
      addToNotes: z.array(z.string()),
      strengthen: z.array(z.string()),
      upskill: z.array(z.string()),
      applicationTips: z.array(z.string()),
    })
    .default({ addToNotes: [], strengthen: [], upskill: [], applicationTips: [] }),
  /** JD skills the keyword scorer's dictionary doesn't know (so they couldn't be scored). */
  notInDictionary: z.array(z.string()).default([]),
  /** What tailoring changed compared with the Base resume. */
  changes: z
    .object({
      skillsAdded: z.array(z.string()),
      skillsRemoved: z.array(z.string()),
      projectsAdded: z.array(z.string()),
      projectsRemoved: z.array(z.string()),
      bullets: z.array(
        z.object({
          section: z.string(),
          entry: z.string(),
          kind: z.enum(['rewritten', 'added', 'removed']),
          before: z.string(),
          after: z.string(),
        }),
      ),
      unchangedBullets: z.number(),
    })
    .optional(),
  /** Text readable from the exported PDF (what an ATS parses). */
  pdfCheck: z
    .object({
      pages: z.number(),
      extractable: z.boolean(),
      missingKeywords: z.array(z.string()),
      missingBullets: z.array(z.string()),
    })
    .nullish(),
  scoredAt: z.string(),
});
export type MatchReport = z.infer<typeof MatchReport>;

export const MatchHistoryEntry = z.object({
  score: z.number(),
  mustHaveMatched: z.number(),
  mustHaveTotal: z.number(),
  at: z.string(),
  source: z.enum(['ai', 'rescore']),
});
export type MatchHistoryEntry = z.infer<typeof MatchHistoryEntry>;

/** The job a tailored resume was made for (Phase 2). */
export const JobLink = z.object({
  /** Path of the job note inside the Obsidian vault, e.g. "Jobs/Google - MLE.md". */
  note: z.string(),
  title: z.string(),
  url: z.string(),
  description: z.string(),
});
export type JobLink = z.infer<typeof JobLink>;

export const Resume = z.object({
  id: z.string(),
  schemaVersion: z.literal(1),
  isBase: z.boolean(),
  name: z.string(),
  company: z.string(),
  role: z.string(),
  jobUrl: z.string(),
  templateId: z.string(),
  designOverrides: z.record(z.string(), z.unknown()), // DeepPartial<Design>, validated after merge
  fitScale: z.number(),
  sections: z.array(Section),
  exports: z.array(ExportRecord),
  source: z.enum(['manual', 'ai']),
  job: JobLink.optional(),
  match: MatchReport.optional(),
  matchHistory: z.array(MatchHistoryEntry).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Resume = z.infer<typeof Resume>;

/** A cover letter belongs to one resume and reuses its header and design, so the two match. */
export const CoverLetter = z.object({
  id: z.string(),
  schemaVersion: z.literal(1),
  resumeId: z.string(),
  company: z.string(),
  role: z.string(),
  date: z.string(), // YYYY-MM-DD
  recipient: z.object({ name: z.string(), title: z.string(), company: z.string(), address: z.string() }),
  greeting: z.string(),
  paragraphs: z.array(z.string()),
  closing: z.string(),
  signature: z.string(),
  source: z.enum(['manual', 'ai']),
  exports: z.array(ExportRecord),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CoverLetter = z.infer<typeof CoverLetter>;

export const TemplateIndex = z.object({ defaultTemplateId: z.string() });
export type TemplateIndex = z.infer<typeof TemplateIndex>;
