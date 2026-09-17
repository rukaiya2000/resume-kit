import { weekFolder, type Resume, type Template } from '@rc/core';
import type { FitResult } from '@rc/core/render';
import { parseISO, format, formatDistanceToNow, startOfWeek } from 'date-fns';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  FolderOpen,
  Globe,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { AppHeader, EmptyState } from '../components/AppHeader';
import { ScaledPage } from '../components/ScaledPage';
import {
  Button,
  Dialog,
  DropdownContent,
  DropdownItem,
  DropdownMenu,
  DropdownSeparator,
  DropdownTrigger,
  Field,
  Input,
  Pill,
  cn,
} from '../components/ui';
import { scoreTone } from '../editor/MatchButton';
import { showExportToast } from '../editor/useExport';
import { api, downloadJson, errorMessage, pickJsonFile } from '../lib/api';
import { findTemplate, useInvalidate, useResumes, useTemplates } from '../lib/queries';
import { DuplicateDialog } from './DuplicateDialog';
import { resolveDesign } from '@rc/core';

function activityDate(r: Resume) {
  const last = r.exports.map((e) => e.at).sort().at(-1);
  return parseISO(last ?? r.updatedAt);
}

export function DashboardPage() {
  const resumes = useResumes();
  const templates = useTemplates();
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [duplicate, setDuplicate] = useState<{ open: boolean; sourceId?: string }>({ open: false });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const items = resumes.data?.items ?? [];
  const base = items.find((r) => r.isBase);
  const others = items.filter((r) => !r.isBase);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = others.filter((r) => !q || [r.name, r.company, r.role].some((v) => v.toLowerCase().includes(q)));
    const map = new Map<string, Resume[]>();
    for (const r of filtered.sort((a, b) => +activityDate(b) - +activityDate(a))) {
      const key = weekFolder(activityDate(r));
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()];
  }, [others, query]);

  const thisWeek = weekFolder(new Date());

  const createBlank = async () => {
    try {
      const r = await api.createResume({ name: 'Untitled resume' });
      invalidate.resumes();
      navigate(`/resumes/${r.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const importJson = async () => {
    try {
      const json = await pickJsonFile();
      if (!json) return;
      const r = await api.importResume(json);
      invalidate.resumes();
      toast.success(`Imported “${r.name}”`);
    } catch (err) {
      toast.error('Import failed', { description: errorMessage(err) });
    }
  };

  return (
    <div className="min-h-full">
      <AppHeader>
        <label className="flex h-9 w-72 items-center gap-2 rounded-[9px] border border-zinc-200 bg-white px-2.5 text-zinc-500 shadow-xs focus-within:border-accent-500">
          <Search size={16} />
          <input aria-label="Search resumes" placeholder="Search company or role" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full bg-transparent text-sm text-zinc-900 outline-none" />
        </label>
        <Button onClick={importJson}>
          <Upload size={16} /> Import
        </Button>
        <Button variant="primary" onClick={createBlank}>
          <Plus size={16} /> New resume
        </Button>
      </AppHeader>

      <main className="mx-auto flex max-w-[1360px] flex-col gap-6 px-10 py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-semibold tracking-tight">Resumes</h1>
          <p className="text-sm text-zinc-500">
            {others.length} tailored resume{others.length === 1 ? '' : 's'} · {groups.find(([k]) => k === thisWeek)?.[1].length ?? 0} this week
          </p>
        </div>

        {resumes.data?.problems.length ? (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {resumes.data.problems.length} file(s) in data/resumes couldn’t be read: {resumes.data.problems.map((p) => p.file).join(', ')}
          </div>
        ) : null}
        {resumes.error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Can’t reach the API. Is `pnpm dev` running? ({errorMessage(resumes.error)})</div>}

        {base && (
          <BaseCard resume={base} templates={templates.data?.items} defaultId={templates.data?.defaultTemplateId} onDuplicate={() => setDuplicate({ open: true, sourceId: base.id })} />
        )}

        {groups.length === 0 && resumes.isSuccess && (
          <EmptyState title={query ? 'No resumes match your search' : 'No tailored resumes yet'}>
            {!query && 'Duplicate your Base resume for a job to get started.'}
          </EmptyState>
        )}

        {groups.map(([week, list], gi) => {
          const isCollapsed = collapsed[week] ?? gi > 0;
          return (
            <section key={week} className="flex flex-col gap-4">
              <button type="button" onClick={() => setCollapsed((c) => ({ ...c, [week]: !isCollapsed }))} className="flex items-center gap-2.5 border-t border-zinc-100 pt-4 text-left">
                {isCollapsed ? <ChevronRight size={16} className="text-zinc-600" /> : <ChevronDown size={16} className="text-zinc-600" />}
                <span className="text-[15px] font-semibold">Week of {format(startOfWeek(activityDate(list[0]), { weekStartsOn: 1 }), 'MMM d')}</span>
                <Pill>{list.length}</Pill>
                <span className="font-mono text-xs text-zinc-500">resumes/{week}/</span>
              </button>
              {!isCollapsed && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
                  {list.map((r) => (
                    <ResumeCard key={r.id} resume={r} templates={templates.data?.items} defaultId={templates.data?.defaultTemplateId} onDuplicate={() => setDuplicate({ open: true, sourceId: r.id })} />
                  ))}
                  {gi === 0 && (
                    <button
                      type="button"
                      onClick={() => setDuplicate({ open: true, sourceId: base?.id })}
                      className="flex min-h-72 flex-col items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-dashed border-zinc-300 text-sm font-medium text-zinc-600 hover:bg-white"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-100 text-accent-500">
                        <Plus size={18} />
                      </span>
                      Duplicate Base for a job
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </main>

      <DuplicateDialog open={duplicate.open} sourceId={duplicate.sourceId} onOpenChange={(open) => setDuplicate((d) => ({ ...d, open }))} />
    </div>
  );
}

function useDesignFor(resume: Resume, templates: Template[] | undefined, defaultId?: string) {
  return useMemo(() => {
    const t = findTemplate(templates, resume.templateId, defaultId);
    return t ? { template: t, design: resolveDesign(t.design, resume.designOverrides) } : null;
  }, [resume, templates, defaultId]);
}

function Thumb({ resume, templates, defaultId, onFit, height = 150 }: { resume: Resume; templates?: Template[]; defaultId?: string; onFit?: (f: FitResult) => void; height?: number }) {
  const td = useDesignFor(resume, templates, defaultId);
  const width = height * 0.78;
  return (
    <div className="flex items-end justify-center overflow-hidden rounded-[10px] bg-zinc-100 pt-4" style={{ height }}>
      <div className="overflow-hidden rounded-t bg-white shadow-[0_4px_14px_rgba(16,16,24,0.1)]" style={{ width, height: height - 16 }}>
        {td && <ScaledPage resume={resume} design={td.design} clip onFit={onFit} />}
      </div>
    </div>
  );
}

function BaseCard({ resume, templates, defaultId, onDuplicate }: { resume: Resume; templates?: Template[]; defaultId?: string; onDuplicate: () => void }) {
  const [fit, setFit] = useState<FitResult | null>(null);
  const td = useDesignFor(resume, templates, defaultId);
  const lastExport = resume.exports.at(-1);
  return (
    <div className="flex items-center gap-6 rounded-[14px] border border-zinc-100 bg-white py-4 pr-5 pl-4 shadow-card">
      <Link to={`/resumes/${resume.id}`} className="w-[150px] shrink-0">
        <Thumb resume={resume} templates={templates} defaultId={defaultId} onFit={setFit} height={130} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <Link to={`/resumes/${resume.id}`} className="truncate text-lg font-semibold tracking-tight">
            {resume.name}
          </Link>
          <Pill tone="accent">Base</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-zinc-500">
          <span>{td?.template.name}</span>·<span>Edited {formatDistanceToNow(parseISO(resume.updatedAt), { addSuffix: true })}</span>
          {fit && <FitPill fit={fit} />}
        </div>
      </div>
      <div className="flex gap-2">
        <Link to={`/resumes/${resume.id}`} className="inline-flex h-9 items-center rounded-[9px] px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100">
          Open
        </Link>
        {lastExport && (
          <Button onClick={() => api.openFile(lastExport.path).catch((e) => toast.error(errorMessage(e)))}>
            <ExternalLink size={16} /> Last PDF
          </Button>
        )}
        <Button variant="primary" onClick={onDuplicate}>
          <Copy size={16} /> Duplicate for job
        </Button>
      </div>
    </div>
  );
}

function FitPill({ fit }: { fit: FitResult }) {
  return fit.fits ? (
    <Pill tone="ok">
      <Check size={12} strokeWidth={2.5} /> 1 page
    </Pill>
  ) : (
    <Pill tone="bad">Overflows</Pill>
  );
}

function ResumeCard({ resume, templates, defaultId, onDuplicate }: { resume: Resume; templates?: Template[]; defaultId?: string; onDuplicate: () => void }) {
  const navigate = useNavigate();
  const invalidate = useInvalidate();
  const [fit, setFit] = useState<FitResult | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(resume.name);
  const lastExport = resume.exports.at(-1);

  const rename = async () => {
    try {
      await api.saveResume({ ...resume, name: name.trim() || resume.name });
      invalidate.resumes();
      setRenameOpen(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async () => {
    try {
      await api.deleteResume(resume.id);
      invalidate.resumes();
      setDeleteOpen(false);
      toast.success(`Deleted “${resume.name}”`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const exportNow = async () => {
    const pending = toast.loading('Creating PDF…');
    try {
      const result = await api.exportResume(resume.id);
      toast.dismiss(pending);
      showExportToast(result);
      invalidate.resumes();
    } catch (err) {
      toast.dismiss(pending);
      toast.error('Export failed', { description: errorMessage(err) });
    }
  };

  return (
    <div className="group flex flex-col gap-3 rounded-[14px] border border-zinc-100 bg-white p-2.5 shadow-card transition-shadow hover:shadow-[0_0_0_2px_var(--color-accent-300),0_8px_24px_rgba(16,16,24,0.08)]">
      <Link to={`/resumes/${resume.id}`} aria-label={`Open ${resume.name}`}>
        <Thumb resume={resume} templates={templates} defaultId={defaultId} onFit={setFit} />
      </Link>
      <div className="flex flex-col gap-2 px-1.5 pb-1.5">
        <div className="flex items-center justify-between gap-2">
          <Link to={`/resumes/${resume.id}`} className="truncate text-[15px] font-semibold">
            {resume.company || resume.name}
          </Link>
          <DropdownMenu>
            <DropdownTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More actions">
                <MoreHorizontal size={16} />
              </Button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownItem icon={<Pencil size={15} />} onSelect={() => navigate(`/resumes/${resume.id}`)}>
                Open
              </DropdownItem>
              <DropdownItem icon={<Copy size={15} />} onSelect={onDuplicate}>
                Duplicate for job
              </DropdownItem>
              <DropdownItem
                icon={<Pencil size={15} />}
                onSelect={() => {
                  setName(resume.name);
                  setRenameOpen(true);
                }}
              >
                Rename
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem icon={<Download size={15} />} onSelect={exportNow}>
                Download PDF
              </DropdownItem>
              <DropdownItem icon={<ExternalLink size={15} />} disabled={!lastExport} onSelect={() => lastExport && api.openFile(lastExport.path).catch((e) => toast.error(errorMessage(e)))}>
                Open PDF
              </DropdownItem>
              <DropdownItem icon={<FolderOpen size={15} />} disabled={!lastExport} onSelect={() => lastExport && api.revealFile(lastExport.path).catch((e) => toast.error(errorMessage(e)))}>
                Show in Finder
              </DropdownItem>
              <DropdownItem icon={<Globe size={15} />} onSelect={() => navigate(`/r/${resume.id}`)}>
                Web view
              </DropdownItem>
              <DropdownItem icon={<FileJson size={15} />} onSelect={() => downloadJson(`${resume.name.replace(/[^\w-]+/g, '_')}.json`, resume)}>
                Export JSON
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem icon={<Trash2 size={15} />} danger onSelect={() => setDeleteOpen(true)}>
                Delete…
              </DropdownItem>
            </DropdownContent>
          </DropdownMenu>
        </div>
        <div className="-mt-1.5 truncate text-[13px] text-zinc-500">{resume.role || resume.name}</div>
        <div className={cn('flex flex-wrap gap-1.5')}>
          {resume.source === 'ai' && <Pill tone="accent">AI</Pill>}
          {resume.match && (
            <Pill tone={scoreTone(resume.match.keywords.score)}>
              Match {resume.match.keywords.score}
            </Pill>
          )}
          {fit && <FitPill fit={fit} />}
          {lastExport ? <Pill>Exported {format(parseISO(lastExport.at), 'MMM d')}</Pill> : <Pill>Not exported</Pill>}
        </div>
      </div>

      <Dialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Rename resume"
        width={420}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={rename}>
              Rename
            </Button>
          </>
        }
      >
        <Field label="Name">
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && rename()} />
        </Field>
      </Dialog>
      <Dialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete “${resume.name}”?`}
        description="Exported PDFs in resumes/ are kept."
        width={420}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove}>
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}
