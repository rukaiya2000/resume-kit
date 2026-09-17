import * as Accordion from '@radix-ui/react-accordion';
import { ChevronRight, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../components/ui';
import { useDesign } from './useDesign';

export function Group({ value, title, summary, children, badge }: { value: string; title: string; summary?: ReactNode; children: ReactNode; badge?: ReactNode }) {
  return (
    <Accordion.Item value={value} className="border-b border-zinc-100 last:border-b-0">
      <Accordion.Header>
        <Accordion.Trigger className="group flex w-full items-center gap-2 py-3.5 text-left text-sm font-semibold outline-none">
          <ChevronRight size={15} className="text-zinc-400 transition-transform group-data-[state=open]:rotate-90" />
          {title}
          {badge}
          <span className="ml-auto truncate pl-2 text-xs font-normal text-zinc-500 group-data-[state=open]:hidden">{summary}</span>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="flex flex-col gap-3 pb-4">{children}</Accordion.Content>
    </Accordion.Item>
  );
}

/** A labelled control row with a reset dot when the value is overridden on this resume. */
export function Row({ label, path, children }: { label: string; path?: string[]; children: ReactNode }) {
  const { overridden, reset } = useDesign();
  const isOver = path ? overridden(path) : false;
  return (
    <div className="flex min-h-[30px] items-center justify-between gap-3 text-[13px] text-zinc-700">
      <span className="flex items-center gap-1.5">
        {label}
        {isOver && (
          <button type="button" title="Overridden on this resume. Click to reset to template." onClick={() => reset(path)} className="group flex items-center">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 group-hover:hidden" />
            <RotateCcw size={12} className="hidden text-amber-600 group-hover:block" />
          </button>
        )}
      </span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

export function NumberInput({
  value,
  onChange,
  unit,
  step = 0.1,
  min,
  max,
  label,
  width = 72,
}: {
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  label: string;
  width?: number;
}) {
  return (
    <label
      style={{ width }}
      className="flex h-[30px] items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 focus-within:border-accent-500 focus-within:ring-3 focus-within:ring-accent-500/15"
    >
      {unit && unit.length === 1 && <span className="text-[11px] text-zinc-500">{unit}</span>}
      <input
        type="number"
        aria-label={label}
        value={Number.isFinite(value) ? Number(value.toFixed(3)) : ''}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(clamp(v, min, max));
        }}
        className="w-full min-w-0 bg-transparent text-[13px] font-medium tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      {unit && unit.length > 1 && <span className="text-[11px] text-zinc-500">{unit}</span>}
    </label>
  );
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step,
  label,
  format = (v) => String(v),
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  label: string;
  format?: (v: number) => string;
}) {
  return (
    <>
      <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-36" />
      <span className="w-10 text-right font-mono text-xs tabular-nums">{format(value)}</span>
    </>
  );
}

export function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="flex h-[30px] items-center gap-2 rounded-lg border border-zinc-200 bg-white pr-2 pl-1">
      <input type="color" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="h-6 w-6 cursor-pointer rounded-md border-0 bg-transparent p-0" />
      <span className="w-16 font-mono text-xs uppercase">{value}</span>
    </label>
  );
}

export function Toggle({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: ReactNode }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-0.5 rounded-lg bg-zinc-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'min-w-8 rounded-md px-2.5 py-1 text-[13px] transition-colors',
            o.value === value ? 'bg-white font-medium text-zinc-900 shadow-[0_1px_2px_rgba(16,16,24,0.08)]' : 'text-zinc-500 hover:text-zinc-800',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const clamp = (v: number, min?: number, max?: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));

export { Accordion };
