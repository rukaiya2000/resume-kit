import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { FullPageMessage } from '../components/AppHeader';
import { ScaledPage } from '../components/ScaledPage';
import { api } from '../lib/api';
import { keys, useResumeDesign, useTemplates } from '../lib/queries';

/** Read-only, responsive web version of a resume. */
export function WebViewPage() {
  const { id = '' } = useParams();
  const resume = useQuery({ queryKey: keys.resume(id), queryFn: () => api.resume(id) });
  const templates = useTemplates();
  const design = useResumeDesign(resume.data, templates.data?.items, templates.data?.defaultTemplateId);

  if (resume.error) return <FullPageMessage title="Resume not found" />;
  if (!resume.data || !design) return null;

  return (
    <div className="dot-grid min-h-full px-4 py-6 sm:py-10">
      <div className="mx-auto flex max-w-[880px] flex-col gap-4">
        <Link to={`/resumes/${id}`} className="flex items-center gap-1.5 self-start text-sm text-zinc-600 hover:text-zinc-900">
          <ArrowLeft size={16} /> Back to editor
        </Link>
        <div className="overflow-hidden rounded bg-white shadow-page">
          <ScaledPage resume={resume.data} design={design} links />
        </div>
      </div>
    </div>
  );
}
