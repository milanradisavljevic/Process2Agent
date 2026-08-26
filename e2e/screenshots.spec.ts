import { expect, test, type Page } from '@playwright/test';

const TARGET = process.env.SHOT_TARGET ?? 'before';
const OUT_DIR = `docs/reviews/${TARGET}`;

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'compact', width: 900, height: 1000 },
];

async function shot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: false });
}

async function importDemoAndOpenAssessment(page: Page): Promise<void> {
  await page.goto('/#/import');
  await page.getByRole('button', { name: 'Demo-Prozess laden' }).click();
  await page.getByRole('button', { name: 'Importieren & analysieren' }).click();
  await expect(page.locator('.app-header h1')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.element-card').first()).toBeVisible();
}

for (const vp of VIEWPORTS) {
  test(`screenshots ${vp.name}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    await page.goto('/#/');
    await expect(page.getByText('Keine Prozesse im Workspace')).toBeVisible({ timeout: 10_000 });
    await shot(page, `01-landing-empty-${vp.name}`);

    await page.goto('/#/import');
    await expect(page.getByRole('button', { name: 'Demo-Prozess laden' })).toBeVisible();
    await shot(page, `02-import-${vp.name}`);

    await importDemoAndOpenAssessment(page);
    await shot(page, `03-assessment-${vp.name}`);

    await page.locator('.element-card').first().click();
    await expect(page.locator('.drawer-panel.open')).toBeVisible();
    await shot(page, `04-drawer-${vp.name}`);
    await page.keyboard.press('Escape');
    await page.locator('.drawer-overlay').click().catch(() => {});
    await page.mouse.click(40, 40);

    await page.getByRole('button', { name: /Report generieren/ }).click();
    await expect(page.locator('.report-document')).toBeVisible();
    await shot(page, `05-report-top-${vp.name}`);
    await page.screenshot({ path: `${OUT_DIR}/06-report-full-${vp.name}.png`, fullPage: true });

    await page.goto('/#/');
    await expect(page.locator('.process-card').first()).toBeVisible();
    await shot(page, `07-landing-filled-${vp.name}`);

    await context.close();
  });
}
