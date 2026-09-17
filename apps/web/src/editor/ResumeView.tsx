import { pageMetrics } from '@rc/core/render';
import { Maximize, Minus, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ScaledPage } from '../components/ScaledPage';
import { Button } from '../components/ui';
import { DesignPanel } from './DesignPanel';
import { FitBadge } from './FitBadge';
import { useEditor } from './store';
import { useDesign } from './useDesign';

export function ResumeView() {
  const resume = useEditor((s) => s.resume)!;
  const selected = useEditor((s) => s.selectedSectionId);
  const { design } = useDesign();
  const canvas = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number | 'fit'>('fit');
  const [fitZoom, setFitZoom] = useState(0.72);

  const widthPx = design ? pageMetrics(design).widthPx : 816;
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFitZoom(Math.min(1, Math.max(0.3, (el.clientWidth - 96) / widthPx))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [widthPx]);

  if (!design) return null;
  const k = zoom === 'fit' ? fitZoom : zoom;
  const step = (dir: 1 | -1) => setZoom(Math.min(2, Math.max(0.3, Math.round((k + dir * 0.1) * 10) / 10)));

  return (
    <>
      <main ref={canvas} className="dot-grid relative flex min-w-0 flex-1 flex-col overflow-auto">
        <div className="sticky top-0 z-10 flex justify-center pt-4 pb-2">
          <FitBadge floating />
        </div>
        <div className="flex justify-center px-12 pt-2 pb-24">
          <div className="rounded-[4px] bg-white shadow-page">
            <ScaledPage
              resume={resume}
              design={design}
              scale={k}
              showPageEnd
              selectedSectionId={selected}
              onSectionClick={(id) => useEditor.getState().select(id)}
              onFit={(fit) => useEditor.getState().setFit(fit)}
            />
          </div>
        </div>
        <div className="sticky bottom-5 z-10 mx-auto flex w-fit items-center gap-1 rounded-xl bg-white p-1 shadow-[0_1px_2px_rgba(16,16,24,0.06),0_8px_24px_rgba(16,16,24,0.12)]">
          <Button variant="ghost" size="icon-sm" aria-label="Zoom out" onClick={() => step(-1)}>
            <Minus size={16} />
          </Button>
          <span className="w-12 text-center font-mono text-[13px] tabular-nums">{Math.round(k * 100)}%</span>
          <Button variant="ghost" size="icon-sm" aria-label="Zoom in" onClick={() => step(1)}>
            <Plus size={16} />
          </Button>
          <div className="h-[18px] w-px bg-zinc-100" />
          <Button variant="ghost" size="sm" onClick={() => setZoom('fit')} disabled={zoom === 'fit'}>
            <Maximize size={15} /> Fit
          </Button>
        </div>
      </main>
      <DesignPanel />
    </>
  );
}
