const { test, expect } = require('@playwright/test');

test.describe('Navigation and User Paths', () => {
  test('homepage has expected title and basic elements', async ({ page }) => {
    await page.goto('/');

    // Check title (Update this if your exact title differs)
    await expect(page).toHaveTitle(/AI Keşif/i);

    // Check if the main heading is visible
    const heading = page.getByRole('heading', { name: /Yapay Zeka/i });
    await expect(heading).toBeVisible();

    // Check if navigation links are present in the header
    const nav = page.locator('header'); // Assuming standard HTML5 header
    await expect(nav).toBeVisible();

    await expect(page.getByRole('main')).toBeVisible();
  });

  test('kategori bağlantısı gerçek hedef sayfaya gider', async ({ page, isMobile }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    if (isMobile) {
      await page.getByRole('button', { name: /menü|menu/i }).click();
    }

    const navigationRegion = isMobile
      ? page.getByRole('dialog')
      : page.getByRole('banner').getByRole('navigation');
    const categoriesLink = navigationRegion.getByRole('link', {
      name: /^(Kategoriler|Categories)$/i,
      exact: true,
    });
    await expect(categoriesLink).toHaveAttribute('href', /\/(?:en\/)?kategori$/);
    await categoriesLink.click();

    await expect(page).toHaveURL(/\/kategori(?:[/?#]|$)/);
    await expect(page.getByRole('main')).toBeVisible();
  });
});
