import type { Template } from '@rc/core';
import { Copy, FileJson, MoreHorizontal, Pencil, Plus, Star, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { AppHeader } from '../components/AppHeader';
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
  Select,
} from '../components/ui';
import { ApiError, api, downloadJson, errorMessage, pickJsonFile } from '../lib/api';
import { useInvalidate, useResumes, useTemplates } from '../lib/queries';

export function TemplatesPage() {
  const templates = useTemplates();
  const resumes = useResumes();
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const items = templates.data?.items ?? [];
  const previewResume = resumes.data?.items.find((r) => r.isBase) ?? resumes.data?.items[0];

  const importJson = async () => {
    try {
      const json = await pickJsonFile();
      if (!json) return;
      const t = await api.importTemplate(json);
      invalidate.templates();
      toast.success(`Imported “${t.name}”`);
    } catch (err) {
      toast.error('Import failed', { description: errorMessage(err) });
    }
  };

  return (
    <div className="min-h-full">
      <AppHeader>
        <Button onClick={importJson}>
          <Upload size={16} /> Import
        </Button>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> New template
        </Button>
      </AppHeader>

      <main className="mx-auto flex max-w-[1360px] flex-col gap-6 px-10 py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-semibold tracking-tight">Templates</h1>
          <p className="text-sm text-zinc-500">Design only. Switching a resume’s template never changes its content.</p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
          {items.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              isDefault={t.id === templates.data?.defaultTemplateId}
              all={items}
              usedBy={resumes.data?.items.filter((r) => r.templateId === t.id).length ?? 0}
              previewResume={previewResume}
              onDuplicate={async () => {
                try {
                  const copy = await api.createTemplate({ name: `${t.name} copy`, fromTemplateId: t.id });
                  invalidate.templates();
                  navigate(`/templates/${copy.id}/design`);
                } catch (err) {
                  toast.error(errorMessage(err));
                }
              }}
            />
          ))}
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex min-h-[440px] flex-col items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-dashed border-zinc-300 text-sm text-zinc-600 hover:bg-white"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-100 text-accent-500">
              <Plus size={20} />
            </span>
            <span className="text-[15px] font-semibold text-zinc-900">New template</span>
            <span className="text-[13px] text-zinc-500">Start from an existing design</span>
          </button>
        </div>
      </main>

      <CreateTemplateDialog open={createOpen} onOpenChange={setCreateOpen} templates={items} />
    </div>
  );
}

