import { test, expect } from '@playwright/test';

test.describe('Ana Sayfa - AI Keşif Platformu', () => {
  test('Ana sayfa başarıyla yükleniyor', async ({ page }) => {
    await page.goto('/');

    // Başlık kontrolü
    await expect(page).toHaveTitle(/AI Keşif Platformu|AI Araçları/i);

    // Hero başlığı
    await expect(
      page.getByRole('heading', { name: /AI Araçlarını Keşfet|Keşfet/i })
    ).toBeVisible();
  });

  test('Arama inputu görünüyor', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByPlaceholder(/AI aracı ara|araç ara/i);
    await expect(searchInput).toBeVisible();
  });

  test('Kategoriler veya filtreler görünüyor', async ({ page }) => {
    await page.goto('/');

    // En az bir kategori butonu veya filtre olmalı
    const categoryButton = page.getByRole('button', { name: /Kategori|Filtre/i }).first();
    await expect(categoryButton.or(page.locator('[data-testid="category"]'))).toBeVisible();
  });
});
