import { DEFAULT_DESIGN, FONT_OPTIONS, SECTION_CONFIG, type Design } from '@rc/core';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Dialog, Field, Input, Select, Switch } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { useInvalidate } from '../lib/queries';
import { Accordion, ColorInput, Group, NumberInput, Row, Slider, Toggle } from './controls';
import { flushSave } from './autosave';
import { useEditor } from './store';
import { useDesign } from './useDesign';

export function DesignPanel() {
  const { design, set, mode, overrideCount, reset } = useDesign();
  const selectedId = useEditor((s) => s.selectedSectionId);
  const section = useEditor((s) => s.resume?.sections.find((x) => x.id === selectedId));
  const [open, setOpen] = useState<string[]>(['page', 'font', 'spacing']);

  if (!design) return null;
  const d = design;
  const num = (path: string[]) => (v: number) => set(path, v);

  const sectionType = section && section.type !== 'basics' ? section.type : null;
  const so = sectionType ? d.sectionOverrides[sectionType] ?? {} : {};
  const setSection = (key: string, value: unknown) => {
    if (!sectionType) return;
    const next = { ...so, [key]: value };
    if (value === undefined || value === '') delete (next as Record<string, unknown>)[key];
    set(['sectionOverrides', sectionType], next);
  };

  return (
    <aside className="flex w-[380px] shrink-0 flex-col overflow-y-auto border-l border-zinc-100 bg-white px-5 py-4">
      <div className="flex items-center gap-2">
        <span className="text-[15px] font-semibold">Design</span>
        <div className="flex-1" />
        {mode === 'resume' && overrideCount > 0 && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            {overrideCount} override{overrideCount === 1 ? '' : 's'}
          </span>
        )}
      </div>
      {mode === 'resume' ? (
        <TemplateActions overrideCount={overrideCount} onReset={() => reset()} />
      ) : (
        <p className="border-b border-zinc-100 pt-2 pb-3.5 text-xs text-zinc-500">Changes apply to every resume using this template. Previewing with your Base resume.</p>
      )}

      <Accordion.Root type="multiple" value={open} onValueChange={setOpen}>
        <Group value="page" title="Page" summary={`${d.page.size} · ${d.page.margin.top}" margins`}>
          <Row label="Size" path={['page', 'size']}>
            <Toggle label="Page size" value={d.page.size} onChange={(v) => set(['page', 'size'], v)} options={[{ value: 'Letter', label: 'Letter' }, { value: 'A4', label: 'A4' }]} />
          </Row>
          <Row label="Margins (in)" path={['page', 'margin']}>
            {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
              <NumberInput key={side} label={`${side} margin`} unit={side[0].toUpperCase()} width={58} step={0.05} min={0.2} max={1.5} value={d.page.margin[side]} onChange={num(['page', 'margin', side])} />
            ))}
          </Row>
        </Group>

        <Group value="font" title="Font" summary={`${d.font.family} · ${d.font.base}pt`}>
          <Row label="Family" path={['font', 'family']}>
            <Select aria-label="Font family" className="w-44" value={d.font.family} onChange={(e) => set(['font', 'family'], e.target.value)}>
              {FONT_OPTIONS.map((f) => (
                <option key={f.family} value={f.family}>
                  {f.family} {f.kind === 'serif' ? '(serif)' : ''}
                </option>
              ))}
            </Select>
          </Row>
          <Row label="Body · Name">
            <NumberInput label="Body size" unit="pt" min={7} max={14} value={d.font.base} onChange={num(['font', 'base'])} />
            <NumberInput label="Name size" unit="pt" step={0.5} min={12} max={40} value={d.font.name} onChange={num(['font', 'name'])} />
          </Row>
          <Row label="Titles · Dates">
            <NumberInput label="Section title size" unit="pt" min={8} max={20} value={d.font.sectionTitle} onChange={num(['font', 'sectionTitle'])} />
            <NumberInput label="Date and location size" unit="pt" min={7} max={14} value={d.font.meta} onChange={num(['font', 'meta'])} />
          </Row>
          <Row label="Headline" path={['font', 'headline']}>
            <NumberInput label="Headline size" unit="pt" min={8} max={20} value={d.font.headline} onChange={num(['font', 'headline'])} />
          </Row>
        </Group>

        <Group value="spacing" title="Spacing" summary={`line ${d.spacing.lineHeight}`}>
          <Row label="Line height" path={['spacing', 'lineHeight']}>
            <Slider label="Line height" min={1} max={1.8} step={0.01} value={d.spacing.lineHeight} onChange={num(['spacing', 'lineHeight'])} />
          </Row>
          <Row label="Letter spacing" path={['spacing', 'letterSpacing']}>
            <Slider label="Letter spacing" min={-0.02} max={0.08} step={0.005} value={d.spacing.letterSpacing} onChange={num(['spacing', 'letterSpacing'])} format={(v) => v.toFixed(3)} />
          </Row>
          <Row label="Between sections" path={['spacing', 'section']}>
            <Slider label="Section spacing" min={0} max={30} step={0.5} value={d.spacing.section} onChange={num(['spacing', 'section'])} />
          </Row>
          <Row label="Between entries" path={['spacing', 'entry']}>
            <Slider label="Entry spacing" min={0} max={20} step={0.5} value={d.spacing.entry} onChange={num(['spacing', 'entry'])} />
          </Row>
          <Row label="Between bullets" path={['spacing', 'bullet']}>
            <Slider label="Bullet spacing" min={0} max={8} step={0.25} value={d.spacing.bullet} onChange={num(['spacing', 'bullet'])} />
          </Row>
          <Row label="Section padding" path={['spacing', 'sectionPadding']}>
            <Slider label="Section padding" min={0} max={12} step={0.5} value={d.spacing.sectionPadding} onChange={num(['spacing', 'sectionPadding'])} />
          </Row>
          <Row label="Bullet indent" path={['spacing', 'bulletIndent']}>
            <Slider label="Bullet indent" min={6} max={24} step={0.5} value={d.spacing.bulletIndent} onChange={num(['spacing', 'bulletIndent'])} />
          </Row>
          <Row label="Header spacing" path={['spacing', 'header']}>
            <Slider label="Header spacing" min={0} max={20} step={0.5} value={d.spacing.header} onChange={num(['spacing', 'header'])} />
          </Row>
        </Group>

        <Group
          value="color"
          title="Color"
          summary={
            <span className="inline-flex gap-1">
              {[d.colors.text, d.colors.accent, d.colors.divider].map((c, i) => (
                <span key={i} className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: c }} />
              ))}
            </span>
          }
        >
          {(
            [
              ['text', 'Text'],
              ['accent', 'Accent (name, titles)'],
              ['muted', 'Secondary text'],
              ['divider', 'Dividers'],
            ] as const
          ).map(([key, label]) => (
            <Row key={key} label={label} path={['colors', key]}>
              <ColorInput label={label} value={d.colors[key]} onChange={(v) => set(['colors', key], v)} />
            </Row>
          ))}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {PALETTES.map((p) => (
              <button
                key={p.name}
                type="button"
                title={p.name}
                onClick={() => set(['colors'], { ...d.colors, ...p.colors })}
                className="flex items-center gap-1 rounded-full border border-zinc-200 py-1 pr-2.5 pl-1.5 text-xs hover:bg-zinc-50"
              >
                <span className="h-3.5 w-3.5 rounded-full" style={{ background: p.colors.accent }} />
                {p.name}
              </button>
            ))}
          </div>
        </Group>

        <Group value="header" title="Header" summary={`${d.header.align} · “${d.header.separator}”`}>
          <Row label="Alignment" path={['header', 'align']}>
            <Toggle label="Header alignment" value={d.header.align} onChange={(v) => set(['header', 'align'], v)} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }]} />
          </Row>
          <Row label="Name" path={['header', 'nameCase']}>
            <Toggle label="Name case" value={d.header.nameCase} onChange={(v) => set(['header', 'nameCase'], v)} options={[{ value: 'upper', label: 'UPPER' }, { value: 'normal', label: 'Normal' }]} />
          </Row>
          <Row label="Contact separator" path={['header', 'separator']}>
            <Toggle label="Contact separator" value={d.header.separator} onChange={(v) => set(['header', 'separator'], v)} options={['|', '•', '·'].map((s) => ({ value: s, label: s }))} />
          </Row>
          <Row label="Divider under header" path={['header', 'divider']}>
            <Switch label="Divider under header" checked={d.header.divider} onCheckedChange={(v) => set(['header', 'divider'], v)} />
          </Row>
        </Group>

        <Group value="titles" title="Section titles" summary={`${d.sectionTitle.case === 'upper' ? 'Uppercase' : 'Title case'}${d.sectionTitle.border.enabled ? ' · underline' : ''}`}>
          <Row label="Case" path={['sectionTitle', 'case']}>
            <Toggle label="Title case" value={d.sectionTitle.case} onChange={(v) => set(['sectionTitle', 'case'], v)} options={[{ value: 'upper', label: 'UPPER' }, { value: 'title', label: 'Title' }]} />
          </Row>
          <Row label="Color" path={['sectionTitle', 'color']}>
            <Toggle label="Title color" value={d.sectionTitle.color} onChange={(v) => set(['sectionTitle', 'color'], v)} options={[{ value: 'accent', label: 'Accent' }, { value: 'text', label: 'Text' }]} />
          </Row>
          <Row label="Bold" path={['sectionTitle', 'bold']}>
            <Switch label="Bold titles" checked={d.sectionTitle.bold} onCheckedChange={(v) => set(['sectionTitle', 'bold'], v)} />
          </Row>
          <Row label="Underline" path={['sectionTitle', 'border', 'enabled']}>
            <Switch label="Underline titles" checked={d.sectionTitle.border.enabled} onCheckedChange={(v) => set(['sectionTitle', 'border', 'enabled'], v)} />
          </Row>
          {d.sectionTitle.border.enabled && (
            <>
              <Row label="Line style" path={['sectionTitle', 'border', 'style']}>
                <Toggle label="Underline style" value={d.sectionTitle.border.style} onChange={(v) => set(['sectionTitle', 'border', 'style'], v)} options={[{ value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashed' }, { value: 'dotted', label: 'Dotted' }]} />
              </Row>
              <Row label="Line width · gap" path={['sectionTitle', 'border']}>
                <NumberInput label="Underline width" unit="pt" step={0.25} min={0.25} max={4} value={d.sectionTitle.border.width} onChange={num(['sectionTitle', 'border', 'width'])} />
                <NumberInput label="Underline gap" unit="pt" step={0.5} min={0} max={10} value={d.sectionTitle.border.gap} onChange={num(['sectionTitle', 'border', 'gap'])} />
              </Row>
            </>
          )}
        </Group>

        <Group value="entries" title="Entries" summary={`dates ${d.entry.datePosition} · ${d.entry.bullet}`}>
          <Row label="Dates" path={['entry', 'datePosition']}>
            <Toggle label="Date position" value={d.entry.datePosition} onChange={(v) => set(['entry', 'datePosition'], v)} options={[{ value: 'right', label: 'Right' }, { value: 'below', label: 'Below' }]} />
          </Row>
          <Row label="Date format" path={['entry', 'dateFormat']}>
            <Select aria-label="Date format" className="w-40" value={d.entry.dateFormat} onChange={(e) => set(['entry', 'dateFormat'], e.target.value)}>
              <option value="MMM yyyy">May 2024</option>
              <option value="MMMM yyyy">May 2024 (full month)</option>
              <option value="MM/yyyy">05/2024</option>
              <option value="yyyy">2024</option>
            </Select>
          </Row>
          <Row label="Bullet" path={['entry', 'bullet']}>
            <Toggle label="Bullet symbol" value={d.entry.bullet} onChange={(v) => set(['entry', 'bullet'], v)} options={['•', '–', '▪', '◦'].map((s) => ({ value: s, label: s }))} />
          </Row>
          <Row label="Bold titles" path={['entry', 'titleBold']}>
            <Switch label="Bold entry titles" checked={d.entry.titleBold} onCheckedChange={(v) => set(['entry', 'titleBold'], v)} />
          </Row>
          <Row label="Italic subtitles" path={['entry', 'subtitleItalic']}>
            <Switch label="Italic subtitles" checked={d.entry.subtitleItalic} onCheckedChange={(v) => set(['entry', 'subtitleItalic'], v)} />
          </Row>
        </Group>

        <Group value="fit" title="Fit to one page" summary={d.fit.enabled ? `${Math.round(d.fit.minScale * 100)}–${Math.round(d.fit.maxScale * 100)}%` : 'off'}>
          <Row label="Enabled" path={['fit', 'enabled']}>
            <Switch label="Fit to one page" checked={d.fit.enabled} onCheckedChange={(v) => set(['fit', 'enabled'], v)} />
          </Row>
          <Row label="Smallest scale" path={['fit', 'minScale']}>
            <Slider label="Smallest scale" min={0.6} max={1} step={0.01} value={d.fit.minScale} onChange={num(['fit', 'minScale'])} format={(v) => `${Math.round(v * 100)}%`} />
          </Row>
          <Row label="Largest scale" path={['fit', 'maxScale']}>
            <Slider label="Largest scale" min={1} max={1.4} step={0.01} value={d.fit.maxScale} onChange={num(['fit', 'maxScale'])} format={(v) => `${Math.round(v * 100)}%`} />
          </Row>
          <Row label="Never below (body)" path={['fit', 'minBaseFont']}>
            <NumberInput label="Minimum body font size" unit="pt" step={0.5} min={6} max={12} value={d.fit.minBaseFont} onChange={num(['fit', 'minBaseFont'])} />
          </Row>
        </Group>

        <Group
          value="selected"
          title={sectionType ? `Selected: ${section!.title || SECTION_CONFIG[sectionType].label}` : 'Selected section'}
          summary={sectionType ? (Object.keys(so).length ? 'customized' : 'click to style') : 'click a section on the page'}
        >
          {sectionType ? (
            <>
              <p className="text-xs text-zinc-500">Applies to every “{SECTION_CONFIG[sectionType].label}” section.</p>
              <Row label="Space above (pt)">
                <NumberInput label="Space above" step={0.5} min={0} max={40} value={so.marginTop ?? NaN} onChange={(v) => setSection('marginTop', v)} />
                {so.marginTop !== undefined && <ClearButton onClick={() => setSection('marginTop', undefined)} />}
              </Row>
              <Row label="Extra padding (pt)">
                <NumberInput label="Extra padding" step={0.5} min={0} max={20} value={so.paddingY ?? 0} onChange={(v) => setSection('paddingY', v || undefined)} />
              </Row>
              <Row label="Title color">
                <ColorInput label="Section title color" value={so.titleColor ?? (d.sectionTitle.color === 'accent' ? d.colors.accent : d.colors.text)} onChange={(v) => setSection('titleColor', v)} />
                {so.titleColor && <ClearButton onClick={() => setSection('titleColor', undefined)} />}
              </Row>
              <Row label="Hide title underline">
                <Switch label="Hide title underline" checked={!!so.hideTitleBorder} onCheckedChange={(v) => setSection('hideTitleBorder', v || undefined)} />
              </Row>
            </>
          ) : (
            <p className="text-xs text-zinc-500">Click a section on the page to give it its own spacing or title style.</p>
          )}
        </Group>
      </Accordion.Root>
    </aside>
  );
}

function ClearButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-xs text-zinc-500 underline hover:text-zinc-800">
      clear
    </button>
  );
}

