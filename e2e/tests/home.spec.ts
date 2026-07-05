import { test, expect } from '../fixtures/base';

test.describe('Ana Sayfa', () => {
  test('Ana sayfa başarıyla yükleniyor', async ({ homePage, page }) => {
    await homePage.goto();

    await expect(page).toHaveTitle(/AI Keşif Platformu|AI Araçları/i);
    await expect(
      page.getByRole('heading', { name: /AI Araçlarını Keşfet|Keşfet/i })
    ).toBeVisible();
  });

  test('Arama inputu görünüyor ve çalışabiliyor', async ({ homePage, page }) => {
    await homePage.goto();

    const searchInput = await homePage.getSearchInput();
    await expect(searchInput).toBeVisible();

    await homePage.searchFor('ChatGPT');
    await expect(page).toHaveURL(/kesfet|search/i);
  });
});
