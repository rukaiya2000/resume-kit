import type { Resume } from '@rc/core';
import { Copy, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button, Dialog, Field, Input, Select } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { useInvalidate, useResumes, useTemplates } from '../lib/queries';

export function DuplicateDialog({ open, onOpenChange, sourceId }: { open: boolean; onOpenChange: (v: boolean) => void; sourceId?: string }) {
  const resumes = useResumes();
  const templates = useTemplates();
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  const items = resumes.data?.items ?? [];
  const base = items.find((r) => r.isBase) ?? items[0];

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [from, setFrom] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);

  const source: Resume | undefined = items.find((r) => r.id === (from || sourceId)) ?? base;

  useEffect(() => {
    if (!open) return;
    setCompany('');
    setRole('');
    setJobUrl('');
    setFrom(sourceId ?? base?.id ?? '');
    setTemplateId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fullName = source?.sections.find((s) => s.type === 'basics')?.basics?.name ?? '';
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => api.exportName(fullName, company).then((r) => setFileName(r.file)).catch(() => {}), 150);
    return () => clearTimeout(t);
  }, [open, fullName, company]);

  const create = async () => {
    if (!source || !company.trim()) return;
    setBusy(true);
    try {
      const created = await api.duplicateResume(source.id, {
        company: company.trim(),
        role: role.trim(),
        jobUrl: jobUrl.trim(),
        templateId: templateId || source.templateId,
      });
      invalidate.resumes();
      onOpenChange(false);
      navigate(`/resumes/${created.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Duplicate for job"
      description="Creates a copy you can tailor to this job."
      icon={<Copy size={20} />}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={create} disabled={!company.trim() || busy}>
            Create & open editor
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company">
            <Input autoFocus value={company} placeholder="e.g. Google" onChange={(e) => setCompany(e.target.value)} />
          </Field>
          <Field label="Role">
            <Input value={role} placeholder="e.g. Machine Learning Engineer" onChange={(e) => setRole(e.target.value)} />
          </Field>
        </div>
        <Field label="Job posting URL" hint="optional">
          <Input value={jobUrl} placeholder="https://" onChange={(e) => setJobUrl(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Copy content from">
            <Select className="h-[38px] text-sm" value={source?.id ?? ''} onChange={(e) => setFrom(e.target.value)}>
              {items.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.isBase ? `${r.name} (Base)` : r.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Template">
            <Select className="h-[38px] text-sm" value={templateId || source?.templateId || ''} onChange={(e) => setTemplateId(e.target.value)}>
              {templates.data?.items.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex items-center gap-2.5 rounded-[10px] border border-zinc-100 bg-zinc-50 px-3 py-2.5 text-[13px] text-zinc-600">
          <FileText size={16} className="text-zinc-500" />
          Exports as
          <span className="truncate font-mono text-xs text-zinc-900">{fileName}</span>
        </div>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
