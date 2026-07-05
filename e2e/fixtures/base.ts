import { test as base, expect } from '@playwright/test';

// Extend basic test by providing page objects
export const test = base.extend<{
  homePage: HomePage;
  discoverPage: DiscoverPage;
  toolDetailPage: ToolDetailPage;
}>({
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },
  discoverPage: async ({ page }, use) => {
    const discoverPage = new DiscoverPage(page);
    await use(discoverPage);
  },
  toolDetailPage: async ({ page }, use) => {
    const toolDetailPage = new ToolDetailPage(page);
    await use(toolDetailPage);
  },
});

export { expect } from '@playwright/test';

// ==================== PAGE OBJECTS ====================

class HomePage {
  constructor(private page: any) {}

  async goto() {
    await this.page.goto('/');
  }

  async getSearchInput() {
    return this.page.getByPlaceholder(/AI aracı ara|araç ara/i);
  }

  async searchFor(term: string) {
    const input = await this.getSearchInput();
    await input.fill(term);
    await this.page.keyboard.press('Enter');
  }
}

class DiscoverPage {
  constructor(private page: any) {}

  async goto() {
    await this.page.goto('/kesfet');
  }

  async getFirstToolCard() {
    return this.page.locator('[data-testid="tool-card"], .tool-card, article').first();
  }

  async search(term: string) {
    const searchInput = this.page.getByPlaceholder(/AI aracı ara|araç ara/i);
    await searchInput.fill(term);
    await this.page.waitForTimeout(600);
  }

  async getToolCount() {
    return this.page.locator('[data-testid="tool-card"], .tool-card, article').count();
  }
}

class ToolDetailPage {
  constructor(private page: any) {}

  async gotoFirstTool() {
    const discover = new DiscoverPage(this.page);
    await discover.goto();
    const firstTool = await discover.getFirstToolCard();
    await firstTool.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getHeading() {
    return this.page.locator('h1').first();
  }

  async getCompareButton() {
    return this.page.getByRole('button', { name: /Karşılaştır|Compare/i });
  }
}
