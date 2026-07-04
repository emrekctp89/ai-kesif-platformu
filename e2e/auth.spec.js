const { test, expect } = require('@playwright/test');

test.describe('Authentication Flows', () => {
  test('login page has expected inputs and buttons', async ({ page }) => {
    await page.goto('/login');

    // Check if email input exists
    const emailInput = page.getByPlaceholder(/email/i).or(page.locator('input[type="email"]'));
    await expect(emailInput).toBeVisible();

    // Check if password input exists
    const passwordInput = page.getByPlaceholder(/şifre/i).or(page.locator('input[type="password"]'));
    await expect(passwordInput).toBeVisible();

    // Check if login button exists
    const loginBtn = page.getByRole('button', { name: /Giriş Yap/i });
    await expect(loginBtn).toBeVisible();
  });

  test('register page has expected inputs and link to login', async ({ page }) => {
    await page.goto('/signup');

    // Check for inputs
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Check if there is a link back to the login page
    const loginLink = page.getByRole('link', { name: /Giriş Yap/i });
    await expect(loginLink).toBeVisible();
  });
});