function TemplateCard({
  template,
  isDefault,
  all,
  usedBy,
  previewResume,
  onDuplicate,
}: {
  template: Template;
  isDefault: boolean;
  all: Template[];
  usedBy: number;
  previewResume?: Parameters<typeof ScaledPage>[0]['resume'];
  onDuplicate: () => void;
}) {
  const invalidate = useInvalidate();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(template.name);
  const others = all.filter((t) => t.id !== template.id);
  const [reassignTo, setReassignTo] = useState('');
  const d = template.design;

  const rename = async () => {
    try {
      await api.saveTemplate({ ...template, name: name.trim() || template.name });
      invalidate.templates();
      setRenameOpen(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async () => {
    try {
      await api.deleteTemplate(template.id, usedBy > 0 ? reassignTo || others[0]?.id : undefined);
      invalidate.templates();
      invalidate.resumes();
      setDeleteOpen(false);
      toast.success(`Deleted “${template.name}”`);
    } catch (err) {
      toast.error(err instanceof ApiError && err.status === 409 ? err.message : errorMessage(err));
    }
  };

  return (
    <div
      className={
        isDefault
          ? 'flex flex-col gap-3 rounded-[14px] bg-white p-2.5 shadow-[0_0_0_2px_var(--color-accent-500),0_8px_24px_rgba(109,74,255,0.12)]'
          : 'flex flex-col gap-3 rounded-[14px] border border-zinc-100 bg-white p-2.5 shadow-card'
      }
    >
      <Link to={`/templates/${template.id}/design`} className="flex h-[300px] justify-center overflow-hidden rounded-[10px] bg-zinc-100 pt-5" aria-label={`Edit ${template.name}`}>
        <div className="w-[232px] shrink-0 self-start overflow-hidden rounded bg-white shadow-[0_6px_20px_rgba(16,16,24,0.12)]">
          {previewResume && <ScaledPage resume={previewResume} design={template.design} clip />}
        </div>
      </Link>
      <div className="flex flex-col gap-2 px-1.5 pb-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[15px] font-semibold">{template.name}</span>
          {isDefault && <Pill tone="solid">Default</Pill>}
        </div>
        <div className="text-[13px] text-zinc-500">
          {d.page.size} · {d.font.family} · {d.header.align === 'center' ? 'Centered' : 'Left'} header · used by {usedBy}
        </div>
        <div className="mt-1 flex gap-1.5">
          <Link to={`/templates/${template.id}/design`} className="inline-flex h-8 flex-1 items-center justify-center rounded-lg bg-accent-500 text-[13px] font-medium text-white hover:bg-accent-600">
            Edit design
          </Link>
          <Button size="sm" className="h-8" onClick={onDuplicate}>
            <Copy size={14} /> Duplicate
          </Button>
          <DropdownMenu>
            <DropdownTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="h-8 w-8" aria-label="More template actions">
                <MoreHorizontal size={16} />
              </Button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownItem
                icon={<Pencil size={15} />}
                onSelect={() => {
                  setName(template.name);
                  setRenameOpen(true);
                }}
              >
                Rename
              </DropdownItem>
              <DropdownItem
                icon={<Star size={15} />}
                disabled={isDefault}
                onSelect={() =>
                  api
                    .setDefaultTemplate(template.id)
                    .then(() => {
                      invalidate.templates();
                      toast.success(`“${template.name}” is now the default`);
                    })
                    .catch((e) => toast.error(errorMessage(e)))
                }
              >
                Set as default
              </DropdownItem>
              <DropdownItem icon={<FileJson size={15} />} onSelect={() => downloadJson(`${template.name.replace(/[^\w-]+/g, '_')}.template.json`, template)}>
                Export JSON
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem icon={<Trash2 size={15} />} danger disabled={isDefault} onSelect={() => setDeleteOpen(true)}>
                Delete…
              </DropdownItem>
            </DropdownContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Rename template"
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
        title={`Delete “${template.name}”?`}
        description={usedBy > 0 ? `${usedBy} resume(s) use this template. Choose which template they should switch to.` : 'This can’t be undone.'}
        width={440}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} disabled={usedBy > 0 && others.length === 0}>
              Delete
            </Button>
          </>
        }
      >
        {usedBy > 0 && others.length > 0 ? (
          <Field label="Switch those resumes to">
            <Select className="h-[38px] text-sm" value={reassignTo || others[0].id} onChange={(e) => setReassignTo(e.target.value)}>
              {others.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </Dialog>
    </div>
  );
}

function CreateTemplateDialog({ open, onOpenChange, templates }: { open: boolean; onOpenChange: (v: boolean) => void; templates: Template[] }) {
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');

  const create = async () => {
    try {
      const t = await api.createTemplate({ name: name.trim() || 'New template', fromTemplateId: from || templates[0]?.id });
      invalidate.templates();
      onOpenChange(false);
      setName('');
      navigate(`/templates/${t.id}/design`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New template"
      description="Start from an existing design, then adjust it."
      icon={<Plus size={20} />}
      width={460}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={create}>
            Create & design
          </Button>
        </>
      }
    >
      <Field label="Name">
        <Input autoFocus value={name} placeholder="e.g. Compact Serif" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
      </Field>
      <Field label="Start from">
        <Select className="h-[38px] text-sm" value={from || templates[0]?.id} onChange={(e) => setFrom(e.target.value)}>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>
    </Dialog>
  );
}
