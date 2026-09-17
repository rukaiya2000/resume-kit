import { format, isValid, parseISO } from 'date-fns';
import { useRef } from 'react';
import type { Basics, CoverLetter, Design } from '../schema';
import { DocumentHeader } from './ResumeDocument';
import { renderInline } from './inline';
import { PageFrame, contentStyle, s, useFitScale, type FitResult } from './page';

export interface CoverLetterDocumentProps {
  letter: Pick<CoverLetter, 'date' | 'recipient' | 'greeting' | 'paragraphs' | 'closing' | 'signature'>;
  /** Header of the resume the letter belongs to. */
  basics: Basics | undefined;
  /** The resume's resolved design (template + overrides), so the letter matches. */
  design: Design;
  mode?: 'screen' | 'print';
  onFit?: (result: FitResult) => void;
  links?: boolean;
}

export function CoverLetterDocument({ letter, basics, design, mode = 'screen', onFit, links = mode === 'print' }: CoverLetterDocumentProps) {
  // Same look as the resume, but a short letter should never be blown up to fill the page: only shrink to fit.
  const d: Design = { ...design, fit: { ...design.fit, maxScale: Math.min(1, design.fit.maxScale) } };
  const contentRef = useRef<HTMLDivElement>(null);
  const scale = useFitScale(contentRef, d, JSON.stringify([letter, basics, d]), onFit);
  const date = parseISO(letter.date);
  const recipient = [letter.recipient.name, letter.recipient.title, letter.recipient.company, letter.recipient.address].filter((l) => l.trim());
  const gap = s(d.spacing.section + 2);
  // Letters read better with a little more body text than a dense resume.
  const body = s(d.font.base + 0.5);

  return (
    <PageFrame design={d} mode={mode}>
      <div ref={contentRef} style={contentStyle(d, scale)} data-letter-content>
        {basics && <DocumentHeader basics={basics} design={d} links={links} />}
        <div style={{ marginTop: s(d.spacing.header + d.spacing.section + 6), fontSize: body, display: 'flex', flexDirection: 'column', gap }}>
          <div>{isValid(date) ? format(date, 'MMMM d, yyyy') : letter.date}</div>
          {recipient.length > 0 && (
            <div>
              {recipient.map((line, i) => (
                <div key={i} style={{ whiteSpace: 'pre-line' }}>
                  {line}
                </div>
              ))}
            </div>
          )}
          {letter.greeting && <div>{letter.greeting}</div>}
          {letter.paragraphs
            .filter((p) => p.trim())
            .map((p, i) => (
              <p key={i} style={{ margin: 0, whiteSpace: 'pre-line' }}>
                {renderInline(p, d.colors.accent, links)}
              </p>
            ))}
          <div>
            <div>{letter.closing}</div>
            <div style={{ marginTop: s(d.spacing.section * 1.5), fontWeight: 600 }}>{letter.signature}</div>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
