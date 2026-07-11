import { test as base, Page } from '@playwright/test';

export const test = base.extend<{
  homePage: HomePage;
  discoverPage: DiscoverPage;
}>(
  {
    homePage: async ({ page }, use) => {
      await use(new HomePage(page));
    },
    discoverPage: async ({ page }, use) => {
      await use(new DiscoverPage(page));
    },
  }
);

export { expect } from '@playwright/test';

class HomePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  getSearchInput() {
    return this.page.getByRole('textbox', { name: /Yapay zeka aracı ara|Search/i });
  }

  async searchFor(term: string) {
    const input = this.getSearchInput();
    await input.fill(term);
    await input.press('Enter');
    await this.page.waitForURL((url) => url.searchParams.get('search') === term);
  }
}

class DiscoverPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  getToolCards() {
    return this.page.locator('main article');
  }

  async search(term: string) {
    const input = this.page.getByRole('textbox', {
      name: /Yapay zeka aracı ara|Search/i,
    });
    await input.fill(term);
    await input.press('Enter');
    await this.page.waitForURL((url) => url.searchParams.get('search') === term);
  }
}
