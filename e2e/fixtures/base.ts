import { test as base, expect, Page } from '@playwright/test';

export const test = base.extend<{
  homePage: HomePage;
  discoverPage: DiscoverPage;
  toolDetailPage: ToolDetailPage;
}>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  discoverPage: async ({ page }, use) => {
    await use(new DiscoverPage(page));
  },
  toolDetailPage: async ({ page }, use) => {
    await use(new ToolDetailPage(page));
  },
});

export { expect } from '@playwright/test';

// ==================== PAGE OBJECTS ====================

class HomePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async getSearchInput() {
    return this.page.getByPlaceholder(/AI aracı ara|araç ara|Search/i);
  }

  async searchFor(term: string) {
    const input = await this.getSearchInput();
    await input.fill(term);
    await this.page.keyboard.press('Enter');
  }
}

class DiscoverPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/kesfet');
    await this.page.waitForLoadState('networkidle');
  }

  // Daha güvenli tool card locator
  getFirstToolCard() {
    return this.page.locator('a[href*="/tool"], [data-testid="tool-card"], article').first();
  }

  async search(term: string) {
    const searchInput = this.page.getByPlaceholder(/AI aracı ara|araç ara|Search/i);
    await searchInput.fill(term);
    await this.page.waitForTimeout(700);
  }

  async getToolCount() {
    return this.page.locator('a[href*="/tool"], [data-testid="tool-card"], article').count();
  }
}

class ToolDetailPage {
  constructor(private page: Page) {}

  async gotoFirstTool() {
    const discover = new DiscoverPage(this.page);
    await discover.goto();

    const firstTool = discover.getFirstToolCard();
    await firstTool.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getHeading() {
    return this.page.locator('h1').first();
  }

  async getCompareButton() {
    return this.page.getByRole('button', { name: /Karşılaştır|Compare|karşıla/i });
  }
}
