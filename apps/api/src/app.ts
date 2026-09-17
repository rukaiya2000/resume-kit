import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  JobLink,
  MatchReport,
  Resume,
  Template,
  blankResume,
  classicTemplate,
  exportRelativePath,
  newId,
  roleAbbrev,
} from '@rc/core';
import { SERVE_WEB, WEB_ORIGIN } from './config';
import { exportResume, resolveExportPath } from './pdf';
import { ConflictError, NotFoundError, PATHS, ROOT, resumes, templates } from './store';

export const app = new Hono().basePath('/api');

app.onError((err, c) => {
  if (err instanceof NotFoundError) return c.json({ error: err.message }, 404);
  if (err instanceof ConflictError) return c.json({ error: err.message }, 409);
  if (err instanceof z.ZodError) return c.json({ error: 'Invalid data', issues: err.issues.slice(0, 20) }, 400);
  console.error(err);
  return c.json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
});

const now = () => new Date().toISOString();

/** Lets other tools (the Python MCP server) find the UI and output folder for whichever mode is running. */
app.get('/info', (c) => c.json({ webOrigin: SERVE_WEB ? new URL(c.req.url).origin : WEB_ORIGIN, output: PATHS.output, mode: SERVE_WEB ? 'start' : 'dev' }));

// ---------- resumes ----------

app.get('/resumes', async (c) => c.json(await resumes.list()));

app.post('/resumes', async (c) => {
  const body = z.object({ name: z.string().optional(), templateId: z.string().optional() }).parse(await c.req.json().catch(() => ({})));
  const index = await templates.index();
  const template = await templates.getOrDefault(body.templateId ?? index.defaultTemplateId);
  const resume = blankResume(newId('r'), template);
  if (body.name) resume.name = body.name;
  return c.json(await resumes.save(resume), 201);
});

app.post('/resumes/import', async (c) => {
  const raw = await c.req.json();
  const parsed = Resume.parse({ ...raw, id: newId('r'), isBase: false, exports: [], matchHistory: [], createdAt: now(), updatedAt: now() });
  return c.json(await resumes.save(parsed), 201);
});

app.get('/resumes/:id', async (c) => c.json(await resumes.get(c.req.param('id'))));

app.put('/resumes/:id', async (c) => {
  const existing = await resumes.get(c.req.param('id'));
  const incoming = Resume.parse(await c.req.json());
  // id, base flag, export history, job link, match report and createdAt are owned by the server,
  // so an editor autosaving a stale copy can't overwrite them.
  return c.json(
    await resumes.save({
      ...incoming,
      id: existing.id,
      isBase: existing.isBase,
      exports: existing.exports,
      job: existing.job,
      match: existing.match,
      matchHistory: existing.matchHistory,
      createdAt: existing.createdAt,
    }),
  );
});

app.delete('/resumes/:id', async (c) => {
  await resumes.remove(c.req.param('id'));
  return c.body(null, 204);
});

app.post('/resumes/:id/duplicate', async (c) => {
  const source = await resumes.get(c.req.param('id'));
  const body = z
    .object({
      company: z.string().default(''),
      role: z.string().default(''),
      jobUrl: z.string().default(''),
      templateId: z.string().optional(),
      name: z.string().optional(),
      job: JobLink.optional(),
    })
    .parse(await c.req.json().catch(() => ({})));
  const template = await templates.getOrDefault(body.templateId ?? source.templateId);
  const autoName = [body.company, body.role ? roleAbbrev(body.role) : ''].filter(Boolean).join(' ');
  const copy: Resume = {
    ...structuredClone(source),
    id: newId('r'),
    isBase: false,
    name: body.name || autoName || `${source.name} copy`,
    company: body.company,
    role: body.role,
    jobUrl: body.jobUrl,
    templateId: template.id,
    exports: [],
    source: body.job ? 'ai' : 'manual',
    job: body.job,
    match: undefined,
    matchHistory: [],
    createdAt: now(),
    updatedAt: now(),
  };
  return c.json(await resumes.save(copy), 201);
});

app.get('/resumes/:id/export-name', async (c) => {
  const resume = await resumes.get(c.req.param('id'));
  const { rel } = await resolveExportPath(resume);
  return c.json({ path: rel });
});

app.get('/export-name', (c) => {
  // Preview for the Duplicate dialog before a resume exists.
  const rel = exportRelativePath({ fullName: c.req.query('name') ?? '', company: c.req.query('company') ?? '', date: new Date() });
  return c.json({ path: rel, file: path.basename(rel) });
});

app.post('/resumes/:id/export', async (c) => c.json(await exportResume(c.req.param('id'))));

