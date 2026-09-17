import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { ScaledPage } from '../components/ScaledPage';
import { Button } from '../components/ui';
import { FitBadge } from './FitBadge';
import { SectionEditor } from './SectionEditor';
import { SectionList } from './SectionList';
import { useEditor } from './store';
import { useDesign } from './useDesign';

export function EditView({ onOpenDesign }: { onOpenDesign: () => void }) {
  const [previewOpen, setPreviewOpen] = useState(true);
  return (
    <>
      <SectionList />
      <SectionEditor onOpenDesign={onOpenDesign} />
      {previewOpen ? (
        <PreviewPanel onClose={() => setPreviewOpen(false)} />
      ) : (
        <div className="flex w-11 shrink-0 flex-col items-center border-l border-zinc-100 bg-zinc-100 pt-4">
          <Button variant="ghost" size="icon-sm" aria-label="Show preview" title="Show preview" onClick={() => setPreviewOpen(true)}>
            <ChevronLeft size={16} />
          </Button>
        </div>
      )}
    </>
  );
}

function PreviewPanel({ onClose }: { onClose: () => void }) {
  const resume = useEditor((s) => s.resume)!;
  const selected = useEditor((s) => s.selectedSectionId);
  const { design } = useDesign();
  if (!design) return null;
  return (
    <aside className="flex w-[360px] shrink-0 flex-col gap-3.5 overflow-y-auto border-l border-zinc-100 bg-zinc-100 px-5 py-4">
      <div className="flex items-center">
        <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Live preview</span>
        <div className="flex-1" />
        <Button variant="ghost" size="icon-sm" aria-label="Hide preview" onClick={onClose}>
          <ChevronRight size={16} />
        </Button>
      </div>
      <div className="overflow-hidden rounded-md bg-white shadow-page">
        <ScaledPage
          resume={resume}
          design={design}
          showPageEnd
          selectedSectionId={selected}
          onSectionClick={(id) => useEditor.getState().select(id)}
          onFit={(fit) => useEditor.getState().setFit(fit)}
        />
      </div>
      <div className="flex justify-center">
        <FitBadge />
      </div>
      <p className="text-center text-xs text-zinc-500">Click a section in the preview to edit it.</p>
    </aside>
  );
}
