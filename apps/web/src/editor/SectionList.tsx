import { SECTION_CONFIG, newSection, type SectionType } from '@rc/core';
import {
  Award,
  Briefcase,
  Code2,
  Eye,
  EyeOff,
  FolderOpen,
  GraduationCap,
  HeartHandshake,
  LayoutList,
  Plus,
  Sparkles,
  Text,
  User,
  type LucideIcon,
} from 'lucide-react';
import { Button, DropdownContent, DropdownItem, DropdownLabel, DropdownMenu, DropdownSeparator, DropdownTrigger, cn } from '../components/ui';
import { SortableItem, SortableList, arrayMove } from './sortable';
import { useEditor } from './store';

export const SECTION_ICONS: Record<SectionType, LucideIcon> = {
  basics: User,
  summary: Text,
  education: GraduationCap,
  skills: Code2,
  employment: Briefcase,
  projects: FolderOpen,
  awards: Award,
  volunteering: HeartHandshake,
  activities: Sparkles,
  custom: LayoutList,
};

const ADDABLE: SectionType[] = ['summary', 'education', 'skills', 'employment', 'projects', 'awards', 'volunteering', 'activities'];

export function SectionList() {
  const sections = useEditor((s) => s.resume!.sections);
  const selected = useEditor((s) => s.selectedSectionId);
  const { select, updateResume } = useEditor.getState();

  const basics = sections.find((s) => s.type === 'basics');
  const movable = sections.filter((s) => s.type !== 'basics');

  const addSection = (type: SectionType) => {
    const existingHidden = type !== 'custom' ? sections.find((s) => s.type === type && !s.visible) : undefined;
    if (existingHidden) {
      updateResume((r) => {
        r.sections.find((s) => s.id === existingHidden.id)!.visible = true;
      });
      select(existingHidden.id);
      return;
    }
    const section = newSection(type);
    updateResume((r) => {
      r.sections.push(section);
    });
    select(section.id);
  };

  return (
    <aside className="flex w-[264px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-zinc-100 bg-white px-3 py-4">
      <div className="px-2.5 pb-2.5 text-xs font-medium tracking-wide text-zinc-500 uppercase">Sections</div>

      {basics && <SectionRow id={basics.id} type="basics" title="Basic Info" visible selected={selected === basics.id} onSelect={select} pinned />}

      <SortableList
        ids={movable.map((s) => s.id)}
        onMove={(from, to) =>
          updateResume((r) => {
            const others = r.sections.filter((s) => s.type !== 'basics');
            const moved = arrayMove(others, from, to);
            r.sections = [...r.sections.filter((s) => s.type === 'basics'), ...moved];
          })
        }
      >
        {movable.map((section) => (
          <SortableItem key={section.id} id={section.id}>
            {({ style, handle, ref, dragging }) => (
              <div ref={ref} style={style} className={cn(dragging && 'shadow-pop rounded-[9px] bg-white')}>
                <SectionRow
                  id={section.id}
                  type={section.type}
                  title={section.title || SECTION_CONFIG[section.type].label}
                  visible={section.visible}
                  selected={selected === section.id}
                  onSelect={select}
                  handle={handle}
                  onToggle={() =>
                    updateResume((r) => {
                      const s = r.sections.find((x) => x.id === section.id)!;
                      s.visible = !s.visible;
                    })
                  }
                />
              </div>
            )}
          </SortableItem>
        ))}
      </SortableList>

      <DropdownMenu>
        <DropdownTrigger asChild>
          <Button variant="ghost" className="mt-2 justify-start px-2.5 text-accent-600 hover:text-accent-700">
            <Plus size={16} /> Add section
          </Button>
        </DropdownTrigger>
        <DropdownContent align="start" className="w-64">
          {ADDABLE.map((type) => {
            const existing = sections.find((s) => s.type === type);
            const Icon = SECTION_ICONS[type];
            return (
              <DropdownItem
                key={type}
                icon={<Icon size={16} />}
                disabled={!!existing?.visible}
                onSelect={() => addSection(type)}
                shortcut={existing ? (existing.visible ? 'added' : 'show') : undefined}
              >
                {SECTION_CONFIG[type].label}
              </DropdownItem>
            );
          })}
          <DropdownSeparator />
          <DropdownLabel>Anything else</DropdownLabel>
          <DropdownItem icon={<Plus size={16} />} onSelect={() => addSection('custom')}>
            Custom section…
          </DropdownItem>
        </DropdownContent>
      </DropdownMenu>

      <div className="flex-1" />
      <p className="rounded-[9px] bg-zinc-50 p-2.5 text-xs text-zinc-500">Drag to reorder. The eye hides a section from the PDF without deleting it.</p>
    </aside>
  );
}

function SectionRow({
  id,
  type,
  title,
  visible,
  selected,
  onSelect,
  handle,
  onToggle,
  pinned,
}: {
  id: string;
  type: SectionType;
  title: string;
  visible: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  handle?: React.ReactNode;
  onToggle?: () => void;
  pinned?: boolean;
}) {
  const Icon = SECTION_ICONS[type];
  return (
    <div
      className={cn(
        'group flex h-[38px] items-center gap-2 rounded-[9px] px-2 text-sm',
        selected ? 'bg-accent-100 font-semibold text-accent-600' : visible ? 'text-zinc-700 hover:bg-zinc-50' : 'text-zinc-400 hover:bg-zinc-50',
      )}
    >
      <span className="flex w-[15px] justify-center">{pinned ? null : handle}</span>
      <button type="button" onClick={() => onSelect(id)} className="flex min-w-0 flex-1 items-center gap-2 self-stretch text-left">
        <Icon size={16} className="shrink-0" />
        <span className="truncate">{title}</span>
      </button>
      {pinned ? (
        <span className="text-[11px] font-normal text-zinc-400">top</span>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? `Hide ${title}` : `Show ${title}`}
          className={cn('rounded p-0.5 hover:bg-white/70', visible ? 'opacity-0 group-hover:opacity-100 focus:opacity-100' : 'opacity-100')}
        >
          {visible ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
      )}
    </div>
  );
}
