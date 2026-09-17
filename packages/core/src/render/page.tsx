import { useLayoutEffect, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { FONT_OPTIONS, PAGE_SIZES_IN, PX_PER_IN } from '../design';
import type { Design } from '../schema';

export interface FitResult {
  scale: number;
  pages: number;
  overflowPx: number;
  /** Approximate number of body lines to remove to fit one page (0 when it fits). */
  overflowLines: number;
  fits: boolean;
}

/** Size scaled by the fit factor. */
export const s = (pt: number) => `calc(${pt}pt * var(--fit))`;

export function pageMetrics(design: Design) {
  const size = PAGE_SIZES_IN[design.page.size];
  const m = design.page.margin;
  return {
    widthIn: size.width,
    heightIn: size.height,
    contentWidthIn: size.width - m.left - m.right,
    contentHeightPx: (size.height - m.top - m.bottom) * PX_PER_IN,
    widthPx: size.width * PX_PER_IN,
    heightPx: size.height * PX_PER_IN,
  };
}

export function fontStack(family: string) {
  const kind = FONT_OPTIONS.find((f) => f.family === family)?.kind ?? 'sans';
  return `'${family}', ${kind === 'serif' ? 'Georgia, serif' : 'system-ui, -apple-system, sans-serif'}`;
}

export function computeFit(el: HTMLElement, design: Design, availPx: number): FitResult {
  const { fit, font, spacing } = design;
  const measure = (value: number) => {
    el.style.setProperty('--fit', String(value));
    return el.offsetHeight;
  };
  const maxS = fit.maxScale;
  const minS = Math.min(maxS, Math.max(fit.minScale, fit.minBaseFont / font.base));

  let scale = 1;
  if (fit.enabled) {
    if (measure(maxS) <= availPx) scale = maxS;
    else if (measure(minS) > availPx) scale = minS;
    else {
      let lo = minS;
      let hi = maxS;
      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2;
        if (measure(mid) <= availPx) lo = mid;
        else hi = mid;
      }
      scale = Math.floor(lo * 1000) / 1000;
    }
  }
  const height = measure(scale);
  const overflowPx = Math.max(0, height - availPx);
  const linePx = font.base * (PX_PER_IN / 72) * spacing.lineHeight * scale;
  return {
    scale,
    pages: Math.max(1, Math.ceil((height - 0.5) / availPx)),
    overflowPx,
    overflowLines: overflowPx > 0.5 ? Math.ceil(overflowPx / linePx) : 0,
    fits: overflowPx <= 0.5,
  };
}

/** Fits `contentRef` to one page (per `design.fit`), re-running when `layoutKey` changes or web fonts load. */
export function useFitScale(contentRef: RefObject<HTMLElement | null>, design: Design, layoutKey: string, onFit?: (result: FitResult) => void) {
  const [scale, setScale] = useState(1);
  const availPx = pageMetrics(design).contentHeightPx;
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const result = computeFit(el, design, availPx);
      setScale(result.scale);
      onFit?.(result);
    };
    run();
    // Re-fit once web fonts finish loading (metrics change).
    document.fonts?.ready.then(run);
    document.fonts?.addEventListener?.('loadingdone', run);
    return () => {
      cancelled = true;
      document.fonts?.removeEventListener?.('loadingdone', run);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);
  return scale;
}

export function contentStyle(design: Design, scale: number): CSSProperties {
  return {
    '--fit': String(scale),
    width: `${pageMetrics(design).contentWidthIn}in`,
    fontFamily: fontStack(design.font.family),
    fontSize: s(design.font.base),
    lineHeight: design.spacing.lineHeight,
    letterSpacing: `${design.spacing.letterSpacing}em`,
    color: design.colors.text,
    overflowWrap: 'anywhere',
    WebkitFontSmoothing: 'antialiased',
  } as CSSProperties;
}

/** The page around the content: real-size sheet on screen, or @page rules for printing/PDF. */
export function PageFrame({ design, mode, children }: { design: Design; mode: 'screen' | 'print'; children: ReactNode }) {
  const metrics = pageMetrics(design);
  const m = design.page.margin;
  if (mode === 'print') {
    return (
      <>
        <style>{`@page { size: ${metrics.widthIn}in ${metrics.heightIn}in; margin: ${m.top}in ${m.right}in ${m.bottom}in ${m.left}in; } html, body { margin: 0; background: #fff; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`}</style>
        {children}
      </>
    );
  }
  return (
    <div
      data-resume-page
      style={{
        width: metrics.widthPx,
        minHeight: metrics.heightPx,
        boxSizing: 'border-box',
        padding: `${m.top}in ${m.right}in ${m.bottom}in ${m.left}in`,
        background: '#fff',
        position: 'relative',
      }}
    >
      {children}
    </div>
  );
}
