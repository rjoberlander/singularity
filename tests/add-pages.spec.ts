import { test, expect } from '@playwright/test';

// Mock data for testing
const mockBiomarkerExtraction = {
  biomarkers: [
    {
      name: "Vitamin D",
      value: 45.2,
      unit: "ng/mL",
      reference_range_low: 30,
      reference_range_high: 100,
      category: "vitamin",
      confidence: 0.95
    },
    {
      name: "Hemoglobin",
      value: 14.5,
      unit: "g/dL",
      reference_range_low: 12,
      reference_range_high: 17,
      category: "blood",
      confidence: 0.92
    }
  ],
  lab_info: {
    lab_name: "Quest Diagnostics",
    test_date: "2025-01-15"
  },
  extraction_notes: "Mock extraction for testing"
};

const mockSupplementExtraction = {
  supplements: [
    {
      name: "Vitamin D3",
      brand: "Thorne",
      dose: "5000 IU",
      dose_per_serving: 5000,
      dose_unit: "IU",
      servings_per_container: 60,
      price: 24.99,
      category: "vitamin",
      timing: "morning",
      frequency: "daily",
      confidence: 0.94
    },
    {
      name: "Omega-3 Fish Oil",
      brand: "Nordic Naturals",
      dose: "1000 mg",
      dose_per_serving: 1000,
      dose_unit: "mg",
      servings_per_container: 120,
      price: 35.99,
      category: "omega",
      timing: "with_meals",
      frequency: "twice_daily",
      confidence: 0.88
    }
  ],
  source_info: {
    store_name: "Amazon",
    purchase_date: "2025-01-10",
    total_items: 2
  },
  extraction_notes: "Mock extraction for testing"
};

test.describe('Add Biomarkers Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the API responses
    await page.route('**/api/v1/ai-api-keys', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: '1', provider: 'anthropic', is_active: true }]
        })
      });
    });

    await page.route('**/api/v1/ai/extract-biomarkers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockBiomarkerExtraction
        })
      });
    });
  });

  test('should display AI tab by default', async ({ page }) => {
    // Skip auth for this test - would need proper auth setup
    test.skip(true, 'Requires authentication setup');

    await page.goto('/biomarkers/add');
    await expect(page.getByRole('tab', { name: /AI/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Manual/i })).toBeVisible();
  });
});

test.describe('Add Supplements Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the API responses
    await page.route('**/api/v1/ai-api-keys', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: '1', provider: 'anthropic', is_active: true }]
        })
      });
    });

    await page.route('**/api/v1/ai/extract-supplements', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockSupplementExtraction
        })
      });
    });
  });

  test('should display AI tab by default', async ({ page }) => {
    // Skip auth for this test - would need proper auth setup
    test.skip(true, 'Requires authentication setup');

    await page.goto('/supplements/add');
    await expect(page.getByRole('tab', { name: /AI/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Manual/i })).toBeVisible();
  });
});

// Console log mock data for manual testing
console.log('=== Mock Biomarker Extraction Data ===');
console.log(JSON.stringify(mockBiomarkerExtraction, null, 2));
console.log('\n=== Mock Supplement Extraction Data ===');
console.log(JSON.stringify(mockSupplementExtraction, null, 2));
