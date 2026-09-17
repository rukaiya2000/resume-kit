import { resolveDesign } from '@rc/core';
import { ResumeDocument } from '@rc/core/render';
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

type Loaded = Awaited<ReturnType<typeof load>>;

async function load(id: string) {
  const [resume, templates] = await Promise.all([api.resume(id), api.templates()]);
  const template = findTemplate(templates.items, resume.templateId, templates.defaultTemplateId);
  if (!template) throw new Error('No template found');
  return { resume, design: resolveDesign(template.design, resume.designOverrides) };
}

/** Bare page used by the API (Playwright → PDF) and the Print button. */
export function PrintPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const [data, setData] = useState<Loaded | null>(null);

  useEffect(() => {
    window.__RESUME_READY__ = false;
    load(id)
      .then(setData)
      .catch((err) => {
        window.__RESUME_ERROR__ = errorMessage(err);
        window.__RESUME_READY__ = true;
      });
  }, [id]);

  useEffect(() => {
    if (!data) return;
    document.title = `${data.resume.name} – Print`;
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
  }, [data, params]);

  if (!data) return null;
  return <ResumeDocument resume={data.resume} design={data.design} mode="print" />;
}
