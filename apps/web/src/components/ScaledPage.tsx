import type { Design, Resume } from '@rc/core';
import { ResumeDocument, pageMetrics, type FitResult } from '@rc/core/render';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cn } from './ui';

interface ScaledPageProps {
  resume: Pick<Resume, 'sections'>;
  design: Design;
  /** Fixed scale; when omitted the page scales to the container width. */
  scale?: number;
  /** Crop to exactly one page (thumbnails). */
  clip?: boolean;
  showPageEnd?: boolean;
  selectedSectionId?: string | null;
  onSectionClick?: (id: string) => void;
  onFit?: (fit: FitResult) => void;
  className?: string;
  style?: CSSProperties;
  links?: boolean;
}

/** A resume page drawn at real size and scaled with a CSS transform, so layout (and fit) is unaffected by zoom. */
export function ScaledPage({ resume, design, scale, clip, showPageEnd, selectedSectionId, onSectionClick, onFit, className, style, links = false }: ScaledPageProps) {
  const holder = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const metrics = pageMetrics(design);
  const [autoScale, setAutoScale] = useState(0.4);
  const [contentHeight, setContentHeight] = useState(metrics.heightPx);
  const k = scale ?? autoScale;

  useEffect(() => {
    if (scale !== undefined || !holder.current) return;
    const el = holder.current;
    const ro = new ResizeObserver(() => setAutoScale(el.clientWidth / metrics.widthPx));
    ro.observe(el);
    return () => ro.disconnect();
  }, [scale, metrics.widthPx]);

  useEffect(() => {
    if (!inner.current) return;
    const el = inner.current;
    const ro = new ResizeObserver(() => setContentHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const height = (clip ? metrics.heightPx : Math.max(metrics.heightPx, contentHeight)) * k;

  return (
    <div
      ref={holder}
      className={cn('relative', clip && 'overflow-hidden', className)}
      style={{ width: scale !== undefined ? metrics.widthPx * k : '100%', height, ...style }}
    >
      <div ref={inner} style={{ transform: `scale(${k})`, transformOrigin: '0 0', width: metrics.widthPx, position: 'absolute', top: 0, left: 0 }}>
        <ResumeDocument resume={resume} design={design} selectedSectionId={selectedSectionId} onSectionClick={onSectionClick} onFit={onFit} links={links} />
      </div>
      {showPageEnd && contentHeight > metrics.heightPx + 1 && (
        <div className="pointer-events-none absolute right-0 left-0 border-t-2 border-dashed border-red-500" style={{ top: metrics.heightPx * k }}>
          <span className="absolute -top-5 right-1 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white">End of page 1</span>
        </div>
      )}
    </div>
  );
}
