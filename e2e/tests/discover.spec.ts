import { test, expect } from '../fixtures/base';

test.describe('Keşfet deneyimi', () => {
  test('araç kartları yükleniyor', async ({ discoverPage }) => {
    await discoverPage.goto();

    await expect(discoverPage.getToolCards().first()).toBeVisible({ timeout: 15000 });
  });

  test('arama sonucunda ilgili araç gösteriliyor', async ({ discoverPage, page }) => {
    await discoverPage.goto();
    await discoverPage.search('ChatGPT');

    await expect(page.locator('main article').filter({ hasText: 'ChatGPT' })).toBeVisible();
  });
});
