import { test, expect } from '../fixtures/base';

test.describe('Araç Detay Sayfası', () => {
  test('Bir araç detay sayfasına gidilebiliyor', async ({ toolDetailPage, page }) => {
    await toolDetailPage.gotoFirstTool();

    const heading = await toolDetailPage.getHeading();
    await expect(heading).toBeVisible();
  });

  test('Karşılaştır butonu görünüyor', async ({ toolDetailPage }) => {
    await toolDetailPage.gotoFirstTool();

    const compareBtn = await toolDetailPage.getCompareButton();
    await expect(compareBtn).toBeVisible();
  });
});
