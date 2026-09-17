import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Browser } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { exportRelativePath, type Resume } from '@rc/core';
import { PATHS, resumes } from './store';

const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:5173';

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

export async function renderPdf(resumeId: string): Promise<Uint8Array> {
  const page = await (await browser()).newPage();
  try {
    await page.goto(`${WEB_ORIGIN}/print/${encodeURIComponent(resumeId)}`, { waitUntil: 'networkidle' });
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

export async function exportResume(resumeId: string) {
  const resume = await resumes.get(resumeId);
  const { rel, abs, fullName } = await resolveExportPath(resume);
  const raw = await renderPdf(resumeId);

  const pdf = await PDFDocument.load(raw);
  const who = fullName.trim() || 'Resume';
  pdf.setTitle(`${who} – Resume`);
  pdf.setAuthor(who);
  pdf.setSubject([resume.company, resume.role].filter(Boolean).join(' – ') || 'Resume');
  pdf.setCreator('Resume Creator');
  pdf.setProducer('Resume Creator');
  const bytes = await pdf.save();
  const pages = pdf.getPageCount();

  const overwritten = existsSync(abs);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, bytes);

  const at = new Date().toISOString();
  const exports = [...resume.exports.filter((e) => e.path !== rel), { path: rel, at, pages }];
  await resumes.save({ ...resume, exports });

  return { path: rel, absolutePath: abs, pages, overwritten, at };
}
