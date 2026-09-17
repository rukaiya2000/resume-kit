import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Browser } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { exportRelativePath, type Resume } from '@rc/core';
import { WEB_ORIGIN } from './config';
import { PATHS, letters, resumes } from './store';

let browserPromise: Promise<Browser> | null = null;
function browser() {
  browserPromise ??= chromium.launch().catch((err) => {
    browserPromise = null;
    throw err;
  });
  return browserPromise;
}

export async function closeBrowser() {
  if (browserPromise) (await browserPromise).close();
}

/** Decides the output path, adding the role when another resume already exported under the same name today. */
export async function resolveExportPath(resume: Resume, date = new Date()) {
  const fullName = resume.sections.find((s) => s.type === 'basics')?.basics?.name ?? '';
  const input = { fullName, company: resume.company, role: resume.role, date };
  let rel = exportRelativePath(input);
  const { items } = await resumes.list();
  const takenByOther = items.some((r) => r.id !== resume.id && r.exports.some((e) => e.path === rel));
  if (takenByOther && resume.role) rel = exportRelativePath({ ...input, includeRole: true });
  return { rel, abs: path.join(PATHS.output, rel), fullName };
}

/** Opens a print route (`/print/:id` or `/print/letter/:id`) in headless Chromium and prints it. */
export async function renderPdf(printPath: string): Promise<Uint8Array> {
  const page = await (await browser()).newPage();
  try {
    await page.goto(`${WEB_ORIGIN}${printPath}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => (window as unknown as { __RESUME_READY__?: boolean }).__RESUME_READY__ === true, null, {
      timeout: 20_000,
    });
    const error = await page.evaluate(() => (window as unknown as { __RESUME_ERROR__?: string }).__RESUME_ERROR__);
    if (error) throw new Error(error);
    return await page.pdf({ preferCSSPageSize: true, printBackground: true });
  } finally {
    await page.close();
  }
}

/** Sets metadata, writes the file, and returns the export record. */
async function writePdf(raw: Uint8Array, abs: string, meta: { title: string; author: string; subject: string }) {
  const pdf = await PDFDocument.load(raw);
  pdf.setTitle(meta.title);
  pdf.setAuthor(meta.author);
  pdf.setSubject(meta.subject);
  pdf.setCreator('Resume Creator');
  pdf.setProducer('Resume Creator');
  const bytes = await pdf.save();
  const overwritten = existsSync(abs);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, bytes);
  return { pages: pdf.getPageCount(), overwritten, at: new Date().toISOString() };
}

export async function exportResume(resumeId: string) {
  const resume = await resumes.get(resumeId);
  const { rel, abs, fullName } = await resolveExportPath(resume);
  const who = fullName.trim() || 'Resume';
  const subject = [resume.company, resume.role].filter(Boolean).join(' – ') || 'Resume';
  const result = await writePdf(await renderPdf(`/print/${encodeURIComponent(resumeId)}`), abs, { title: `${who} – Resume`, author: who, subject });

  const exports = [...resume.exports.filter((e) => e.path !== rel), { path: rel, at: result.at, pages: result.pages }];
  await resumes.save({ ...resume, exports });
  return { path: rel, absolutePath: abs, ...result };
}

export async function exportLetter(letterId: string) {
  const letter = await letters.get(letterId);
  const resume = await resumes.get(letter.resumeId);
  const fullName = resume.sections.find((s) => s.type === 'basics')?.basics?.name ?? '';
  const input = { fullName, company: letter.company, role: letter.role, date: new Date(), kind: 'coverLetter' as const };
  let rel = exportRelativePath(input);
  const { items } = await letters.list();
  if (letter.role && items.some((l) => l.id !== letter.id && l.exports.some((e) => e.path === rel))) {
    rel = exportRelativePath({ ...input, includeRole: true });
  }
  const abs = path.join(PATHS.output, rel);
  const who = fullName.trim() || 'Cover letter';
  const subject = [letter.company, letter.role].filter(Boolean).join(' – ') || 'Cover letter';
  const result = await writePdf(await renderPdf(`/print/letter/${encodeURIComponent(letterId)}`), abs, {
    title: `${who} – Cover Letter`,
    author: who,
    subject,
  });
  const exports = [...letter.exports.filter((e) => e.path !== rel), { path: rel, at: result.at, pages: result.pages }];
  await letters.save({ ...letter, exports });
  return { path: rel, absolutePath: abs, ...result };
}
