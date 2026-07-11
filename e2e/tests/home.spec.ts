import { test, expect } from '../fixtures/base';

test.describe('Ana Sayfa', () => {
  test('ana sayfa temel kullanıcı kontrolleriyle yükleniyor', async ({ homePage, page }) => {
    await homePage.goto();

    await expect(page).toHaveTitle(/AI Keşif/i);
    await expect(page.getByRole('heading', { name: /AI Araçlarını Keşfet|Discover/i })).toBeVisible();
    await expect(homePage.getSearchInput()).toBeVisible();
    await expect(page.getByRole('button', { name: /Filtrele|Filter/i })).toBeVisible();
  });

  test('arama aynı sayfada araçları filtreliyor', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.searchFor('ChatGPT');

    await expect(page.locator('main article').filter({ hasText: 'ChatGPT' })).toBeVisible();
  });

  test('geri bildirim kontrolü mobil ve masaüstünde erişilebilir', async ({ homePage, page }) => {
    await homePage.goto();

    await expect(page.getByRole('button', { name: /Geri Bildirim Gönder/i })).toBeVisible();
  });
});
