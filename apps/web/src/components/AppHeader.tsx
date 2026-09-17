import { FileText } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { cn } from './ui';

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-accent-500 text-white">
        <FileText size={17} />
      </span>
      <span className="text-base font-semibold tracking-tight">Resume Creator</span>
    </div>
  );
}

export function AppHeader({ children }: { children?: ReactNode }) {
  const tab = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
      isActive ? 'bg-white text-zinc-900 shadow-[0_1px_2px_rgba(16,16,24,0.08)]' : 'text-zinc-500 hover:text-zinc-800',
    );
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-6 border-b border-zinc-100 bg-white/90 px-7 backdrop-blur">
      <Logo />
      <nav className="flex items-center gap-0.5 rounded-[10px] bg-zinc-100 p-[3px]">
        <NavLink to="/" end className={tab}>
          Resumes
        </NavLink>
        <NavLink to="/templates" className={tab}>
          Templates
        </NavLink>
      </nav>
      <div className="flex-1" />
      {children}
    </header>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 p-10 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="text-sm text-zinc-500">{children}</div>}
    </div>
  );
}

export function FullPageMessage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="text-sm text-zinc-500">{children}</div>}
    </div>
  );
}
