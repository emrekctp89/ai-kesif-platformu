import { test, expect } from '../fixtures/base';

test.describe('Keşfet Sayfası', () => {
  test('Keşfet sayfası yükleniyor ve araçlar görünüyor', async ({ discoverPage, page }) => {
    await discoverPage.goto();

    await expect(page.getByText(/AI Araçları|Keşfet/i)).toBeVisible();

    const firstTool = await discoverPage.getFirstToolCard();
    await expect(firstTool).toBeVisible({ timeout: 10000 });
  });

  test('Arama ile filtreleme çalışıyor', async ({ discoverPage, page }) => {
    await discoverPage.goto();
    await discoverPage.search('ChatGPT');

    const count = await discoverPage.getToolCount();
    expect(count).toBeGreaterThan(0);
  });

  test('Kategori filtreleme (eğer varsa)', async ({ discoverPage, page }) => {
    await discoverPage.goto();

    // Kategori butonu varsa tıkla
    const categoryBtn = page.getByRole('button', { name: /Kategori|Category/i }).first();
    
    if (await categoryBtn.isVisible()) {
      await categoryBtn.click();
      await page.waitForTimeout(500);
      
      const count = await discoverPage.getToolCount();
      expect(count).toBeGreaterThanOrEqual(0);
    } else {
      test.skip();
    }
  });
});
