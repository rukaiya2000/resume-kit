import type { ReactNode } from 'react';

/**
 * Tiny inline formatter for bullets: **bold**, *italic*, [label](url).
 * Produces React nodes (no HTML injection).
 */
const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;

export function renderInline(text: string, linkColor?: string, links = true): ReactNode[] {
  return text.split(TOKEN).map((part, i) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const href = links ? safeUrl(link[2]) : null;
      return href ? (
        <a key={i} href={href} style={{ color: linkColor ?? 'inherit', textDecoration: 'none' }}>
          {link[1]}
        </a>
      ) : (
        <span key={i}>{link[1]}</span>
      );
    }
    return part;
  });
}

export function safeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return null;
}

/** Strips inline markers, for plain-text displays (e.g. collapsed entry summaries). */
export function plainInline(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}
