const { test, expect } = require('@playwright/test');

test.describe('Paused payments', () => {
  test('membership page explains availability without checkout controls', async ({ page }) => {
    await page.goto('/uyelik', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('status').first()).toContainText(
      /Ödemeler yakında|Payments are coming/i
    );
    await expect(
      page.getByText(/Pro üyelik · Yakında|Pro membership · Coming soon/i)
    ).toBeVisible();
    await expect(
      page.locator('form').filter({ has: page.locator('input[name="priceId"]') })
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Pro.*geç|upgrade/i })).toHaveCount(0);
  });
});
