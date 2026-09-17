import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Dialog } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { useInvalidate } from '../lib/queries';
import { flushSave } from './autosave';
import { useEditor } from './store';

export function showExportToast(result: { path: string; overwritten: boolean; pages: number }) {
  const [folder, file] = result.path.split('/');
  toast.success(`${result.overwritten ? 'PDF updated' : 'PDF saved'} in resumes/${folder}`, {
    description: `${file}${result.pages > 1 ? ` · ${result.pages} pages` : ''}`,
    duration: 8000,
    action: { label: 'Open PDF', onClick: () => api.openFile(result.path).catch((e) => toast.error(errorMessage(e))) },
    cancel: { label: 'Show in Finder', onClick: () => api.revealFile(result.path).catch((e) => toast.error(errorMessage(e))) },
  });
}

/** Download PDF flow: save → warn when over one page → export → toast. */
export function useExport() {
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const invalidate = useInvalidate();

  const run = async () => {
    const { resume } = useEditor.getState();
    if (!resume) return;
    setConfirmOpen(false);
    setBusy(true);
    const pending = toast.loading('Creating PDF…');
    try {
      await flushSave();
      const result = await api.exportResume(resume.id);
      toast.dismiss(pending);
      showExportToast(result);
      invalidate.resumes();
    } catch (err) {
      toast.dismiss(pending);
      toast.error('Export failed', { description: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const start = () => {
    const { fit, mode } = useEditor.getState();
    if (mode !== 'resume' || busy) return;
    if (fit && fit.pages > 1) setConfirmOpen(true);
    else run();
  };

  const lines = useEditor((s) => s.fit?.overflowLines ?? 0);
  const pages = useEditor((s) => s.fit?.pages ?? 1);

  const dialog = (
    <Dialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title={`This PDF will be ${pages} pages`}
      description={`Turn on Fit to one page, or remove about ${lines} line${lines === 1 ? '' : 's'}.`}
      width={440}
      footer={
        <>
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            Keep editing
          </Button>
          <Button variant="primary" onClick={run}>
            Export anyway
          </Button>
        </>
      }
    />
  );

  return { start, busy, dialog };
}

export async function printResume() {
  const { resume } = useEditor.getState();
  if (!resume) return;
  await flushSave().catch(() => {});
  window.open(`/print/${resume.id}?autoprint=1`, '_blank');
}
