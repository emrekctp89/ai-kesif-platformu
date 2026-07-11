import { test, expect } from '../fixtures/base';

test.describe('Araç karşılaştırma', () => {
  test('karşılaştırma sayfası araç seçim kontrolleriyle yükleniyor', async ({ page }) => {
    await page.goto('/karsilastir', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /Karşılaştırma|Compare/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/Karşılaştırmak istediğiniz araçları seçin/i)).toBeVisible();
  });
});
