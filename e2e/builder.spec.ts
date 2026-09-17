import { existsSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const HOME = path.join(process.cwd(), 'e2e', '.home');

async function baseResume(request: APIRequestContext) {
  const { items } = await (await request.get('/api/resumes')).json();
  return items.find((r: { isBase: boolean }) => r.isBase);
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

test('duplicate for a job, edit, autosave and export a named one-page PDF', async ({ page, request }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByText('Base resume', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Duplicate for job' }).first().click();
  await page.getByLabel('Company').fill('Jane Street');
  await page.getByLabel('Role').fill('Software Engineer');
  await expect(page.getByText(/Khan_Rukaiya_JaneStreet_\d{4}-\d{2}-\d{2}\.pdf/)).toBeVisible();
  await page.getByRole('button', { name: 'Create & open editor' }).click();
  await page.waitForURL(/\/resumes\/r_/);
  const id = page.url().split('/resumes/')[1].split('?')[0];

  await page.getByRole('button', { name: 'Experience', exact: true }).click();
  const bullet = page.getByLabel('Bullet 1').first();
  await bullet.click();
  await bullet.press('End');
  await bullet.pressSequentially(' for trading systems');
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 5000 });
  await expect
    .poll(async () => {
      const r = await (await request.get(`/api/resumes/${id}`)).json();
      return r.sections.find((s: { type: string }) => s.type === 'employment').entries[0].bullets[0];
    })
    .toMatch(/for trading systems$/);

  await expect(page.getByRole('status').filter({ hasText: /page/ })).toContainText('Fits on 1 page');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  await expect(page.getByText(/PDF saved in resumes\/week-of-/)).toBeVisible({ timeout: 30_000 });

  const saved = await (await request.get(`/api/resumes/${id}`)).json();
  const exported = saved.exports.at(-1);
  expect(exported.path).toMatch(/^week-of-\d{4}-\d{2}-\d{2}\/Khan_Rukaiya_JaneStreet_\d{4}-\d{2}-\d{2}\.pdf$/);
  expect(exported.pages).toBe(1);
  expect(existsSync(path.join(HOME, 'resumes', exported.path))).toBe(true);
  expect(errors).toEqual([]);
});

test('design options change the page: skill separator and award layout', async ({ page, request }) => {
  const base = await baseResume(request);
  await page.goto(`/resumes/${base.id}?view=resume`);
  const pageEl = page.locator('[data-resume-page]');
  await expect(pageEl).toContainText('Python, TypeScript');

  await page.getByRole('button', { name: /Entries/ }).click();
  await page.getByRole('radio', { name: 'a • b' }).click();
  await expect(pageEl).toContainText('Python • TypeScript');
  await expect(page.getByText(/\d+ overrides?/)).toBeVisible();

  await page.getByRole('radio', { name: 'Own line' }).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(pageEl).toContainText('Python, TypeScript');
});

test('templates: create from Classic, rename via design mode, set as default', async ({ page, request }) => {
  await page.goto('/templates');
  await page.getByRole('button', { name: 'New template' }).first().click();
  await page.getByLabel('Name').fill('E2E Serif');
  await page.getByRole('button', { name: 'Create & design' }).click();
  await page.waitForURL(/\/templates\/t_.*\/design/);
  await page.getByLabel('Font family').selectOption('Source Serif 4');
  await page.getByRole('button', { name: 'Set as default' }).click();
  await expect(page.getByRole('button', { name: 'Default template' })).toBeVisible();

  await expect
    .poll(async () => {
      const t = await (await request.get('/api/templates')).json();
      const tpl = t.items.find((x: { name: string }) => x.name === 'E2E Serif');
      return tpl && t.defaultTemplateId === tpl.id && tpl.design.font.family;
    })
    .toBe('Source Serif 4');
  // Restore the default so other tests see Classic.
  await request.post('/api/templates/classic/default');
});

test('match dialog shows the report and score history for an AI-tailored resume', async ({ page, request }) => {
  const base = await baseResume(request);
  const job = {
    note: 'Jobs/Acme - Backend Engineer.md',
    title: 'Backend Engineer',
    url: 'https://example.com/job',
    description: 'About\nWe build APIs.\n\nRequirements\n- Python and TypeScript\n- PostgreSQL and Docker\n\nNice to have\n- Kubernetes',
  };
  const created = await (await request.post(`/api/resumes/${base.id}/duplicate`, { data: { company: 'Acme', role: 'Backend Engineer', job } })).json();
  const match = {
    keywords: { score: 60, mustHave: { matched: 2, total: 4 }, niceToHave: { matched: 0, total: 1 }, matched: ['Python'], aliasOnly: [], missingRequired: ['Docker'], missingPreferred: ['Kubernetes'] },
    requirements: [{ requirement: 'Python', strength: 'strong', evidence: 'Languages' }],
    gaps: { real: ['Kubernetes'], weak: [] },
    improvements: { addToNotes: [], strengthen: [], upskill: ['Try k8s'], applicationTips: [] },
    scoredAt: new Date().toISOString(),
  };
  expect((await request.put(`/api/resumes/${created.id}/match`, { data: match })).ok()).toBe(true);

  await page.goto(`/resumes/${created.id}`);
  await page.getByRole('button', { name: /^Match/ }).click();
  await expect(page.getByText('Real gaps (not in your notes)')).toBeVisible();
  await page.getByRole('button', { name: 'Re-score' }).click();
  await expect(page.getByText(/Keyword score: \d+\/100/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Score history \(2 runs/)).toBeVisible();
});

test('cover letter: open from a resume, edit, and export with matching header and CoverLetter file name', async ({ page, request }) => {
  const errors = collectErrors(page);
  const base = await baseResume(request);
  const resume = await (await request.post(`/api/resumes/${base.id}/duplicate`, { data: { company: 'Globex', role: 'Platform Engineer' } })).json();

  await page.goto(`/resumes/${resume.id}`);
  await page.getByRole('button', { name: 'Letter' }).click();
  await page.waitForURL(/\/letters\/c_/);
  const letterId = page.url().split('/letters/')[1];

  const preview = page.locator('[data-letter-content]');
  await expect(preview).toContainText(/RUKAIYA KHAN/i); // header comes from the resume
  await page.getByLabel('Paragraph 1', { exact: true }).fill('I build reliable backend platforms and would love to do that at Globex.');
  await page.getByRole('button', { name: 'Add paragraph' }).click();
  await page.getByLabel('Paragraph 2', { exact: true }).fill('At my last role I cut API latency by 90% with caching.');
  await expect(preview).toContainText('cut API latency by 90%');
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 5000 });

  await page.getByRole('button', { name: 'Download PDF' }).click();
  await expect(page.getByText(/PDF saved in resumes\/week-of-/)).toBeVisible({ timeout: 30_000 });
  const letter = await (await request.get(`/api/letters/${letterId}`)).json();
  expect(letter.paragraphs).toHaveLength(2);
  expect(letter.exports.at(-1).path).toMatch(/\/Khan_Rukaiya_Globex_CoverLetter_\d{4}-\d{2}-\d{2}\.pdf$/);
  expect(letter.exports.at(-1).pages).toBe(1);
  expect(existsSync(path.join(HOME, 'resumes', letter.exports.at(-1).path))).toBe(true);

  // Opening the letter again from the resume reuses the same one.
  const again = await (await request.post('/api/letters', { data: { resumeId: resume.id } })).json();
  expect(again.id).toBe(letterId);
  expect(errors).toEqual([]);
});
