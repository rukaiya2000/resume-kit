import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  Resume,
  Template,
  TemplateIndex,
  classicTemplate,
  newId,
  sampleBaseResume,
} from '@rc/core';
import type { z } from 'zod';

import { HOME } from './config';

export { ROOT } from './config';
export const PATHS = {
  resumes: path.join(HOME, 'data', 'resumes'),
  templates: path.join(HOME, 'templates'),
  templateIndex: path.join(HOME, 'templates', 'index.json'),
  output: path.join(HOME, 'resumes'),
};

export class NotFoundError extends Error {}
export class ConflictError extends Error {}

export interface FileProblem {
  file: string;
  error: string;
}

async function writeJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2) + '\n');
  await rename(tmp, file);
}

async function readJson<T>(file: string, schema: z.ZodType<T>): Promise<T> {
  const raw = JSON.parse(await readFile(file, 'utf8'));
  return schema.parse(raw);
}

async function listJson<T>(dir: string, schema: z.ZodType<T>, skip: string[] = []) {
  await mkdir(dir, { recursive: true });
  const items: T[] = [];
  const problems: FileProblem[] = [];
  for (const name of (await readdir(dir)).sort()) {
    if (!name.endsWith('.json') || skip.includes(name)) continue;
    try {
      items.push(await readJson(path.join(dir, name), schema));
    } catch (err) {
      problems.push({ file: name, error: err instanceof Error ? err.message.slice(0, 500) : String(err) });
    }
  }
  return { items, problems };
}

const safeId = (id: string) => {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) throw new NotFoundError(`Invalid id: ${id}`);
  return id;
};

// ---------- seed ----------

export async function ensureSeed() {
  await mkdir(PATHS.resumes, { recursive: true });
  await mkdir(PATHS.templates, { recursive: true });
  await mkdir(PATHS.output, { recursive: true });
  if (!existsSync(path.join(PATHS.templates, 'classic.json'))) {
    await writeJson(path.join(PATHS.templates, 'classic.json'), classicTemplate());
  }
  if (!existsSync(PATHS.templateIndex)) {
    await writeJson(PATHS.templateIndex, { defaultTemplateId: 'classic' } satisfies TemplateIndex);
  }
  const { items } = await listJson(PATHS.resumes, Resume);
  if (items.length === 0) {
    const base = sampleBaseResume(newId('r'));
    await writeJson(path.join(PATHS.resumes, `${base.id}.json`), base);
  }
}

// ---------- resumes ----------

export const resumes = {
  list: () => listJson(PATHS.resumes, Resume),
  async get(id: string) {
    const file = path.join(PATHS.resumes, `${safeId(id)}.json`);
    if (!existsSync(file)) throw new NotFoundError(`Resume ${id} not found`);
    return readJson(file, Resume);
  },
  async save(resume: Resume) {
    const parsed = Resume.parse({ ...resume, updatedAt: new Date().toISOString() });
    await writeJson(path.join(PATHS.resumes, `${safeId(parsed.id)}.json`), parsed);
    return parsed;
  },
  async remove(id: string) {
    const resume = await this.get(id);
    if (resume.isBase) throw new ConflictError('The Base resume cannot be deleted.');
    await rm(path.join(PATHS.resumes, `${safeId(id)}.json`));
  },
};

// ---------- templates ----------

export const templates = {
  async list() {
    const result = await listJson(PATHS.templates, Template, ['index.json']);
    return { ...result, defaultTemplateId: (await this.index()).defaultTemplateId };
  },
  async index(): Promise<TemplateIndex> {
    try {
      return await readJson(PATHS.templateIndex, TemplateIndex);
    } catch {
      return { defaultTemplateId: 'classic' };
    }
  },
  async get(id: string) {
    const file = path.join(PATHS.templates, `${safeId(id)}.json`);
    if (!existsSync(file)) throw new NotFoundError(`Template ${id} not found`);
    return readJson(file, Template);
  },
  async getOrDefault(id: string) {
    try {
      return await this.get(id);
    } catch {
      return this.get((await this.index()).defaultTemplateId);
    }
  },
  async save(template: Template) {
    const parsed = Template.parse({ ...template, updatedAt: new Date().toISOString() });
    await writeJson(path.join(PATHS.templates, `${safeId(parsed.id)}.json`), parsed);
    return parsed;
  },
  async setDefault(id: string) {
    await this.get(id);
    await writeJson(PATHS.templateIndex, { defaultTemplateId: id });
  },
  async remove(id: string, reassignTo?: string) {
    const index = await this.index();
    if (index.defaultTemplateId === id) throw new ConflictError('The default template cannot be deleted. Set another default first.');
    const { items } = await resumes.list();
    const users = items.filter((r) => r.templateId === id);
    if (users.length > 0) {
      if (!reassignTo) throw new ConflictError(`${users.length} resume(s) use this template.`);
      await this.get(reassignTo);
      for (const r of users) await resumes.save({ ...r, templateId: reassignTo });
    }
    await rm(path.join(PATHS.templates, `${safeId(id)}.json`));
  },
};
