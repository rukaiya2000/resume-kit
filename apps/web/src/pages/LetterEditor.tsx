import { resolveDesign, type CoverLetter } from '@rc/core';
import { CoverLetterDocument, type FitResult } from '@rc/core/render';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowUp, Check, Download, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { FullPageMessage } from '../components/AppHeader';
import { ScaledPage } from '../components/ScaledPage';
import { Button, Field, Input, Pill, Textarea, cn } from '../components/ui';
import { showExportToast } from '../editor/useExport';
import { api, errorMessage } from '../lib/api';
import { findTemplate, useInvalidate } from '../lib/queries';

type Status = 'saved' | 'saving' | 'unsaved' | 'error';

async function loadLetter(id: string) {
  const letter = await api.letter(id);
  const [resume, templates] = await Promise.all([api.resume(letter.resumeId), api.templates()]);
  return { letter, resume, templates };
}

export function LetterEditorPage() {
  const { id = '' } = useParams();
  const query = useQuery({ queryKey: ['letter', id], queryFn: () => loadLetter(id), gcTime: 0, staleTime: Infinity });
  const [letter, setLetter] = useState<CoverLetter | null>(null);
  const [status, setStatus] = useState<Status>('saved');
  const [fit, setFit] = useState<FitResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const saved = useRef<string>('');
  const invalidate = useInvalidate();

  useEffect(() => {
    if (!query.data) return;
    setLetter(query.data.letter);
    saved.current = JSON.stringify(query.data.letter);
  }, [query.data]);

  const save = async (value: CoverLetter) => {
    const json = JSON.stringify(value);
    if (json === saved.current) return;
    setStatus('saving');
    try {
      await api.saveLetter(value);
      saved.current = json;
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  };

  // Debounced autosave.
  useEffect(() => {
    if (!letter || JSON.stringify(letter) === saved.current) return;
    setStatus('unsaved');
    const t = setTimeout(() => save(letter), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letter]);

  const design = useMemo(() => {
    if (!query.data) return undefined;
    const { resume, templates } = query.data;
    const template = findTemplate(templates.items, resume.templateId, templates.defaultTemplateId);
    return template ? resolveDesign(template.design, resume.designOverrides) : undefined;
  }, [query.data]);

  const exportPdf = async () => {
    if (!letter) return;
    setExporting(true);
    const pending = toast.loading('Creating PDF…');
    try {
      await save(letter);
      const result = await api.exportLetter(letter.id);
      toast.dismiss(pending);
      showExportToast(result);
      invalidate.resumes();
    } catch (err) {
      toast.dismiss(pending);
      toast.error('Export failed', { description: errorMessage(err) });
    } finally {
      setExporting(false);
    }
  };

  useHotkeys('mod+e', exportPdf, { enableOnFormTags: true, preventDefault: true });
  useHotkeys('mod+s', () => letter && save(letter), { enableOnFormTags: true, preventDefault: true });

  if (query.error) return <FullPageMessage title="Couldn’t open the cover letter">{errorMessage(query.error)}</FullPageMessage>;
  if (!letter || !design || !query.data) return null;

  const { resume } = query.data;
  const basics = resume.sections.find((s) => s.type === 'basics')?.basics;
  const update = (patch: Partial<CoverLetter>) => setLetter((l) => (l ? { ...l, ...patch } : l));
  const setParagraph = (i: number, value: string) => update({ paragraphs: letter.paragraphs.map((p, j) => (j === i ? value : p)) });
  const move = (i: number, dir: -1 | 1) => {
    const next = [...letter.paragraphs];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    update({ paragraphs: next });
  };
  const words = letter.paragraphs.join(' ').split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-zinc-100 bg-white px-4">
        <Link
          to={`/resumes/${resume.id}`}
          aria-label="Back to resume"
          className="flex h-9 w-9 items-center justify-center rounded-[9px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold tracking-tight">Cover letter</span>
          <span className="text-xs text-zinc-500">
            {[letter.company, letter.role].filter(Boolean).join(' · ') || resume.name} · matches “{resume.name}”
          </span>
        </div>
        {letter.source === 'ai' && (
          <Pill tone="accent">
            <Sparkles size={12} /> AI draft
          </Pill>
        )}
        <div className="flex-1" />
        {fit && (
          <span className={cn('text-[13px] font-medium', fit.fits ? 'text-emerald-700' : 'text-red-600')}>
            {fit.fits ? `Fits on 1 page · ${Math.round(fit.scale * 100)}%` : `Over one page by ~${fit.overflowLines} lines`}
          </span>
        )}
        <span className="w-20 text-xs text-zinc-500">{words} words</span>
        <SaveStatus status={status} />
        <Button variant="primary" onClick={exportPdf} disabled={exporting} title="Download PDF (⌘E)">
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Download PDF
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto bg-zinc-50">
          <div className="mx-auto flex max-w-[760px] flex-col gap-4 px-8 py-6">
            <section className="flex flex-col gap-3 rounded-[14px] border border-zinc-100 bg-white p-5 shadow-card">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Company" hint="used in the file name">
                  <Input value={letter.company} onChange={(e) => update({ company: e.target.value })} />
                </Field>
                <Field label="Role">
                  <Input value={letter.role} onChange={(e) => update({ role: e.target.value })} />
                </Field>
                <Field label="Date">
                  <Input type="date" value={letter.date} onChange={(e) => update({ date: e.target.value })} />
                </Field>
              </div>
              <span className="pt-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">Recipient</span>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name" hint="optional">
                  <Input value={letter.recipient.name} onChange={(e) => update({ recipient: { ...letter.recipient, name: e.target.value } })} />
                </Field>
                <Field label="Title" hint="optional">
                  <Input value={letter.recipient.title} onChange={(e) => update({ recipient: { ...letter.recipient, title: e.target.value } })} />
                </Field>
                <Field label="Company">
                  <Input value={letter.recipient.company} onChange={(e) => update({ recipient: { ...letter.recipient, company: e.target.value } })} />
                </Field>
                <Field label="Address" hint="optional">
                  <Input value={letter.recipient.address} onChange={(e) => update({ recipient: { ...letter.recipient, address: e.target.value } })} />
                </Field>
              </div>
            </section>

            <section className="flex flex-col gap-3 rounded-[14px] border border-zinc-100 bg-white p-5 shadow-card">
              <Field label="Greeting">
                <Input value={letter.greeting} onChange={(e) => update({ greeting: e.target.value })} />
              </Field>
              {letter.paragraphs.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <Field label={`Paragraph ${i + 1}`} className="flex-1">
                    <Textarea rows={4} value={p} onChange={(e) => setParagraph(i, e.target.value)} />
                  </Field>
                  <div className="flex flex-col justify-end gap-1 pb-1">
                    <Button variant="ghost" size="icon-sm" aria-label={`Move paragraph ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move paragraph ${i + 1} down`}
                      disabled={i === letter.paragraphs.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete paragraph ${i + 1}`}
                      onClick={() => update({ paragraphs: letter.paragraphs.filter((_, j) => j !== i) })}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="dashed" className="self-start" onClick={() => update({ paragraphs: [...letter.paragraphs, ''] })}>
                <Plus size={16} /> Add paragraph
              </Button>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Field label="Closing">
                  <Input value={letter.closing} onChange={(e) => update({ closing: e.target.value })} />
                </Field>
                <Field label="Signature">
                  <Input value={letter.signature} onChange={(e) => update({ signature: e.target.value })} />
                </Field>
              </div>
            </section>
            <p className="text-xs text-zinc-500">
              The header and design come from the resume. Change them there and the letter follows. Ask Claude “write a cover letter for {letter.company || 'this job'}” to draft it.
            </p>
          </div>
        </main>

        <aside className="flex w-[420px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-zinc-100 bg-zinc-100 px-5 py-4">
          <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Preview</span>
          <div className="overflow-hidden rounded-md bg-white shadow-page">
            <ScaledPage design={design} showPageEnd document={<CoverLetterDocument letter={letter} basics={basics} design={design} onFit={setFit} />} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function SaveStatus({ status }: { status: Status }) {
  if (status === 'error') return <span className="text-xs font-medium text-red-600">Not saved</span>;
  if (status !== 'saved') return <span className="w-14 text-xs text-zinc-500">Saving…</span>;
  return (
    <span className="flex w-14 items-center gap-1 text-xs text-emerald-700">
      <Check size={13} strokeWidth={2.5} /> Saved
    </span>
  );
}