const PALETTES: { name: string; colors: Partial<Design['colors']> }[] = [
  { name: 'Navy', colors: { accent: DEFAULT_DESIGN.colors.accent, text: '#111111', divider: '#333333' } },
  { name: 'Black', colors: { accent: '#111111', text: '#111111', divider: '#111111' } },
  { name: 'Teal', colors: { accent: '#0f5e5c', text: '#111111', divider: '#6b7f7e' } },
  { name: 'Burgundy', colors: { accent: '#7a1f2b', text: '#161616', divider: '#7a1f2b' } },
  { name: 'Slate', colors: { accent: '#334155', text: '#0f172a', divider: '#94a3b8' } },
];

function TemplateActions({ overrideCount, onReset }: { overrideCount: number; onReset: () => void }) {
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [name, setName] = useState('');
  const template = useEditor((s) => s.template)!;
  const invalidate = useInvalidate();
  const { design } = useDesign();

  const saveAs = async () => {
    try {
      const created = await api.createTemplate({ name: name.trim() || 'My template', fromTemplateId: template.id, design });
      const { setTemplate, updateResume } = useEditor.getState();
      setTemplate(created);
      updateResume((r) => {
        r.templateId = created.id;
        r.designOverrides = {};
      });
      invalidate.templates();
      setSaveAsOpen(false);
      toast.success(`Saved template “${created.name}”`, { description: 'This resume now uses it.' });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const updateTemplate = async () => {
    try {
      await flushSave();
      const saved = await api.saveTemplate({ ...template, design: design! });
      const { setTemplate, updateResume } = useEditor.getState();
      setTemplate(saved);
      updateResume((r) => {
        r.designOverrides = {};
      });
      invalidate.templates();
      toast.success(`Updated “${saved.name}”`, { description: 'Every resume using this template gets the change.' });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="flex gap-1.5 border-b border-zinc-100 pt-3 pb-3.5">
      <Button size="sm" onClick={() => setSaveAsOpen(true)}>
        Save as template
      </Button>
      <Button size="sm" onClick={updateTemplate} disabled={overrideCount === 0} title={`Write these overrides into “${template.name}”`}>
        Update template
      </Button>
      <Button size="sm" variant="ghost" onClick={onReset} disabled={overrideCount === 0}>
        Reset
      </Button>
      <Dialog
        open={saveAsOpen}
        onOpenChange={setSaveAsOpen}
        title="Save as template"
        description="Saves this resume’s current design as a new template."
        width={440}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSaveAsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveAs}>
              Save template
            </Button>
          </>
        }
      >
        <Field label="Template name">
          <Input autoFocus value={name} placeholder="e.g. Compact Serif" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveAs()} />
        </Field>
      </Dialog>
    </div>
  );
}
