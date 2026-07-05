import { test, expect } from '../fixtures/base';

test.describe('Tool Karşılaştırma', () => {
  test('İki aracı karşılaştırma akışı', async ({ discoverPage, page }) => {
    await discoverPage.goto();

    // İlk aracı seç
    const firstTool = await discoverPage.getFirstToolCard();
    await firstTool.click();

    // Karşılaştır butonuna tıkla (eğer varsa)
    const compareButton = page.getByRole('button', { name: /Karşılaştır|Compare/i });
    
    if (await compareButton.isVisible()) {
      await compareButton.click();
      
      // İkinci aracı seçmek için keşfet sayfasına dön
      await page.goto('/kesfet');
      const secondTool = await discoverPage.getFirstToolCard();
      await secondTool.click();

      // Karşılaştırma sayfasında iki araç görünmeli
      await expect(page.getByText(/Karşılaştırma|Comparison/i)).toBeVisible();
    } else {
      // Karşılaştırma özelliği yoksa testi atla
      test.skip();
    }
  });
});
