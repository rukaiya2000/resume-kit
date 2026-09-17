import { SECTION_CONFIG, newEntry, newId, type Basics, type Entry, type Section } from '@rc/core';
import { plainInline } from '@rc/core/render';
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, Palette, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Button, Dialog, Field, Input, Pill, Segmented, Textarea, cn } from '../components/ui';
import { BulletList } from './BulletList';
import { SECTION_ICONS } from './SectionList';
import { SortableItem, SortableList, arrayMove } from './sortable';
import { useEditor } from './store';

function sectionUpdater(sectionId: string) {
  return (recipe: (section: Section) => void) =>
    useEditor.getState().updateResume((r) => {
      const s = r.sections.find((x) => x.id === sectionId);
      if (s) recipe(s as Section);
    });
}

export function SectionEditor({ onOpenDesign }: { onOpenDesign: () => void }) {
  const section = useEditor((s) => s.resume!.sections.find((x) => x.id === s.selectedSectionId) ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (!section) {
    return <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">Pick a section on the left to edit it.</div>;
  }

  const update = sectionUpdater(section.id);
  const cfg = SECTION_CONFIG[section.type];
  const Icon = SECTION_ICONS[section.type];
  const isOpen = (entry: Entry, index: number) => expanded[entry.id] ?? index === 0;

  const addEntry = () => {
    const entry = newEntry();
    update((s) => {
      s.entries.push(entry);
    });
    setExpanded((e) => ({ ...e, [entry.id]: true }));
  };

  const removeSection = () => {
    const { updateResume, select } = useEditor.getState();
    updateResume((r) => {
      r.sections = r.sections.filter((s) => s.id !== section.id);
    });
    select(null);
    setConfirmDelete(false);
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-zinc-50">
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-3.5 px-8 py-6">
        <div className="flex items-center gap-2.5">
          <Icon size={20} className="text-zinc-400" />
          {section.type === 'basics' ? (
            <h1 className="text-[22px] font-semibold tracking-tight">Basic Info</h1>
          ) : (
            <label className="group flex min-w-0 items-center gap-1.5">
              <input
                aria-label="Section title"
                value={section.title}
                onChange={(e) => update((s) => void (s.title = e.target.value))}
                className="min-w-0 rounded-md bg-transparent px-1 text-[22px] font-semibold tracking-tight outline-none hover:bg-white focus:bg-white focus:ring-3 focus:ring-accent-500/15"
                style={{ width: `${Math.max(6, section.title.length + 1)}ch` }}
              />
              <Pencil size={15} className="text-zinc-400 opacity-0 group-hover:opacity-100" />
            </label>
          )}
          <Pill>{cfg.label}</Pill>
          <div className="flex-1" />
          {cfg.paragraph === 'optional' && (
            <Segmented
              size="sm"
              label="Layout"
              value={section.layout}
              onChange={(v) => update((s) => void (s.layout = v))}
              options={[
                { value: 'entries', label: 'Entries' },
                { value: 'paragraph', label: 'Paragraph' },
              ]}
            />
          )}
          <Button size="sm" variant="ghost" onClick={onOpenDesign} title="Style this section in the Resume view">
            <Palette size={15} /> Style
          </Button>
          {section.type !== 'basics' && (
            <>
              <Button size="sm" onClick={() => update((s) => void (s.visible = !s.visible))}>
                {section.visible ? <EyeOff size={15} /> : <Eye size={15} />}
                {section.visible ? 'Hide' : 'Show'}
              </Button>
              <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={15} /> Delete
              </Button>
            </>
          )}
        </div>

        {!section.visible && <div className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">This section is hidden and won’t appear in the PDF.</div>}

        {section.type === 'basics' && section.basics && <BasicsForm basics={section.basics} update={update} />}

        {section.type !== 'basics' && section.layout === 'paragraph' && (
          <div className="rounded-[14px] border border-zinc-100 bg-white p-5 shadow-card">
            <Field label={section.type === 'summary' ? 'Summary' : 'Text'} hint="**bold**, *italic* and [links](https://) work here">
              <Textarea value={section.paragraph} rows={6} onChange={(e) => update((s) => void (s.paragraph = e.target.value))} />
            </Field>
          </div>
        )}

        {section.type !== 'basics' && section.layout === 'entries' && (
          <>
            <SortableList
              ids={section.entries.map((e) => e.id)}
              onMove={(from, to) => update((s) => void (s.entries = arrayMove(s.entries, from, to)))}
            >
              {section.entries.map((entry, index) => (
                <SortableItem key={entry.id} id={entry.id}>
                  {({ style, handle, ref, dragging }) => (
                    <div ref={ref} style={style} className={cn(dragging && 'opacity-90')}>
                      <EntryCard
                        section={section}
                        entry={entry}
                        open={isOpen(entry, index)}
                        onToggleOpen={() => setExpanded((e) => ({ ...e, [entry.id]: !isOpen(entry, index) }))}
                        handle={handle}
                        update={update}
                        onDuplicate={() => {
                          const copy = { ...structuredClone(entry), id: newId('e') };
                          update((s) => void s.entries.splice(index + 1, 0, copy));
                          setExpanded((e) => ({ ...e, [copy.id]: true }));
                        }}
                      />
                    </div>
                  )}
                </SortableItem>
              ))}
            </SortableList>
            {section.entries.length === 0 && (
              <div className="rounded-[14px] border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">No entries yet.</div>
            )}
            <Button variant="dashed" className="self-start" onClick={addEntry}>
              <Plus size={16} /> {cfg.addLabel}
            </Button>
          </>
        )}
      </div>

      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${section.title}”?`}
        description="You can undo this with ⌘Z. To keep it without printing, hide it instead."
        width={440}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={removeSection}>
              Delete section
            </Button>
          </>
        }
      />
    </main>
  );
}

function BasicsForm({ basics, update }: { basics: Basics; update: ReturnType<typeof sectionUpdater> }) {
  const set = (key: Exclude<keyof Basics, 'links'>, value: string) => update((s) => void (s.basics![key] = value));
  return (
    <div className="flex flex-col gap-4 rounded-[14px] border border-zinc-100 bg-white p-5 shadow-card">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full name" hint="used in the PDF file name">
          <Input value={basics.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Headline" hint="optional">
          <Input value={basics.headline} placeholder="e.g. Machine Learning Engineer" onChange={(e) => set('headline', e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={basics.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={basics.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="Location">
          <Input value={basics.location} onChange={(e) => set('location', e.target.value)} />
        </Field>
        <Field label="Work authorization" hint="optional">
          <Input value={basics.workAuth} placeholder="e.g. US Citizen" onChange={(e) => set('workAuth', e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Links</span>
        {basics.links.map((link, i) => (
          <div key={link.id} className="flex items-center gap-2">
            <Input
              aria-label="Link label"
              className="w-64"
              placeholder="Label (shown)"
              value={link.label}
              onChange={(e) => update((s) => void (s.basics!.links[i].label = e.target.value))}
            />
            <Input aria-label="Link URL" placeholder="https://" value={link.url} onChange={(e) => update((s) => void (s.basics!.links[i].url = e.target.value))} />
            <Button variant="ghost" size="icon-sm" aria-label="Remove link" onClick={() => update((s) => void s.basics!.links.splice(i, 1))}>
              <X size={15} />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="self-start text-accent-600"
          onClick={() => update((s) => void s.basics!.links.push({ id: newId('l'), label: '', url: '' }))}
        >
          <Plus size={15} /> Add link
        </Button>
      </div>
    </div>
  );
}

function EntryCard({
  section,
  entry,
  open,
  onToggleOpen,
  handle,
  update,
  onDuplicate,
}: {
  section: Section;
  entry: Entry;
  open: boolean;
  onToggleOpen: () => void;
  handle: React.ReactNode;
  update: ReturnType<typeof sectionUpdater>;
  onDuplicate: () => void;
}) {
  const cfg = SECTION_CONFIG[section.type];
  const f = cfg.fields;
  const setEntry = (recipe: (e: Entry) => void) =>
    update((s) => {
      const e = s.entries.find((x) => x.id === entry.id);
      if (e) recipe(e);
    });
  const set = <K extends keyof Entry>(key: K, value: Entry[K]) => setEntry((e) => void (e[key] = value));

  const summary = [
    entry.subtitle,
    entry.items.length ? `${entry.items.length} skills` : '',
    entry.bullets.length ? `${entry.bullets.length} bullets` : '',
  ].filter(Boolean);

  return (
    <div
      className={cn(
        'rounded-[14px] border bg-white',
        open ? 'border-zinc-100 shadow-[0_1px_2px_rgba(16,16,24,0.04),0_4px_16px_rgba(16,16,24,0.05)]' : 'border-zinc-100',
        !entry.visible && 'border-dashed border-zinc-200',
      )}
    >
      <div className={cn('flex items-center gap-2.5 px-4', open ? 'pt-4' : 'h-[52px]')}>
        {handle}
        <button type="button" onClick={onToggleOpen} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          <span className={cn('truncate text-[15px] font-semibold', !entry.visible && 'text-zinc-400')}>
            {plainInline(entry.title) || <span className="text-zinc-400">Untitled</span>}
          </span>
          {!open && summary.map((s) => <Pill key={s}>{plainInline(s)}</Pill>)}
          {!entry.visible && <Pill>Hidden from PDF</Pill>}
        </button>
        <Button variant="ghost" size="icon-sm" aria-label={entry.visible ? 'Hide entry' : 'Show entry'} title={entry.visible ? 'Hide from PDF' : 'Show in PDF'} onClick={() => set('visible', !entry.visible)}>
          {entry.visible ? <Eye size={16} /> : <EyeOff size={16} />}
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Duplicate entry" title="Duplicate" onClick={onDuplicate}>
          <Copy size={15} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete entry"
          title="Delete (⌘Z to undo)"
          className="hover:text-red-600"
          onClick={() => update((s) => void (s.entries = s.entries.filter((e) => e.id !== entry.id)))}
        >
          <Trash2 size={15} />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={open ? 'Collapse entry' : 'Expand entry'} onClick={onToggleOpen}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Button>
      </div>

      {open && (
        <div className="flex flex-col gap-4 px-5 pt-3 pb-5">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {f.title && (
              <Field label={f.title} className={section.type === 'skills' ? 'col-span-2' : undefined}>
                <Input value={entry.title} onChange={(e) => set('title', e.target.value)} />
              </Field>
            )}
            {f.subtitle && (
              <Field label={f.subtitle}>
                <Input value={entry.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
              </Field>
            )}
            {f.location && (
              <Field label={f.location}>
                <Input value={entry.location} onChange={(e) => set('location', e.target.value)} />
              </Field>
            )}
            {f.link && (
              <Field label={f.link}>
                <Input value={entry.link} placeholder="https://" onChange={(e) => set('link', e.target.value)} />
              </Field>
            )}
            {f.dates && (
              <Field label={cfg.singleDate ? f.dates : 'Start'}>
                <Input type="month" value={entry.start} onChange={(e) => set('start', e.target.value)} />
              </Field>
            )}
            {f.dates && !cfg.singleDate && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[13px] font-medium text-zinc-700">
                  End
                  <label className="flex items-center gap-1.5 font-normal">
                    <input type="checkbox" className="h-[14px] w-[14px]" checked={entry.current} onChange={(e) => set('current', e.target.checked)} />
                    Present
                  </label>
                </div>
                {entry.current ? (
                  <div className="flex h-[38px] items-center rounded-[9px] border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500">Present</div>
                ) : (
                  <Input type="month" aria-label="End" value={entry.end} onChange={(e) => set('end', e.target.value)} />
                )}
              </div>
            )}
          </div>
          {f.meta && (
            <Field label={f.meta}>
              <Input value={entry.meta} onChange={(e) => set('meta', e.target.value)} />
            </Field>
          )}
          {f.description && (
            <Field label={f.description}>
              <Input value={entry.description} onChange={(e) => set('description', e.target.value)} />
            </Field>
          )}
          {f.items && <ItemsInput items={entry.items} onChange={(items) => set('items', items)} />}
          {f.bullets && <BulletList bullets={entry.bullets} onChange={(bullets) => set('bullets', bullets)} />}
        </div>
      )}
    </div>
  );
}

function ItemsInput({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length) onChange([...items, ...parts]);
    setDraft('');
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-zinc-700">Skills</span>
      <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-[9px] border border-zinc-200 bg-white p-1.5 shadow-xs focus-within:border-accent-500 focus-within:ring-3 focus-within:ring-accent-500/15">
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className="group inline-flex items-center gap-0.5 rounded-md bg-accent-100 py-0.5 pr-1 pl-2 text-[13px] font-medium text-accent-700">
            <button type="button" className="hidden text-accent-400 group-hover:inline" aria-label={`Move ${item} left`} onClick={() => move(i, -1)}>
              ‹
            </button>
            {item}
            <button type="button" className="hidden text-accent-400 group-hover:inline" aria-label={`Move ${item} right`} onClick={() => move(i, 1)}>
              ›
            </button>
            <button type="button" aria-label={`Remove ${item}`} className="rounded p-0.5 hover:bg-accent-200" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          aria-label="Add skill"
          value={draft}
          placeholder={items.length ? 'Add more…' : 'Type a skill and press Enter (commas work too)'}
          onChange={(e) => (e.target.value.includes(',') ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && !draft && items.length) {
              onChange(items.slice(0, -1));
            }
          }}
          onBlur={() => draft && add(draft)}
          className="min-w-40 flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-zinc-400"
        />
      </div>
    </div>
  );
}
