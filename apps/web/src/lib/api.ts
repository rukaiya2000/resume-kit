import type { CoverLetter, Resume, Template } from '@rc/core';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${url}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  return data as T;
}

export interface FileProblem {
  file: string;
  error: string;
}
export interface ResumeList {
  items: Resume[];
  problems: FileProblem[];
}
export interface TemplateList {
  items: Template[];
  problems: FileProblem[];
  defaultTemplateId: string;
}
export interface ExportResult {
  path: string;
  absolutePath: string;
  pages: number;
  overwritten: boolean;
  at: string;
}

export const api = {
  resumes: () => request<ResumeList>('GET', '/resumes'),
  resume: (id: string) => request<Resume>('GET', `/resumes/${id}`),
  createResume: (body: { name?: string; templateId?: string } = {}) => request<Resume>('POST', '/resumes', body),
  importResume: (json: unknown) => request<Resume>('POST', '/resumes/import', json),
  saveResume: (resume: Resume) => request<Resume>('PUT', `/resumes/${resume.id}`, resume),
  deleteResume: (id: string) => request<void>('DELETE', `/resumes/${id}`),
  duplicateResume: (id: string, body: { company: string; role: string; jobUrl: string; templateId?: string; name?: string }) =>
    request<Resume>('POST', `/resumes/${id}/duplicate`, body),
  exportResume: (id: string) => request<ExportResult>('POST', `/resumes/${id}/export`),
  rescoreResume: (id: string) => request<Resume>('POST', `/resumes/${id}/score`),
  exportName: (name: string, company: string) =>
    request<{ path: string; file: string }>('GET', `/export-name?name=${encodeURIComponent(name)}&company=${encodeURIComponent(company)}`),

  letters: (resumeId?: string) =>
    request<{ items: CoverLetter[] }>('GET', `/letters${resumeId ? `?resumeId=${encodeURIComponent(resumeId)}` : ''}`),
  /** The resume's cover letter, created on first use. */
  ensureLetter: (resumeId: string) => request<CoverLetter>('POST', '/letters', { resumeId }),
  letter: (id: string) => request<CoverLetter>('GET', `/letters/${id}`),
  saveLetter: (letter: CoverLetter) => request<CoverLetter>('PUT', `/letters/${letter.id}`, letter),
  deleteLetter: (id: string) => request<void>('DELETE', `/letters/${id}`),
  exportLetter: (id: string) => request<ExportResult>('POST', `/letters/${id}/export`),

  templates: () => request<TemplateList>('GET', '/templates'),
  template: (id: string) => request<Template>('GET', `/templates/${id}`),
  createTemplate: (body: { name: string; fromTemplateId?: string; design?: unknown }) => request<Template>('POST', '/templates', body),
  importTemplate: (json: unknown) => request<Template>('POST', '/templates/import', json),
  saveTemplate: (template: Template) => request<Template>('PUT', `/templates/${template.id}`, template),
  deleteTemplate: (id: string, reassignTo?: string) =>
    request<void>('DELETE', `/templates/${id}${reassignTo ? `?reassignTo=${encodeURIComponent(reassignTo)}` : ''}`),
  setDefaultTemplate: (id: string) => request<{ defaultTemplateId: string }>('POST', `/templates/${id}/default`),

  openFile: (path: string) => request<{ ok: true }>('POST', '/files/open', { path }),
  revealFile: (path: string) => request<{ ok: true }>('POST', '/files/reveal', { path }),
};

export function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pickJsonFile(): Promise<unknown | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        resolve(JSON.parse(await file.text()));
      } catch {
        reject(new Error('That file is not valid JSON.'));
      }
    };
    input.click();
  });
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong');
