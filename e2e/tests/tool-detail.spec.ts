import { test, expect } from '../fixtures/base';

test.describe('Araç Detay Sayfası', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tool/slack', { waitUntil: 'domcontentloaded' });
  });

  test('araç bilgileri ve resmî site bağlantısı görünüyor', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Slack', exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('link', { name: /Resmî Siteyi İncele/i })).toBeVisible();
  });

  test('benzer araçlar ve link bildirme kontrolü görünüyor', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Bunları da Beğenebilirsiniz/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('button', { name: /Link Hatalı Bildir/i })).toBeVisible();
  });
});
