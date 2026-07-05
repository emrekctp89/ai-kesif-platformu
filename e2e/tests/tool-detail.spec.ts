import { test, expect } from '@playwright/test';

test.describe('Araç Detay Sayfası', () => {
  test('Bir araç detay sayfasına gidilebiliyor', async ({ page }) => {
    await page.goto('/kesfet');

    // İlk tool card'a tıkla
    const firstTool = page.locator('[data-testid="tool-card"], .tool-card, article').first();
    await firstTool.click();

    // Detay sayfasında başlık görünmeli
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('Karşılaştır butonu görünüyor', async ({ page }) => {
    await page.goto('/kesfet');

    const firstTool = page.locator('[data-testid="tool-card"], .tool-card, article').first();
    await firstTool.click();

    const compareButton = page.getByRole('button', { name: /Karşılaştır|Compare/i });
    await expect(compareButton).toBeVisible();
  });
});
