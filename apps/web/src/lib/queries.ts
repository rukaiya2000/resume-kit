import { resolveDesign, type Resume, type Template } from '@rc/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from './api';

export const keys = {
  resumes: ['resumes'] as const,
  resume: (id: string) => ['resumes', id] as const,
  templates: ['templates'] as const,
};

export const useResumes = () => useQuery({ queryKey: keys.resumes, queryFn: api.resumes });
export const useTemplates = () => useQuery({ queryKey: keys.templates, queryFn: api.templates });

export function useInvalidate() {
  const qc = useQueryClient();
  return {
    resumes: () => qc.invalidateQueries({ queryKey: keys.resumes }),
    templates: () => qc.invalidateQueries({ queryKey: keys.templates }),
  };
}

export function findTemplate(templates: Template[] | undefined, id: string, defaultId?: string) {
  if (!templates?.length) return undefined;
  return templates.find((t) => t.id === id) ?? templates.find((t) => t.id === defaultId) ?? templates[0];
}

/** The design a resume renders with: its template + its own overrides. */
export function useResumeDesign(resume: Resume | undefined, templates: Template[] | undefined, defaultId?: string) {
  return useMemo(() => {
    if (!resume) return undefined;
    const template = findTemplate(templates, resume.templateId, defaultId);
    return template ? resolveDesign(template.design, resume.designOverrides) : undefined;
  }, [resume, templates, defaultId]);
}
