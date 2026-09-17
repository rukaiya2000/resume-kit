import { countOverrides, getAt, resolveDesign, setOverride, type Design } from '@rc/core';
import { useMemo } from 'react';
import { useEditor } from './store';

function setAtPath(target: Record<string, unknown>, path: string[], value: unknown) {
  let node = target;
  for (const key of path.slice(0, -1)) {
    if (typeof node[key] !== 'object' || node[key] === null) node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  node[path[path.length - 1]] = value;
}

function unsetOverride(overrides: Record<string, unknown>, path: string[]): Record<string, unknown> {
  const [head, ...rest] = path;
  if (!(head in overrides)) return overrides;
  const copy = { ...overrides };
  if (rest.length === 0) delete copy[head];
  else {
    const child = unsetOverride((copy[head] as Record<string, unknown>) ?? {}, rest);
    if (Object.keys(child).length === 0) delete copy[head];
    else copy[head] = child;
  }
  return copy;
}

/** The design being edited plus setters that write to the template (template mode) or to resume overrides. */
export function useDesign() {
  const mode = useEditor((s) => s.mode);
  const resume = useEditor((s) => s.resume);
  const template = useEditor((s) => s.template);

  const design: Design | null = useMemo(() => {
    if (!template) return null;
    if (mode === 'template' || !resume) return template.design;
    return resolveDesign(template.design, resume.designOverrides);
  }, [mode, resume, template]);

  const set = (path: string[], value: unknown) => {
    const state = useEditor.getState();
    if (state.mode === 'template') {
      state.updateTemplate((t) => setAtPath(t.design as unknown as Record<string, unknown>, path, value));
      return;
    }
    if (!state.resume || !state.template) return;
    const templateValue = getAt(state.template.design, path);
    const next =
      JSON.stringify(templateValue) === JSON.stringify(value)
        ? unsetOverride(state.resume.designOverrides, path)
        : setOverride(state.resume.designOverrides, path, value);
    state.updateResume((r) => {
      r.designOverrides = next;
    });
  };

  const overridden = (path: string[]) => mode === 'resume' && !!resume && getAt(resume.designOverrides, path) !== undefined;
  const reset = (path?: string[]) =>
    useEditor.getState().updateResume((r) => {
      r.designOverrides = path ? unsetOverride(JSON.parse(JSON.stringify(r.designOverrides)), path) : {};
    });

  return {
    mode,
    design,
    set,
    overridden,
    reset,
    overrideCount: mode === 'resume' && resume ? countOverrides(resume.designOverrides) : 0,
  };
}
