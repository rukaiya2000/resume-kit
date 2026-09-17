import { DEFAULT_DESIGN } from './design';
import type { Resume, Section, SectionType, Template } from './schema';
import { newEntry, newSection } from './sectionTypes';

export const DEFAULT_SECTION_ORDER: SectionType[] = ['basics', 'education', 'skills', 'employment', 'projects', 'awards'];

export function classicTemplate(now = new Date().toISOString()): Template {
  return {
    id: 'classic',
    name: 'Classic ATS',
    schemaVersion: 1,
    design: DEFAULT_DESIGN,
    defaultSections: DEFAULT_SECTION_ORDER,
    createdAt: now,
    updatedAt: now,
  };
}

export function blankResume(id: string, template: Template, now = new Date().toISOString()): Resume {
  return {
    id,
    schemaVersion: 1,
    isBase: false,
    name: 'Untitled resume',
    company: '',
    role: '',
    jobUrl: '',
    templateId: template.id,
    designOverrides: {},
    fitScale: 1,
    sections: template.defaultSections.map((t) => newSection(t)),
    exports: [],
    source: 'manual',
    createdAt: now,
    updatedAt: now,
  };
}

/** Placeholder Base resume so the editor isn't empty on first run. */
export function sampleBaseResume(id: string, now = new Date().toISOString()): Resume {
  const basics = newSection('basics');
  basics.basics = {
    name: 'Rukaiya Khan',
    headline: '',
    email: 'you@example.com',
    phone: '(555) 555-0100',
    location: '[City, ST]',
    workAuth: '',
    links: [
      { id: 'l1', label: 'linkedin.com/in/[handle]', url: 'https://linkedin.com/in/' },
      { id: 'l2', label: 'github.com/[handle]', url: 'https://github.com/' },
    ],
  };

  const education = newSection('education');
  education.entries = [
    newEntry({
      title: '[University]',
      subtitle: '[Degree], [Major]',
      location: '[City, ST]',
      start: '2021-08',
      end: '2025-05',
      meta: 'GPA: [x.xx] · Coursework: [course], [course], [course]',
    }),
  ];

  const skills = newSection('skills');
  skills.entries = [
    newEntry({ title: 'Languages', items: ['Python', 'TypeScript', 'SQL'] }),
    newEntry({ title: 'ML / AI', items: ['PyTorch', '[skill]', '[skill]'] }),
    newEntry({ title: 'Tools', items: ['Git', 'Docker', '[skill]'] }),
  ];

  const employment = newSection('employment');
  employment.entries = [
    newEntry({
      title: '[Company]',
      subtitle: '[Job title]',
      location: '[City, ST]',
      start: '2024-05',
      current: true,
      bullets: [
        '[Action verb] [what you built] using **[tech]**, [measurable impact]',
        '[Action verb] [what you improved], cutting [metric] by [x%]',
        '[Action verb] [collaboration or ownership], serving [n] users',
      ],
    }),
    newEntry({
      title: '[Company]',
      subtitle: '[Job title]',
      location: '[City, ST]',
      start: '2023-06',
      end: '2024-04',
      bullets: ['[Action verb] [what you built], [impact]', '[Action verb] [what you shipped], [impact]'],
    }),
  ];

  const projects = newSection('projects');
  projects.entries = [
    newEntry({
      title: '[Project name]',
      subtitle: '[tech], [tech], [tech]',
      link: 'https://github.com/',
      start: '2025-01',
      bullets: ['[What it does and why it matters]', '[Hardest technical decision and the result]'],
    }),
  ];

  const awards = newSection('awards');
  awards.entries = [
    newEntry({ title: '[Award]', subtitle: '[Organization]', start: '2024-04', description: '[one line]' }),
    newEntry({ title: '[Activity]', subtitle: '[Role]', start: '2023-09', description: '[one line]' }),
  ];

  const sections: Section[] = [basics, education, skills, employment, projects, awards];
  return {
    id,
    schemaVersion: 1,
    isBase: true,
    name: 'Base resume',
    company: '',
    role: '',
    jobUrl: '',
    templateId: 'classic',
    designOverrides: {},
    fitScale: 1,
    sections,
    exports: [],
    source: 'manual',
    createdAt: now,
    updatedAt: now,
  };
}
