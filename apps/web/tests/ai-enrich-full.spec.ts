import { test, expect } from '@playwright/test';

test.describe('AI Enrichment Full Test', () => {
  test('facial-products AI enrichment - verify all fields populated', async ({ page }) => {
    // Track results
    const apiResponses: any[] = [];
    const consoleLogs: string[] = [];

    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Capture API responses
    page.on('response', async (response) => {
      if (response.url().includes('/ai/enrich-product/stream')) {
        try {
          const text = await response.text();
          apiResponses.push({ url: response.url(), status: response.status(), body: text });
        } catch (e) {
          // SSE responses may not have text
        }
      }
    });

    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Go to facial-products
    await page.goto('http://localhost:3000/facial-products');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click Populate by AI
    const populateButton = page.locator('button:has-text("Populate by AI")').first();
    await expect(populateButton).toBeVisible({ timeout: 5000 });
    await populateButton.click();
    await page.waitForTimeout(1000);

    // Click Fetch All with AI
    const fetchButton = page.locator('button:has-text("Fetch All with AI")');
    await expect(fetchButton).toBeVisible({ timeout: 5000 });
    await fetchButton.click();

    // Wait for completion - check for "saved" status or processing to finish
    console.log('Waiting for AI processing to complete...');

    // Wait up to 2 minutes for processing
    await page.waitForTimeout(90000);

    // Take screenshot of final state
    await page.screenshot({ path: 'test-results/ai-enrich-final.png', fullPage: true });

    // Analyze results - get all rows in the modal
    const rows = await page.locator('table tbody tr').all();
    console.log(`\n=== RESULTS: ${rows.length} products ===\n`);

    const results: any[] = [];
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i];
      const cells = await row.locator('td').all();

      if (cells.length >= 7) {
        const productName = await cells[1].textContent() || '';
        const status = await cells[2].textContent() || '';
        const brand = await cells[3].textContent() || '';
        const price = await cells[4].textContent() || '';
        const size = await cells[5].textContent() || '';
        const form = await cells[6].textContent() || '';
        const category = await cells[7]?.textContent() || '';

        results.push({
          product: productName.trim().substring(0, 40),
          status: status.trim(),
          brand: brand.trim(),
          price: price.trim(),
          size: size.trim(),
          form: form.trim(),
          category: category.trim(),
        });

        console.log(`${i + 1}. ${productName.trim().substring(0, 30)}`);
        console.log(`   Status: ${status.trim()}`);
        console.log(`   Brand: ${brand.trim() || '?'} | Price: ${price.trim() || '?'} | Size: ${size.trim() || '?'}`);
        console.log(`   Form: ${form.trim() || '?'} | Category: ${category.trim() || '?'}`);
        console.log('');
      }
    }

    // Summary statistics
    const saved = results.filter(r => r.status.includes('Saved')).length;
    const failed = results.filter(r => r.status.includes('Failed')).length;
    const missingPrice = results.filter(r => r.price === '?' || r.price === '').length;
    const missingSize = results.filter(r => r.size === '?' || r.size === '').length;

    console.log('=== SUMMARY ===');
    console.log(`Total: ${results.length}`);
    console.log(`Saved: ${saved}`);
    console.log(`Failed: ${failed}`);
    console.log(`Missing Price: ${missingPrice}`);
    console.log(`Missing Size: ${missingSize}`);

    // Check API responses for debugging
    console.log('\n=== API RESPONSE SAMPLES ===');
    apiResponses.slice(0, 2).forEach((resp, i) => {
      console.log(`Response ${i + 1}: Status ${resp.status}`);
      // Parse SSE data
      const lines = resp.body?.split('\n') || [];
      const dataLines = lines.filter((l: string) => l.startsWith('data: '));
      dataLines.slice(-3).forEach((line: string) => {
        try {
          const data = JSON.parse(line.replace('data: ', ''));
          console.log(`  ${data.step}: ${JSON.stringify(data).substring(0, 150)}`);
        } catch (e) {}
      });
    });
  });
});
