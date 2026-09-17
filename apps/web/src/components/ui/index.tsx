import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as Menu from '@radix-ui/react-dropdown-menu';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

export const cn = clsx;

// ---------- Button ----------

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dashed';
type Size = 'md' | 'sm' | 'icon' | 'icon-sm';

const variants: Record<Variant, string> = {
  primary:
    'bg-accent-500 text-white border-accent-500 shadow-[0_1px_2px_rgba(109,74,255,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-accent-600 hover:border-accent-600',
  secondary: 'bg-white text-zinc-900 border-zinc-200 shadow-xs hover:bg-zinc-50',
  ghost: 'bg-transparent border-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
  danger: 'bg-red-500 text-white border-red-500 hover:bg-red-600',
  dashed: 'bg-transparent border-dashed border-zinc-300 text-accent-600 hover:bg-accent-50',
};
const sizes: Record<Size, string> = {
  md: 'h-9 px-3 text-sm gap-1.5 rounded-[9px]',
  sm: 'h-[30px] px-2.5 text-[13px] gap-1.5 rounded-lg',
  icon: 'h-9 w-9 justify-center rounded-[9px]',
  'icon-sm': 'h-[30px] w-[30px] justify-center rounded-lg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center border font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-accent-500/25 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});

// ---------- Inputs ----------

export const inputClass =
  'w-full rounded-[9px] border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-xs outline-none placeholder:text-zinc-400 focus:border-accent-500 focus:ring-3 focus:ring-accent-500/15';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputClass, 'h-[38px]', className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(inputClass, 'min-h-24 py-2 leading-relaxed', className)} {...props} />;
});

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1.5 text-[13px] font-medium text-zinc-700', className)}>
      <span className="flex gap-1.5">
        {label}
        {hint && <span className="font-normal text-zinc-500">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputClass, 'h-[30px] cursor-pointer pr-7 text-[13px]', className)} {...props} />;
}

// ---------- Switch ----------

export function Switch({ checked, onCheckedChange, label }: { checked: boolean; onCheckedChange: (v: boolean) => void; label: string }) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className="relative h-[18px] w-8 shrink-0 cursor-pointer rounded-full bg-zinc-300 transition-colors data-[state=checked]:bg-accent-500"
    >
      <SwitchPrimitive.Thumb className="block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-4" />
    </SwitchPrimitive.Root>
  );
}

// ---------- Segmented ----------

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  size?: 'md' | 'sm';
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex gap-0.5 bg-zinc-100 p-0.5', size === 'md' ? 'rounded-[10px]' : 'rounded-lg')}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'font-medium transition-colors',
            size === 'md' ? 'rounded-lg px-4 py-1.5 text-sm' : 'rounded-md px-2.5 py-1 text-[13px]',
            value === o.value ? 'bg-white text-zinc-900 shadow-[0_1px_2px_rgba(16,16,24,0.08)]' : 'text-zinc-500 hover:text-zinc-800',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Pill ----------

const pillTones = {
  neutral: 'bg-zinc-100 text-zinc-600',
  ok: 'bg-emerald-50 text-emerald-700',
  bad: 'bg-red-50 text-red-600',
  warn: 'bg-amber-50 text-amber-700',
  accent: 'bg-accent-100 text-accent-600',
  solid: 'bg-accent-500 text-white',
};
export function Pill({ tone = 'neutral', children, className }: { tone?: keyof typeof pillTones; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', pillTones[tone], className)}>
      {children}
    </span>
  );
}

// ---------- Dropdown menu ----------

export const DropdownMenu = Menu.Root;
export const DropdownTrigger = Menu.Trigger;

export function DropdownContent({ children, align = 'end', className }: { children: ReactNode; align?: 'start' | 'end' | 'center'; className?: string }) {
  return (
    <Menu.Portal>
      <Menu.Content
        align={align}
        sideOffset={6}
        className={cn('z-50 min-w-52 rounded-xl border border-zinc-100 bg-white p-1.5 shadow-pop', className)}
      >
        {children}
      </Menu.Content>
    </Menu.Portal>
  );
}

export function DropdownItem({
  children,
  onSelect,
  danger,
  disabled,
  shortcut,
  icon,
}: {
  children: ReactNode;
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
  icon?: ReactNode;
}) {
  return (
    <Menu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none select-none data-[disabled]:cursor-default data-[disabled]:opacity-40 data-[highlighted]:bg-zinc-100',
        danger ? 'text-red-600' : 'text-zinc-800',
      )}
    >
      {icon && <span className={cn('flex', danger ? 'text-red-500' : 'text-zinc-500')}>{icon}</span>}
      <span className="flex-1">{children}</span>
      {shortcut && <span className="font-mono text-[11px] text-zinc-500">{shortcut}</span>}
    </Menu.Item>
  );
}

export const DropdownSeparator = () => <Menu.Separator className="my-1 h-px bg-zinc-100" />;
export const DropdownLabel = ({ children }: { children: ReactNode }) => (
  <Menu.Label className="px-2.5 py-1 text-[11px] font-medium tracking-wide text-zinc-500 uppercase">{children}</Menu.Label>
);

// ---------- Dialog ----------

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-zinc-900/35 backdrop-blur-[4px]" />
        <DialogPrimitive.Content
          style={{ width }}
          className="fixed top-[14vh] left-1/2 z-50 max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-hidden rounded-[18px] bg-white shadow-[0_1px_2px_rgba(16,16,24,0.06),0_32px_80px_-16px_rgba(16,16,24,0.35)] outline-none"
        >
          <div className="flex items-start gap-3.5 px-6 pt-6 pb-1.5">
            {icon && <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-500">{icon}</span>}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-sm text-zinc-500">{description}</DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close">
                <X size={17} />
              </Button>
            </DialogPrimitive.Close>
          </div>
          {children && <div className="flex flex-col gap-4 px-6 py-4">{children}</div>}
          {footer && <div className="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50 px-6 py-3.5">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
