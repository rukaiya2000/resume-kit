import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { FullPageMessage } from '../components/AppHeader';
import { api, errorMessage } from '../lib/api';
import { findTemplate } from '../lib/queries';
import { flushSave, resetSaveTracking, useAutosave } from './autosave';
import { EditView } from './EditView';
import { ResumeView } from './ResumeView';
import { redo, resetHistory, undo, useEditor, type EditorMode } from './store';
import { TopBar } from './TopBar';
import { printResume, useExport } from './useExport';

async function loadEditor(mode: EditorMode, id: string) {
  const templates = await api.templates();
  if (mode === 'template') {
    const template = templates.items.find((t) => t.id === id);
    if (!template) throw new Error('Template not found');
    const resumes = await api.resumes();
    const preview = resumes.items.find((r) => r.isBase) ?? resumes.items[0];
    if (!preview) throw new Error('Create a resume first to preview templates.');
    return { resume: preview, template };
  }
  const resume = await api.resume(id);
  const template = findTemplate(templates.items, resume.templateId, templates.defaultTemplateId);
  if (!template) throw new Error('No templates found');
  return { resume, template };
}

export function EditorPage({ mode }: { mode: EditorMode }) {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const view = mode === 'template' ? 'resume' : params.get('view') === 'resume' ? 'resume' : 'edit';
  const loaded = useEditor((s) => s.resume !== null && s.template !== null);
  const query = useQuery({ queryKey: ['editor', mode, id], queryFn: () => loadEditor(mode, id), gcTime: 0, staleTime: Infinity });
  const exporter = useExport();

  useEffect(() => {
    if (!query.data) return;
    resetSaveTracking();
    useEditor.getState().load(mode, query.data.resume, query.data.template);
    resetHistory();
    return () => {
      useEditor.setState({ resume: null, template: null });
    };
  }, [query.data, mode]);

  useAutosave();

  useEffect(() => {
    const { resume, template } = useEditor.getState();
    document.title = mode === 'template' ? `${template?.name ?? 'Template'} – Design` : `${resume?.name ?? 'Resume'} – Resume Creator`;
  }, [mode, loaded]);

  const hotkeyOpts = { enableOnFormTags: true, preventDefault: true } as const;
  useHotkeys('mod+z', undo, hotkeyOpts);
  useHotkeys('mod+shift+z', redo, hotkeyOpts);
  useHotkeys('mod+s', () => flushSave().then(() => toast.success('Saved')).catch((e) => toast.error(errorMessage(e))), hotkeyOpts);
  useHotkeys('mod+e', () => exporter.start(), hotkeyOpts);
  useHotkeys('mod+p', () => printResume(), hotkeyOpts);

  if (query.error) return <FullPageMessage title="Couldn’t open the editor">{errorMessage(query.error)}</FullPageMessage>;
  if (!loaded) return null;

  const setView = (v: 'edit' | 'resume') => setParams(v === 'resume' ? { view: 'resume' } : {}, { replace: true });

  return (
    <div className="flex h-full flex-col">
      <TopBar view={view} onViewChange={setView} onExport={exporter.start} exporting={exporter.busy} />
      <div className="flex min-h-0 flex-1">{view === 'edit' ? <EditView onOpenDesign={() => setView('resume')} /> : <ResumeView />}</div>
      {exporter.dialog}
    </div>
  );
}
