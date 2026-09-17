import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { formatRange } from '../dates';
import { FONT_OPTIONS, PAGE_SIZES_IN, PX_PER_IN } from '../design';
import type { Basics, Design, Entry, Resume, Section } from '../schema';
import { SECTION_CONFIG } from '../sectionTypes';
import { renderInline, safeUrl } from './inline';

export interface FitResult {
  scale: number;
  pages: number;
  overflowPx: number;
  /** Approximate number of body lines to remove to fit one page (0 when it fits). */
  overflowLines: number;
  fits: boolean;
}

export interface ResumeDocumentProps {
  resume: Pick<Resume, 'sections'>;
  design: Design;
  mode?: 'screen' | 'print';
  selectedSectionId?: string | null;
  onSectionClick?: (sectionId: string) => void;
  onFit?: (result: FitResult) => void;
  /** Render clickable links (PDF, web view). Off in editor previews and thumbnails. Defaults to true in print mode. */
  links?: boolean;
}

/** Size scaled by the fit factor. */
const s = (pt: number) => `calc(${pt}pt * var(--fit))`;

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

export function ResumeDocument({ resume, design, mode = 'screen', selectedSectionId, onSectionClick, onFit, links = mode === 'print' }: ResumeDocumentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const metrics = pageMetrics(design);
  const layoutKey = JSON.stringify([resume.sections, design]);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      const result = computeFit(el, design, metrics.contentHeightPx);
      setScale(result.scale);
      onFit?.(result);
    };
    run();
    // Re-fit once web fonts finish loading (metrics change).
    document.fonts?.ready.then(run);
    const onFonts = () => run();
    document.fonts?.addEventListener?.('loadingdone', onFonts);
    return () => {
      cancelled = true;
      document.fonts?.removeEventListener?.('loadingdone', onFonts);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);

  const d = design;
  const rootStyle = {
    '--fit': String(scale),
    width: `${metrics.contentWidthIn}in`,
    fontFamily: fontStack(d.font.family),
    fontSize: s(d.font.base),
    lineHeight: d.spacing.lineHeight,
    letterSpacing: `${d.spacing.letterSpacing}em`,
    color: d.colors.text,
    overflowWrap: 'anywhere',
    WebkitFontSmoothing: 'antialiased',
  } as CSSProperties;

  const visibleSections = resume.sections.filter((sec) => sec.visible && sec.type !== 'basics' && hasContent(sec));
  const basics = resume.sections.find((sec) => sec.type === 'basics');

  const content = (
    <div ref={contentRef} style={rootStyle} data-resume-content>
      {basics?.basics && basics.visible !== false && (
        <SectionFrame section={basics} selected={selectedSectionId === basics.id} onClick={onSectionClick} style={{}}>
          <Header basics={basics.basics} design={d} links={links} />
        </SectionFrame>
      )}
      {visibleSections.map((section, i) => {
        const o = d.sectionOverrides[section.type] ?? {};
        const pad = d.spacing.sectionPadding + (o.paddingY ?? 0);
        const style: CSSProperties = {
          marginTop: s(o.marginTop ?? (i === 0 ? d.spacing.header + 2 : d.spacing.section)),
          paddingTop: s(pad),
          paddingBottom: s(pad),
        };
        return (
          <SectionFrame key={section.id} section={section} selected={selectedSectionId === section.id} onClick={onSectionClick} style={style}>
            <SectionBody section={section} design={d} links={links} />
          </SectionFrame>
        );
      })}
    </div>
  );

  if (mode === 'print') {
    const m = d.page.margin;
    return (
      <>
        <style>{`@page { size: ${metrics.widthIn}in ${metrics.heightIn}in; margin: ${m.top}in ${m.right}in ${m.bottom}in ${m.left}in; } html, body { margin: 0; background: #fff; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`}</style>
        {content}
      </>
    );
  }

  const m = d.page.margin;
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
      {content}
    </div>
  );
}

