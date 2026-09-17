import type { MatchHistoryEntry, MatchReport } from '@rc/core';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ExternalLink, RefreshCw, Target } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button, Dialog, Pill, cn } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { useInvalidate } from '../lib/queries';
import { flushSave } from './autosave';
import { useEditor } from './store';

export function scoreTone(score: number) {
  return score >= 80 ? 'ok' : score >= 60 ? 'warn' : 'bad';
}

/** Top-bar button + dialog showing the job match report of an AI-tailored resume. */
export function MatchButton() {
  const resume = useEditor((s) => s.resume);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const invalidate = useInvalidate();
  if (!resume?.job) return null;
  const match = resume.match;

  const rescore = async () => {
    setBusy(true);
    try {
      await flushSave();
      const updated = await api.rescoreResume(resume.id);
      // The match is server-owned: update it without creating an undo step or a save.
      const temporal = useEditor.temporal.getState();
      temporal.pause();
      useEditor.setState((s) => ({ resume: s.resume ? { ...s.resume, match: updated.match, matchHistory: updated.matchHistory } : s.resume }));
      temporal.resume();
      invalidate.resumes();
      toast.success(`Keyword score: ${updated.match?.keywords.score ?? '—'}/100`);
    } catch (err) {
      toast.error('Re-score failed', { description: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} title="Job match report">
        <Target size={16} />
        Match
        {match && (
          <Pill tone={scoreTone(match.keywords.score)} className="tabular-nums">
            {match.keywords.score}
          </Pill>
        )}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={`${resume.company || 'Job'} · ${resume.job.title}`}
        description={match ? `Scored ${formatDistanceToNow(parseISO(match.scoredAt), { addSuffix: true })}. The keyword part updates with Re-score; the requirement review comes from the last /resume run.` : 'No report yet. Run /resume in Claude Code, or Re-score for keywords only.'}
        icon={<Target size={20} />}
        width={720}
        footer={
          <>
            {resume.job.url && (
              <a href={resume.job.url} target="_blank" rel="noreferrer" className="mr-auto inline-flex h-9 items-center gap-1.5 rounded-[9px] px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100">
                <ExternalLink size={15} /> Job posting
              </a>
            )}
            <Button onClick={rescore} disabled={busy}>
              <RefreshCw size={15} className={cn(busy && 'animate-spin')} /> Re-score
            </Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Done
            </Button>
          </>
        }
      >
        {match ? <MatchBody match={match} history={resume.matchHistory} /> : null}
      </Dialog>
    </>
  );
}

function MatchBody({ match, history }: { match: MatchReport; history: MatchHistoryEntry[] }) {
  const k = match.keywords;
  return (
    <div className="flex max-h-[58vh] flex-col gap-5 overflow-y-auto pr-1 text-sm">
      {history.length > 1 && <History history={history} />}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Keyword score" value={`${k.score}`} suffix="/100" tone={scoreTone(k.score)} />
        <Stat label="Must-have" value={`${k.mustHave.matched}/${k.mustHave.total}`} tone={scoreTone(k.mustHave.total ? (100 * k.mustHave.matched) / k.mustHave.total : 100)} />
        <Stat label="Nice-to-have" value={`${k.niceToHave.matched}/${k.niceToHave.total}`} tone="neutral" />
      </div>

      <Block title="Keywords">
        <Chips label="Matched" items={k.matched} tone="ok" />
        <Chips label="Under another name (reword)" items={k.aliasOnly} tone="warn" />
        <Chips label="Missing · required" items={k.missingRequired} tone="bad" />
        <Chips label="Missing · preferred" items={k.missingPreferred} tone="neutral" />
      </Block>

      {match.requirements.length > 0 && (
        <Block title="Requirements">
          <div className="overflow-hidden rounded-xl border border-zinc-100">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Requirement</th>
                  <th className="px-3 py-2 font-medium">Strength</th>
                  <th className="px-3 py-2 font-medium">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {match.requirements.map((r, i) => (
                  <tr key={i} className="border-t border-zinc-100 align-top">
                    <td className="px-3 py-2">{r.requirement}</td>
                    <td className="px-3 py-2">
                      <Pill tone={r.strength === 'strong' ? 'ok' : r.strength === 'weak' ? 'warn' : 'bad'}>{r.strength}</Pill>
                    </td>
                    <td className="px-3 py-2 text-zinc-600">{r.evidence || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Block>
      )}

      {(match.gaps.real.length > 0 || match.gaps.weak.length > 0) && (
        <Block title="Gaps">
          <List label="Real gaps (not in your notes)" items={match.gaps.real} />
          <List label="Weakly shown" items={match.gaps.weak} />
        </Block>
      )}

      {match.notInDictionary.length > 0 && (
        <Block title="Not in the skills dictionary">
          <Chips label="Couldn't be scored" items={match.notInDictionary} tone="neutral" />
        </Block>
      )}

      {match.pdfCheck && <PdfCheckBlock check={match.pdfCheck} />}

      {match.changes && <ChangesBlock changes={match.changes} />}

      {Object.values(match.improvements).some((v) => v.length) && (
        <Block title="How to improve">
          <List label="Add to your notes" items={match.improvements.addToNotes} />
          <List label="Strengthen" items={match.improvements.strengthen} />
          <List label="Upskill / quick wins" items={match.improvements.upskill} />
          <List label="Application tips" items={match.improvements.applicationTips} />
        </Block>
      )}
    </div>
  );
}

function History({ history }: { history: MatchHistoryEntry[] }) {
  const recent = history.slice(-12);
  const w = 160;
  const h = 36;
  const x = (i: number) => (recent.length === 1 ? w / 2 : (i / (recent.length - 1)) * w);
  const y = (score: number) => h - 3 - (score / 100) * (h - 6);
  const points = recent.map((e, i) => `${x(i)},${y(e.score)}`).join(' ');
  const first = recent[0].score;
  const last = recent.at(-1)!.score;
  return (
    <section className="flex items-center gap-4 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
      <svg width={w} height={h} role="img" aria-label={`Score trend from ${first} to ${last}`} className="shrink-0 overflow-visible">
        <polyline points={points} fill="none" stroke="var(--color-accent-500)" strokeWidth={2} strokeLinejoin="round" />
        {recent.map((e, i) => (
          <circle key={i} cx={x(i)} cy={y(e.score)} r={2.5} fill={e.source === 'ai' ? 'var(--color-accent-500)' : '#fff'} stroke="var(--color-accent-500)" />
        ))}
      </svg>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-zinc-500">Score history ({history.length} runs · filled = /resume, hollow = Re-score)</span>
        <span className="truncate font-medium tabular-nums">
          {recent.map((e) => e.score).join(' → ')}
          <span className={cn('ml-2 text-xs', last >= first ? 'text-emerald-700' : 'text-red-600')}>
            {last >= first ? '+' : ''}
            {last - first}
          </span>
        </span>
      </div>
    </section>
  );
}

function PdfCheckBlock({ check }: { check: NonNullable<MatchReport['pdfCheck']> }) {
  const problems = !check.extractable || check.missingKeywords.length > 0 || check.missingBullets.length > 0;
  return (
    <Block title="PDF text check">
      {!problems ? (
        <p className="text-[13px] text-emerald-700">All text is readable in the PDF ({check.pages} page{check.pages === 1 ? '' : 's'}).</p>
      ) : !check.extractable ? (
        <p className="text-[13px] text-red-600">The PDF has almost no readable text; an ATS may not parse it.</p>
      ) : (
        <>
          <Chips label="Keywords not readable" items={check.missingKeywords} tone="bad" />
          <List label="Bullets not readable" items={check.missingBullets.slice(0, 5)} />
        </>
      )}
    </Block>
  );
}

function ChangesBlock({ changes }: { changes: NonNullable<MatchReport['changes']> }) {
  const kinds = { rewritten: 'Rewritten', added: 'Added', removed: 'Removed' } as const;
  return (
    <Block title={`Changes from Base · ${changes.unchangedBullets} bullet${changes.unchangedBullets === 1 ? '' : 's'} kept as-is`}>
      <Chips label="Skills added" items={changes.skillsAdded} tone="ok" />
      <Chips label="Skills removed" items={changes.skillsRemoved} tone="neutral" />
      <Chips label="Projects added" items={changes.projectsAdded} tone="ok" />
      <Chips label="Projects removed" items={changes.projectsRemoved} tone="neutral" />
      {changes.bullets.length > 0 && (
        <ul className="flex flex-col gap-2">
          {changes.bullets.map((c, i) => (
            <li key={i} className="rounded-lg border border-zinc-100 px-3 py-2 text-[13px]">
              <div className="mb-1 flex items-center gap-2">
                <Pill tone={c.kind === 'removed' ? 'neutral' : c.kind === 'added' ? 'ok' : 'accent'}>{kinds[c.kind]}</Pill>
                <span className="font-medium">{c.entry}</span>
                <span className="text-zinc-500">{c.section}</span>
              </div>
              {c.before && <p className={cn('text-zinc-500', c.after && 'line-through decoration-zinc-300')}>{c.before}</p>}
              {c.after && <p className="text-zinc-900">{c.after}</p>}
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}

function Stat({ label, value, suffix, tone }: { label: string; value: string; suffix?: string; tone: 'ok' | 'warn' | 'bad' | 'neutral' }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={cn('text-2xl font-semibold tabular-nums', tone === 'ok' && 'text-emerald-700', tone === 'warn' && 'text-amber-700', tone === 'bad' && 'text-red-600')}>
        {value}
        {suffix && <span className="text-sm font-normal text-zinc-500">{suffix}</span>}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Chips({ label, items, tone }: { label: string; items: string[]; tone: 'ok' | 'warn' | 'bad' | 'neutral' }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[13px] text-zinc-600">{label}:</span>
      {items.map((i, n) => (
        <Pill key={`${i}-${n}`} tone={tone}>
          {i}
        </Pill>
      ))}
    </div>
  );
}

function List({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="text-[13px] font-medium text-zinc-800">{label}</div>
      <ul className="mt-1 list-disc pl-5 text-[13px] text-zinc-600">
        {items.map((i, n) => (
          <li key={n}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
