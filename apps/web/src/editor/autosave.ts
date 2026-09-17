import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '../lib/api';
import { keys } from '../lib/queries';
import { useEditor } from './store';

const DELAY = 800;
let timer: ReturnType<typeof setTimeout> | undefined;
let savedRevision = 0;
let chain: Promise<void> = Promise.resolve();

/** Saves the current draft now (after any in-flight save). Resolves once the server has it. */
export function flushSave(): Promise<void> {
  clearTimeout(timer);
  chain = chain.then(async () => {
    const { revision, mode, resume, template, setSaveStatus } = useEditor.getState();
    if (revision === savedRevision) return;
    setSaveStatus('saving');
    try {
      if (mode === 'template' && template) await api.saveTemplate(template);
      else if (resume) await api.saveResume(resume);
      savedRevision = revision;
      // A newer edit may have landed while saving.
      setSaveStatus(useEditor.getState().revision === revision ? 'saved' : 'unsaved');
    } catch (err) {
      setSaveStatus('error');
      throw err;
    }
  });
  return chain;
}

export function resetSaveTracking() {
  clearTimeout(timer);
  savedRevision = 0;
}

export function useAutosave() {
  const qc = useQueryClient();
  const revision = useEditor((s) => s.revision);

  useEffect(() => {
    if (revision === savedRevision) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      flushSave()
        .then(() => {
          qc.invalidateQueries({ queryKey: keys.resumes });
          qc.invalidateQueries({ queryKey: keys.templates });
        })
        .catch(() => {
          /* status shows the error */
        });
    }, DELAY);
  }, [revision, qc]);

  // Save on tab close / navigation away.
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (useEditor.getState().revision !== savedRevision) {
        flushSave().catch(() => {});
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      flushSave().catch(() => {});
    };
  }, []);
}
