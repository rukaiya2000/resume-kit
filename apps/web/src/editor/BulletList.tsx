import { Bold, Italic, Link2, Plus, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { Button, inputClass, cn } from '../components/ui';
import { SortableItem, SortableList } from './sortable';

const LIMIT = 150;

/** Wraps the selected text of an input with markers (or inserts them at the caret). */
function wrapSelection(input: HTMLInputElement, before: string, after: string, placeholder: string) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const selected = input.value.slice(start, end) || placeholder;
  const next = input.value.slice(0, start) + before + selected + after + input.value.slice(end);
  const caret = start + before.length;
  return { next, selStart: caret, selEnd: caret + selected.length };
}

export function BulletList({ bullets, onChange }: { bullets: string[]; onChange: (bullets: string[]) => void }) {
  // Stable keys for drag & drop; bullets themselves are plain strings.
  const keysRef = useRef<string[]>([]);
  while (keysRef.current.length < bullets.length) keysRef.current.push(nanoid(6));
  keysRef.current.length = bullets.length;
  const keys = keysRef.current;

  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const lastFocused = useRef(0);
  const pendingFocus = useRef<{ index: number; caret?: number } | null>(null);

  useEffect(() => {
    const p = pendingFocus.current;
    if (!p) return;
    const el = inputs.current[p.index];
    if (el) {
      el.focus();
      const pos = p.caret ?? el.value.length;
      el.setSelectionRange(pos, pos);
    }
    pendingFocus.current = null;
  });

  const setAt = (i: number, value: string) => onChange(bullets.map((b, j) => (j === i ? value : b)));

  const format = (kind: 'bold' | 'italic' | 'link') => {
    const i = Math.min(lastFocused.current, bullets.length - 1);
    const el = inputs.current[i];
    if (!el) return;
    const [before, after, ph] = kind === 'bold' ? ['**', '**', 'bold text'] : kind === 'italic' ? ['*', '*', 'italic text'] : ['[', '](https://)', 'link text'];
    const { next, selStart, selEnd } = wrapSelection(el, before, after, ph);
    setAt(i, next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && (e.key === 'b' || e.key === 'i' || e.key === 'k')) {
      e.preventDefault();
      lastFocused.current = i;
      format(e.key === 'b' ? 'bold' : e.key === 'i' ? 'italic' : 'link');
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const caret = el.selectionStart ?? el.value.length;
      const head = el.value.slice(0, caret);
      const tail = el.value.slice(caret);
      const next = [...bullets];
      next.splice(i, 1, head, tail);
      keys.splice(i + 1, 0, nanoid(6));
      pendingFocus.current = { index: i + 1, caret: 0 };
      onChange(next);
      return;
    }
    if (e.key === 'Backspace' && el.value === '' && bullets.length > 0) {
      e.preventDefault();
      keys.splice(i, 1);
      pendingFocus.current = i > 0 ? { index: i - 1 } : null;
      onChange(bullets.filter((_, j) => j !== i));
      return;
    }
    if (e.key === 'ArrowUp' && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowDown' && i < bullets.length - 1) inputs.current[i + 1]?.focus();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Bullets</span>
        <div className="flex gap-0.5 rounded-lg bg-zinc-100 p-0.5">
          <FormatButton label="Bold (⌘B)" onClick={() => format('bold')}>
            <Bold size={14} />
          </FormatButton>
          <FormatButton label="Italic (⌘I)" onClick={() => format('italic')}>
            <Italic size={14} />
          </FormatButton>
          <FormatButton label="Link (⌘K)" onClick={() => format('link')}>
            <Link2 size={14} />
          </FormatButton>
        </div>
        <span className="text-xs text-zinc-400">Enter adds a bullet · **bold** · *italic* · [text](url)</span>
      </div>

      <SortableList
        ids={keys}
        onMove={(from, to) => {
          const next = [...bullets];
          const [b] = next.splice(from, 1);
          next.splice(to, 0, b);
          const [k] = keys.splice(from, 1);
          keys.splice(to, 0, k);
          onChange(next);
        }}
      >
        {bullets.map((bullet, i) => (
          <SortableItem key={keys[i]} id={keys[i]}>
            {({ style, handle, ref }) => (
              <div ref={ref} style={style} className="flex items-center gap-2">
                {handle}
                <input
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  aria-label={`Bullet ${i + 1}`}
                  value={bullet}
                  spellCheck
                  placeholder="Action verb + what you did + measurable result"
                  onFocus={() => (lastFocused.current = i)}
                  onChange={(e) => setAt(i, e.target.value)}
                  onKeyDown={(e) => onKeyDown(i, e)}
                  className={cn(inputClass, 'h-[38px] flex-1', bullet.length > LIMIT && 'border-red-300')}
                />
                <span className={cn('w-14 text-right font-mono text-xs tabular-nums', bullet.length > LIMIT ? 'font-semibold text-red-600' : 'text-zinc-500')}>
                  {bullet.length}/{LIMIT}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete bullet ${i + 1}`}
                  onClick={() => {
                    keys.splice(i, 1);
                    onChange(bullets.filter((_, j) => j !== i));
                  }}
                >
                  <X size={15} />
                </Button>
              </div>
            )}
          </SortableItem>
        ))}
      </SortableList>

      <Button
        variant="ghost"
        size="sm"
        className="self-start text-accent-600 hover:text-accent-700"
        onClick={() => {
          keys.push(nanoid(6));
          pendingFocus.current = { index: bullets.length };
          onChange([...bullets, '']);
        }}
      >
        <Plus size={15} /> Add bullet
      </Button>
    </div>
  );
}

function FormatButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      // Keep focus in the bullet so the selection survives.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex h-[26px] w-7 items-center justify-center rounded-md text-zinc-800 hover:bg-white"
    >
      {children}
    </button>
  );
}
