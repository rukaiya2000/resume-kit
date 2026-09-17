import { ArrowLeft, Check, ChevronDown, CloudOff, Download, Loader2, Printer, Redo2, Star, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useStore } from 'zustand';
import {
  Button,
  Dialog,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
  DropdownSeparator,
  DropdownTrigger,
  Field,
  Input,
  Segmented,
  Switch,
  cn,
} from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { useInvalidate, useTemplates } from '../lib/queries';
import { redo, undo, useEditor } from './store';
import { useDesign } from './useDesign';
import { MatchButton } from './MatchButton';
import { printResume } from './useExport';

export function TopBar({
  view,
  onViewChange,
  onExport,
  exporting,
}: {
  view: 'edit' | 'resume';
  onViewChange: (v: 'edit' | 'resume') => void;
  onExport: () => void;
  exporting: boolean;
}) {
  const mode = useEditor((s) => s.mode);
  const resume = useEditor((s) => s.resume)!;
  const template = useEditor((s) => s.template)!;
  const fit = useEditor((s) => s.fit);
  const { design, set } = useDesign();
  const canUndo = useStore(useEditor.temporal, (s) => s.pastStates.length > 0);
  const canRedo = useStore(useEditor.temporal, (s) => s.futureStates.length > 0);
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-zinc-100 bg-white px-4">
      <Link
        to={mode === 'template' ? '/templates' : '/'}
        aria-label="Back"
        className="flex h-9 w-9 items-center justify-center rounded-[9px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      >
        <ArrowLeft size={18} />
      </Link>

      {mode === 'resume' ? (
        <button type="button" onClick={() => setDetailsOpen(true)} className="flex min-w-0 flex-col items-start rounded-lg px-2 py-1 text-left hover:bg-zinc-100">
          <span className="max-w-64 truncate text-[15px] font-semibold tracking-tight">{resume.name}</span>
          <span className="max-w-64 truncate text-xs text-zinc-500">
            {[resume.company, resume.role].filter(Boolean).join(' · ') || (resume.isBase ? 'Base resume' : 'Add company & role')}
          </span>
        </button>
      ) : (
        <TemplateName />
      )}

      <div className="flex-1" />
      {mode === 'resume' && (
        <Segmented
          label="View"
          value={view}
          onChange={onViewChange}
          options={[
            { value: 'edit', label: 'Edit' },
            { value: 'resume', label: 'Resume' },
          ]}
        />
      )}
      <div className="flex-1" />

      {mode === 'resume' && <MatchButton />}
      {mode === 'resume' && <TemplatePicker />}

      {design && (
        <label className="flex h-9 items-center gap-2.5 rounded-[9px] bg-zinc-100 px-3 text-[13px] text-zinc-700">
          <Switch checked={design.fit.enabled} onCheckedChange={(v) => set(['fit', 'enabled'], v)} label="Fit to one page" />
          Fit to 1 page
          {fit && <b className={cn('tabular-nums', fit.fits ? 'text-zinc-900' : 'text-red-600')}>{Math.round(fit.scale * 100)}%</b>}
        </label>
      )}

      <div className="h-6 w-px bg-zinc-100" />
      <Button variant="ghost" size="icon" aria-label="Undo (⌘Z)" title="Undo (⌘Z)" onClick={undo} disabled={!canUndo}>
        <Undo2 size={17} />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Redo (⇧⌘Z)" title="Redo (⇧⌘Z)" onClick={redo} disabled={!canRedo}>
        <Redo2 size={17} />
      </Button>
      <SaveIndicator />

      {mode === 'resume' ? (
        <>
          <Button size="icon" aria-label="Print (⌘P)" title="Print (⌘P)" onClick={() => printResume()}>
            <Printer size={17} />
          </Button>
          <Button variant="primary" onClick={onExport} disabled={exporting} title="Download PDF (⌘E)">
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Download PDF
          </Button>
        </>
      ) : (
        <SetDefaultButton templateId={template.id} />
      )}

      {mode === 'resume' && <JobDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} />}
    </header>
  );
}