function computeFit(el: HTMLElement, design: Design, availPx: number): FitResult {
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

function hasContent(section: Section) {
  if (section.layout === 'paragraph') return section.paragraph.trim().length > 0;
  return section.entries.some((e) => e.visible);
}

function SectionFrame({
  section,
  selected,
  onClick,
  style,
  children,
}: {
  section: Section;
  selected: boolean;
  onClick?: (id: string) => void;
  style: CSSProperties;
  children: ReactNode;
}) {
  return (
    <section
      data-section-id={section.id}
      onClick={onClick ? () => onClick(section.id) : undefined}
      style={{
        ...style,
        cursor: onClick ? 'pointer' : undefined,
        outline: selected ? '2px solid #6d4aff' : undefined,
        outlineOffset: selected ? 4 : undefined,
        borderRadius: selected ? 2 : undefined,
      }}
    >
      {children}
    </section>
  );
}

function Header({ basics, design: d, links }: { basics: Basics; design: Design; links: boolean }) {
  const sep = ` ${d.header.separator} `;
  const items: ReactNode[] = [];
  if (basics.email)
    items.push(
      links ? (
        <a key="email" href={`mailto:${basics.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{basics.email}</a>
      ) : (
        <span key="email">{basics.email}</span>
      ),
    );
  if (basics.phone) items.push(<span key="phone">{basics.phone}</span>);
  if (basics.location) items.push(<span key="loc">{basics.location}</span>);
  if (basics.workAuth) items.push(<span key="auth">{basics.workAuth}</span>);
  for (const link of basics.links) {
    if (!link.label && !link.url) continue;
    const href = links ? safeUrl(link.url) : null;
    items.push(
      href ? (
        <a key={link.id} href={href} style={{ color: 'inherit', textDecoration: 'none' }}>{link.label || link.url}</a>
      ) : (
        <span key={link.id}>{link.label || link.url}</span>
      ),
    );
  }
  return (
    <header
      style={{
        textAlign: d.header.align,
        paddingBottom: d.header.divider ? s(d.spacing.header) : 0,
        borderBottom: d.header.divider ? `${d.sectionTitle.border.width}pt solid ${d.colors.divider}` : undefined,
      }}
    >
      <div
        style={{
          fontSize: s(d.font.name),
          fontWeight: 700,
          lineHeight: 1.15,
          color: d.colors.accent,
          textTransform: d.header.nameCase === 'upper' ? 'uppercase' : 'none',
          letterSpacing: d.header.nameCase === 'upper' ? '0.04em' : undefined,
        }}
      >
        {basics.name || 'Your Name'}
      </div>
      {basics.headline && <div style={{ fontSize: s(d.font.headline), marginTop: s(2), color: d.colors.muted }}>{basics.headline}</div>}
      {items.length > 0 && (
        <div style={{ fontSize: s(d.font.meta), marginTop: s(d.spacing.header * 0.6), color: d.colors.muted }}>
          {items.map((item, i) => (
            <span key={i}>
              {i > 0 && sep}
              {item}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}

function SectionBody({ section, design: d, links }: { section: Section; design: Design; links: boolean }) {
  const o = d.sectionOverrides[section.type] ?? {};
  const t = d.sectionTitle;
  const titleStyle: CSSProperties = {
    margin: 0,
    fontSize: s(d.font.sectionTitle),
    fontWeight: t.bold ? 700 : 500,
    textTransform: t.case === 'upper' ? 'uppercase' : 'none',
    letterSpacing: t.case === 'upper' ? '0.06em' : undefined,
    color: o.titleColor ?? (t.color === 'accent' ? d.colors.accent : d.colors.text),
    borderBottom: t.border.enabled && !o.hideTitleBorder ? `${t.border.width}pt ${t.border.style} ${d.colors.divider}` : undefined,
    paddingBottom: t.border.enabled ? s(t.border.gap) : 0,
    marginBottom: s(4),
    lineHeight: 1.2,
  };
  const visibleEntries = section.entries.filter((e) => e.visible);
  return (
    <>
      <h2 style={titleStyle}>{section.title}</h2>
      {section.layout === 'paragraph' ? (
        <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{renderInline(section.paragraph, d.colors.accent, links)}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: s(section.type === 'skills' || section.type === 'awards' ? d.spacing.bullet + 1 : d.spacing.entry) }}>
          {visibleEntries.map((entry) => (
            <EntryBlock key={entry.id} entry={entry} section={section} design={d} links={links} />
          ))}
        </div>
      )}
    </>
  );
}

function Row({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1em' }}>
      <div style={{ minWidth: 0 }}>{left}</div>
      {right ? <div style={{ flexShrink: 0, textAlign: 'right', whiteSpace: 'nowrap' }}>{right}</div> : null}
    </div>
  );
}

function EntryBlock({ entry, section, design: d, links }: { entry: Entry; section: Section; design: Design; links: boolean }) {
  const cfg = SECTION_CONFIG[section.type];
  const dates = cfg.fields.dates ? formatRange(entry, d.entry.dateFormat, cfg.singleDate) : '';
  const metaStyle: CSSProperties = { fontSize: s(d.font.meta) };
  const titleStyle: CSSProperties = { fontWeight: d.entry.titleBold ? 700 : 500 };
  const subStyle: CSSProperties = { fontStyle: d.entry.subtitleItalic ? 'italic' : 'normal' };
  const href = links ? safeUrl(entry.link) : null;
  const title = href ? (
    <a href={href} style={{ color: 'inherit', textDecoration: 'none' }}>{entry.title}</a>
  ) : (
    entry.title
  );

  if (section.type === 'skills') {
    return (
      <div>
        {entry.title && <span style={titleStyle}>{entry.title}: </span>}
        {entry.items.filter(Boolean).join(d.entry.skillSeparator)}
      </div>
    );
  }

  if (cfg.compact && d.entry.awardDescription === 'below') {
    return (
      <div>
        <Row
          left={
            <span>
              <span style={titleStyle}>{title}</span>
              {entry.subtitle && <span>, {entry.subtitle}</span>}
            </span>
          }
          right={dates && <span style={metaStyle}>{dates}</span>}
        />
        {entry.description && <div>{renderInline(entry.description, d.colors.accent, links)}</div>}
      </div>
    );
  }

  if (cfg.compact) {
    return (
      <Row
        left={
          <span>
            <span style={titleStyle}>{title}</span>
            {entry.subtitle && <span>, {entry.subtitle}</span>}
            {entry.description && <span> — {renderInline(entry.description, d.colors.accent, links)}</span>}
          </span>
        }
        right={dates && <span style={metaStyle}>{dates}</span>}
      />
    );
  }

  const datesRight = d.entry.datePosition === 'right';
  const firstLeft = (
    <span>
      <span style={titleStyle}>{title}</span>
      {cfg.inlineSubtitle && entry.subtitle && (
        <span>
          {' | '}
          <span style={subStyle}>{entry.subtitle}</span>
        </span>
      )}
    </span>
  );
  const secondLeft = !cfg.inlineSubtitle && entry.subtitle ? <span style={subStyle}>{entry.subtitle}</span> : null;
  const firstRight = datesRight ? dates : entry.location;
  const secondRight = datesRight ? entry.location : '';

  return (
    <div>
      <Row left={firstLeft} right={firstRight && <span style={metaStyle}>{firstRight}</span>} />
      {(secondLeft || secondRight) && <Row left={secondLeft} right={secondRight && <span style={metaStyle}>{secondRight}</span>} />}
      {!datesRight && dates && <div style={{ ...metaStyle, color: d.colors.muted }}>{dates}</div>}
      {entry.meta && <div style={{ ...metaStyle, color: d.colors.muted }}>{renderInline(entry.meta, d.colors.accent, links)}</div>}
      {entry.description && <div style={{ marginTop: s(1) }}>{renderInline(entry.description, d.colors.accent, links)}</div>}
      {entry.bullets.some((b) => b.trim()) && (
        <ul style={{ listStyle: 'none', margin: `${s(2)} 0 0`, padding: 0, display: 'flex', flexDirection: 'column', gap: s(d.spacing.bullet) }}>
          {entry.bullets
            .filter((b) => b.trim())
            .map((bullet, i) => (
              <li key={i} style={{ display: 'flex' }}>
                <span style={{ width: s(d.spacing.bulletIndent), flexShrink: 0, textAlign: 'center' }}>{d.entry.bullet}</span>
                <span style={{ minWidth: 0 }}>{renderInline(bullet, d.colors.accent, links)}</span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
