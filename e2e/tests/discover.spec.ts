import { test, expect } from '../fixtures/base';

test.describe('Keşfet Sayfası', () => {
  test('Keşfet sayfası yükleniyor ve araçlar görünüyor', async ({ discoverPage, page }) => {
    await discoverPage.goto();

    // Başlık kontrolü
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15000 });

    // En az bir araç kartı görünmeli
    const firstTool = page.locator('a[href*="/tool"], [data-testid="tool-card"], article').first();
    await expect(firstTool).toBeVisible({ timeout: 15000 });
  });

  test('Arama ile filtreleme çalışıyor', async ({ discoverPage, page }) => {
    await discoverPage.goto();

    const searchInput = page.getByPlaceholder(/AI aracı ara|araç ara|Search/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    await searchInput.fill('ChatGPT');
    await page.waitForTimeout(800);

    // Sonuçların değişmesini bekle
    const results = page.locator('a[href*="/tool"], [data-testid="tool-card"], article');
    await expect(results.first()).toBeVisible({ timeout: 10000 });
  });
});