function SaveIndicator() {
  const status = useEditor((s) => s.saveStatus);
  if (status === 'error')
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-red-600" title="Changes are not saved. Check that the API is running.">
        <CloudOff size={14} /> Not saved
      </span>
    );
  if (status === 'saving' || status === 'unsaved') return <span className="w-14 text-xs text-zinc-500">Saving…</span>;
  return (
    <span className="flex w-14 items-center gap-1 text-xs text-emerald-700">
      <Check size={13} strokeWidth={2.5} /> Saved
    </span>
  );
}

function TemplatePicker() {
  const navigate = useNavigate();
  const templates = useTemplates();
  const template = useEditor((s) => s.template)!;
  const count = useEditor((s) => Object.keys(s.resume?.designOverrides ?? {}).length);

  const switchTo = async (id: string) => {
    if (id === template.id) return;
    const next = templates.data?.items.find((t) => t.id === id);
    if (!next) return;
    const { updateResume, setTemplate } = useEditor.getState();
    setTemplate(next);
    updateResume((r) => {
      r.templateId = id;
    });
    toast.success(`Switched to ${next.name}`, {
      description: count > 0 ? 'Your design overrides were kept.' : undefined,
      action:
        count > 0
          ? {
              label: 'Clear overrides',
              onClick: () =>
                useEditor.getState().updateResume((r) => {
                  r.designOverrides = {};
                }),
            }
          : undefined,
    });
  };

  return (
    <DropdownMenu>
      <DropdownTrigger asChild>
        <Button>
          {template.name}
          <ChevronDown size={14} className="text-zinc-500" />
        </Button>
      </DropdownTrigger>
      <DropdownContent>
        <DropdownLabel>Template</DropdownLabel>
        {templates.data?.items.map((t) => (
          <DropdownItem key={t.id} onSelect={() => switchTo(t.id)} icon={t.id === template.id ? <Check size={15} /> : <span className="w-[15px]" />}>
            {t.name}
            {t.id === templates.data.defaultTemplateId && <span className="ml-2 text-xs text-zinc-500">default</span>}
          </DropdownItem>
        ))}
        <DropdownSeparator />
        <DropdownItem onSelect={() => navigate('/templates')}>Manage templates…</DropdownItem>
      </DropdownContent>
    </DropdownMenu>
  );
}

function TemplateName() {
  const name = useEditor((s) => s.template?.name ?? '');
  return (
    <div className="flex flex-col">
      <span className="text-xs text-zinc-500">Designing template</span>
      <input
        aria-label="Template name"
        value={name}
        onChange={(e) =>
          useEditor.getState().updateTemplate((t) => {
            t.name = e.target.value;
          })
        }
        className="w-64 rounded-md bg-transparent text-[15px] font-semibold tracking-tight outline-none hover:bg-zinc-50 focus:bg-zinc-50"
      />
    </div>
  );
}

function SetDefaultButton({ templateId }: { templateId: string }) {
  const templates = useTemplates();
  const invalidate = useInvalidate();
  const isDefault = templates.data?.defaultTemplateId === templateId;
  return (
    <Button
      variant={isDefault ? 'secondary' : 'primary'}
      disabled={isDefault}
      onClick={() =>
        api
          .setDefaultTemplate(templateId)
          .then(() => {
            invalidate.templates();
            toast.success('Set as default template');
          })
          .catch((e) => toast.error(errorMessage(e)))
      }
    >
      <Star size={15} />
      {isDefault ? 'Default template' : 'Set as default'}
    </Button>
  );
}

function JobDetailsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const resume = useEditor((s) => s.resume)!;
  const update = (key: 'name' | 'company' | 'role' | 'jobUrl', value: string) =>
    useEditor.getState().updateResume((r) => {
      r[key] = value;
    });
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Resume details"
      description="Company is used in the PDF file name."
      width={480}
      footer={
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      }
    >
      <Field label="Resume name">
        <Input value={resume.name} onChange={(e) => update('name', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Company">
          <Input value={resume.company} onChange={(e) => update('company', e.target.value)} />
        </Field>
        <Field label="Role">
          <Input value={resume.role} onChange={(e) => update('role', e.target.value)} />
        </Field>
      </div>
      <Field label="Job posting URL" hint="optional">
        <Input value={resume.jobUrl} placeholder="https://" onChange={(e) => update('jobUrl', e.target.value)} />
      </Field>
    </Dialog>
  );
}
