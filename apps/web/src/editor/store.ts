import type { Design, Resume, Template } from '@rc/core';
import type { FitResult } from '@rc/core/render';
import { produce, type Draft } from 'immer';
import { temporal } from 'zundo';
import { create } from 'zustand';

export type EditorMode = 'resume' | 'template';
export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface EditorState {
  mode: EditorMode;
  resume: Resume | null;
  /** In template mode this is the template being designed; in resume mode, the resume's template. */
  template: Template | null;
  selectedSectionId: string | null;
  fit: FitResult | null;
  saveStatus: SaveStatus;
  /** Bumped on every content/design change; autosave compares against the last saved revision. */
  revision: number;

  load: (mode: EditorMode, resume: Resume, template: Template) => void;
  updateResume: (recipe: (draft: Draft<Resume>) => void) => void;
  updateTemplate: (recipe: (draft: Draft<Template>) => void) => void;
  setTemplate: (template: Template) => void;
  select: (sectionId: string | null) => void;
  setFit: (fit: FitResult) => void;
  setSaveStatus: (status: SaveStatus) => void;
}

/** Leading-edge throttle so a burst of typing becomes one undo step. */
function throttleLeading<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let last = 0;
  return (...args: A) => {
    const now = Date.now();
    if (now - last > ms) fn(...args);
    last = now;
  };
}

export const useEditor = create<EditorState>()(
  temporal(
    (set) => ({
      mode: 'resume',
      resume: null,
      template: null,
      selectedSectionId: null,
      fit: null,
      saveStatus: 'saved',
      revision: 0,

      load: (mode, resume, template) =>
        set({
          mode,
          resume,
          template,
          selectedSectionId: resume.sections.find((s) => s.type !== 'basics')?.id ?? resume.sections[0]?.id ?? null,
          fit: null,
          saveStatus: 'saved',
          revision: 0,
        }),
      updateResume: (recipe) =>
        set((s) => (s.resume ? { resume: produce(s.resume, recipe), revision: s.revision + 1, saveStatus: 'unsaved' } : {})),
      updateTemplate: (recipe) =>
        set((s) => (s.template ? { template: produce(s.template, recipe), revision: s.revision + 1, saveStatus: 'unsaved' } : {})),
      setTemplate: (template) => set({ template }),
      select: (selectedSectionId) => set({ selectedSectionId }),
      setFit: (fit) => set({ fit }),
      setSaveStatus: (saveStatus) => set({ saveStatus }),
    }),
    {
      // Only content and design are undoable.
      // In resume mode the template is read-only here, so it must not be restored by undo.
      partialize: (s): Partial<EditorState> => (s.mode === 'template' ? { template: s.template } : { resume: s.resume }),
      equality: (a, b) => a.resume === b.resume && a.template === b.template,
      handleSet: (handleSet) => throttleLeading(handleSet, 600),
      limit: 200,
    },
  ),
);

export function undo() {
  useEditor.temporal.getState().undo();
  markChanged();
}
export function redo() {
  useEditor.temporal.getState().redo();
  markChanged();
}
function markChanged() {
  useEditor.setState((s) => ({ revision: s.revision + 1, saveStatus: 'unsaved' }));
}

export function resetHistory() {
  useEditor.temporal.getState().clear();
}

export type { Design };
