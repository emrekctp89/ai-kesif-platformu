import { test, expect } from '@playwright/test';

test.describe('Keşfet Sayfası', () => {
  test('Keşfet sayfası yükleniyor ve araçlar görünüyor', async ({ page }) => {
    await page.goto('/kesfet');

    await expect(page.getByText(/AI Araçları|Keşfet/i)).toBeVisible();

    // En az bir tool card görünmeli
    const toolCard = page.locator('[data-testid="tool-card"], .tool-card, article').first();
    await expect(toolCard).toBeVisible({ timeout: 10000 });
  });

  test('Arama ile filtreleme çalışıyor', async ({ page }) => {
    await page.goto('/kesfet');

    const searchInput = page.getByPlaceholder(/AI aracı ara|araç ara/i);
    await searchInput.fill('ChatGPT');

    // Sonuçların değişmesini bekle
    await page.waitForTimeout(800);

    const results = page.locator('[data-testid="tool-card"], .tool-card');
    await expect(results.first()).toBeVisible();
  });
});
