import { Mail } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { flushSave } from './autosave';
import { useEditor } from './store';

/** Opens this resume's cover letter, creating it on first use. */
export function CoverLetterButton() {
  const resume = useEditor((s) => s.resume);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  if (!resume || resume.isBase) return null;

  const open = async () => {
    setBusy(true);
    try {
      await flushSave();
      const letter = await api.ensureLetter(resume.id);
      navigate(`/letters/${letter.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Button onClick={open} disabled={busy} title="Cover letter with the same header and design">
      <Mail size={16} /> Letter
    </Button>
  );
}