function withHistory(resume: Resume, match: MatchReport, source: 'ai' | 'rescore'): Resume {
  const k = match.keywords;
  const entry = { score: k.score, mustHaveMatched: k.mustHave.matched, mustHaveTotal: k.mustHave.total, at: match.scoredAt, source };
  return { ...resume, match, matchHistory: [...resume.matchHistory, entry].slice(-50) };
}

app.put('/resumes/:id/match', async (c) => {
  const resume = await resumes.get(c.req.param('id'));
  const match = MatchReport.parse(await c.req.json());
  return c.json(await resumes.save(withHistory(resume, match, 'ai')));
});

/** Keyword scoring lives in the Python AI package (ai/scoring.py); this runs it as a one-shot process. */
function pythonKeywordMatch(input: { jobDescription: string; jobTitle: string; resume: Resume }): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn('uv', ['run', '--quiet', '--directory', path.join(ROOT, 'ai'), 'python', 'scoring.py'], { stdio: 'pipe' });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => reject(new Error(`Couldn't run the Python scorer (is uv installed?): ${e.message}`)));
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`Python scorer failed: ${err.trim().split('\n').at(-1) ?? code}`));
      try {
        resolve(JSON.parse(out));
      } catch {
        reject(new Error('Python scorer returned invalid JSON'));
      }
    });
    child.stdin.end(JSON.stringify(input));
  });
}

/** Re-runs the keyword check against the saved job description (the AI's requirement review is kept). */
app.post('/resumes/:id/score', async (c) => {
  const resume = await resumes.get(c.req.param('id'));
  if (!resume.job?.description) throw new ConflictError('This resume has no job description to score against.');
  const keywords = await pythonKeywordMatch({ jobDescription: resume.job.description, jobTitle: resume.job.title, resume });
  const match = MatchReport.parse({ ...(resume.match ?? {}), keywords, scoredAt: now() });
  return c.json(await resumes.save(withHistory(resume, match, 'rescore')));
});

// ---------- templates ----------

app.get('/templates', async (c) => c.json(await templates.list()));

app.post('/templates', async (c) => {
  const body = z
    .object({ name: z.string().min(1), fromTemplateId: z.string().optional(), design: z.unknown().optional() })
    .parse(await c.req.json());
  const base = body.fromTemplateId ? await templates.get(body.fromTemplateId) : classicTemplate();
  const template: Template = Template.parse({
    ...base,
    id: newId('t'),
    name: body.name,
    design: body.design ?? base.design,
    createdAt: now(),
    updatedAt: now(),
  });
  return c.json(await templates.save(template), 201);
});

app.get('/templates/:id', async (c) => c.json(await templates.get(c.req.param('id'))));

app.put('/templates/:id', async (c) => {
  const existing = await templates.get(c.req.param('id'));
  const incoming = Template.parse(await c.req.json());
  return c.json(await templates.save({ ...incoming, id: existing.id, createdAt: existing.createdAt }));
});

app.delete('/templates/:id', async (c) => {
  await templates.remove(c.req.param('id'), c.req.query('reassignTo'));
  return c.body(null, 204);
});

app.post('/templates/:id/default', async (c) => {
  await templates.setDefault(c.req.param('id'));
  return c.json(await templates.index());
});

app.post('/templates/import', async (c) => {
  const raw = await c.req.json();
  const parsed = Template.parse({ ...raw, id: newId('t'), createdAt: now(), updatedAt: now() });
  return c.json(await templates.save(parsed), 201);
});

// ---------- files ----------

const FileBody = z.object({ path: z.string() });

function outputFile(rel: string) {
  const abs = path.resolve(PATHS.output, rel);
  if (!abs.startsWith(PATHS.output + path.sep)) throw new NotFoundError('Path outside resumes/');
  if (!existsSync(abs)) throw new NotFoundError('File not found. Export the PDF again.');
  return abs;
}

const run = (args: string[]) =>
  new Promise<void>((resolve, reject) => execFile('open', args, (err) => (err ? reject(err) : resolve())));

app.post('/files/open', async (c) => {
  const { path: rel } = FileBody.parse(await c.req.json());
  await run([outputFile(rel)]);
  return c.json({ ok: true });
});

app.post('/files/reveal', async (c) => {
  const { path: rel } = FileBody.parse(await c.req.json());
  await run(['-R', outputFile(rel)]);
  return c.json({ ok: true });
});

app.get('/files/pdf', async (c) => {
  const abs = outputFile(c.req.query('path') ?? '');
  return c.body(await readFile(abs), 200, { 'Content-Type': 'application/pdf' });
});
