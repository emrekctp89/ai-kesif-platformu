import { test, expect } from '../fixtures/base';

test.describe('Araç Detay Sayfası', () => {
  test('Bir araç detay sayfasına gidilebiliyor', async ({ page }) => {
    await page.goto('/kesfet');

    // İlk araç kartına tıkla
    const firstTool = page.locator('a[href*="/tool"], [data-testid="tool-card"], article').first();
    await firstTool.click();

    // Detay sayfasında başlık görünmeli
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
  });

  test('Karşılaştır butonu görünüyor', async ({ page }) => {
    await page.goto('/kesfet');

    const firstTool = page.locator('a[href*="/tool"], [data-testid="tool-card"], article').first();
    await firstTool.click();

    // Karşılaştırma butonu görünmeli
    const compareButton = page.getByRole('button', { name: /Karşılaştır|Compare|karşıla/i });
    await expect(compareButton).toBeVisible({ timeout: 15000 });
  });
});
