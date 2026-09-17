import { resolveDesign, type Basics, type CoverLetter, type Design } from '@rc/core';
import { CoverLetterDocument, ResumeDocument } from '@rc/core/render';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { api, errorMessage } from '../lib/api';
import { findTemplate } from '../lib/queries';

declare global {
  interface Window {
    __RESUME_READY__?: boolean;
    __RESUME_ERROR__?: string;
  }
}


async function load(id: string) {
  const [resume, templates] = await Promise.all([api.resume(id), api.templates()]);
  const template = findTemplate(templates.items, resume.templateId, templates.defaultTemplateId);
  if (!template) throw new Error('No template found');
  return { resume, design: resolveDesign(template.design, resume.designOverrides) };
}

/** Loads data, then signals the PDF renderer once fonts and the fit pass are done. */
function usePrintReady<T>(load: () => Promise<T>, key: string, title: (data: T) => string) {
  const [params] = useSearchParams();
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    window.__RESUME_READY__ = false;
    load()
      .then(setData)
      .catch((err) => {
        window.__RESUME_ERROR__ = errorMessage(err);
        window.__RESUME_READY__ = true;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!data) return;
    document.title = title(data);
    let cancelled = false;
    document.fonts.ready.then(() =>
      // Two frames: let the post-font re-fit render before signalling.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (cancelled) return;
          window.__RESUME_READY__ = true;
          if (params.get('autoprint') === '1') window.print();
        }),
      ),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, params]);

  return data;
}

/** Bare page used by the API (Playwright → PDF) and the Print button. */
export function PrintPage() {
  const { id = '' } = useParams();
  const data = usePrintReady(() => load(id), id, (d) => `${d.resume.name} – Print`);
  if (!data) return null;
  return <ResumeDocument resume={data.resume} design={data.design} mode="print" />;
}

async function loadLetter(id: string): Promise<{ letter: CoverLetter; basics: Basics | undefined; design: Design }> {
  const letter = await api.letter(id);
  const { resume, design } = await load(letter.resumeId);
  return { letter, basics: resume.sections.find((s) => s.type === 'basics')?.basics, design };
}

export function PrintLetterPage() {
  const { id = '' } = useParams();
  const data = usePrintReady(() => loadLetter(id), id, (d) => `Cover letter – ${d.letter.company}`);
  if (!data) return null;
  return <CoverLetterDocument letter={data.letter} basics={data.basics} design={data.design} mode="print" />;
}

