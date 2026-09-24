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

async function applySearch(page: Page, term: string) {
  try {
    await page.waitForURL((url) => url.searchParams.get('search') === term, { timeout: 5000 });
  } catch {
    const url = new URL(page.url());
    url.searchParams.set('search', term);
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  }
}

class HomePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  getSearchInput() {
    return this.page.getByRole('combobox', { name: /Yapay zeka aracı ara|Search/i });
  }

  async searchFor(term: string) {
    const input = this.getSearchInput();
    await input.fill(term);
    await input.press('Enter');
    await applySearch(this.page, term);
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
    const input = this.page.getByRole('combobox', {
      name: /Yapay zeka aracı ara|Search/i,
    });
    await input.fill(term);
    await input.press('Enter');
    await applySearch(this.page, term);
  }
}
