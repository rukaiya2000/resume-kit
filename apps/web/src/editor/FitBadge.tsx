import { cn } from '../components/ui';
import { useEditor } from './store';
import { useDesign } from './useDesign';

export function FitBadge({ floating }: { floating?: boolean }) {
  const fit = useEditor((s) => s.fit);
  const { design } = useDesign();
  if (!fit || !design) return null;

  let tone: 'ok' | 'neutral' | 'bad' = 'ok';
  let text: string;
  if (!fit.fits) {
    tone = 'bad';
    text = design.fit.enabled
      ? `Doesn't fit at ${Math.round(fit.scale * 100)}% · remove ~${fit.overflowLines} line${fit.overflowLines === 1 ? '' : 's'}`
      : `${fit.pages} pages · ~${fit.overflowLines} line${fit.overflowLines === 1 ? '' : 's'} over`;
  } else if (design.fit.enabled) {
    text = `Fits on 1 page · scaled to ${Math.round(fit.scale * 100)}%`;
  } else {
    tone = 'neutral';
    text = 'Fit off · 1 page';
  }

  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full py-1.5 pr-3.5 pl-2.5 text-[13px] font-medium',
        floating ? 'bg-white shadow-[0_1px_2px_rgba(16,16,24,0.06),0_4px_12px_rgba(16,16,24,0.06)]' : 'bg-white',
        tone === 'ok' && 'text-emerald-700',
        tone === 'neutral' && 'text-zinc-600',
        tone === 'bad' && 'text-red-600 ring-1 ring-red-200',
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', tone === 'ok' && 'bg-emerald-500', tone === 'neutral' && 'bg-zinc-400', tone === 'bad' && 'bg-red-500')} />
      {text}
    </span>
  );
}
