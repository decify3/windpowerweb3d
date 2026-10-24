import { expect, test } from '@playwright/test';

// App base path derived from the test target URL so the suite works for any
// deployment base (e.g. /windpowerweb3d/ or the site root).
const BASE = new URL(process.env.TEST_URL ?? 'http://127.0.0.1:5173/windpowerweb3d/').pathname;

test('公众号引导页展示固定二维码，并在确认后进入三维应用', async ({ page }) => {
  await page.goto(BASE);

  await expect(page.getByRole('heading', { name: '先关注，再探索风机' })).toBeVisible();
  await expect(page.locator('.follow-gate-qr')).toHaveAttribute(
    'src',
    `${BASE}images/qrcode_for_gh_10e8400b2bfb_860.jpg`,
  );
  await expect(page.locator('.application')).toHaveCount(0);

  await page.getByRole('button', { name: '我已关注，进入体验' }).click();
  await expect(page.locator('.follow-gate')).toHaveCount(0);
  await expect(page.locator('.application')).toBeVisible();
});

test('已确认的访问状态会在下次访问时跳过引导页', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('darmk:windpowerweb3d:follow-gate:v1', 'granted'));
  await page.goto(BASE);

  await expect(page.locator('.follow-gate')).toHaveCount(0);
  await expect(page.locator('.application')).toBeVisible();
});
