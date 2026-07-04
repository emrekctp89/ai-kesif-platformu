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

    // Check for 'Tüm Araçlar' link
    const kesfetLink = page.getByRole('link', { name: /Tüm Araçlar/i }).first();
    await expect(kesfetLink).toBeVisible();
  });

  test('navigation to Tum Araclar page works', async ({ page }) => {
    await page.goto('/');

    const kesfetLink = page.getByRole('link', { name: /Tüm Araçlar/i }).first();
    await kesfetLink.click();

    // The URL should change to /
    await expect(page).toHaveURL(/\//);

    // Verify a heading or element on page exists
    await expect(page.getByRole('heading', { name: /Yapay Zeka/i }).first()).toBeVisible();
  });
});
