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
});
