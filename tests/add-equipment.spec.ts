import { test, expect } from '@playwright/test';

const EQUIPMENT_DATA = [
  {
    name: 'iRestore Elite',
    brand: 'iRestore',
    model: 'LLLT Helmet',
    category: 'lllt',
    purpose: 'Hair loss treatment via photobiomodulation - stimulates cellular ATP production in follicles',
    usage_frequency: 'Daily',
    usage_timing: 'Morning, after shower',
    usage_duration: '25 minutes',
    usage_protocol: 'Part of "Big 4-5" hair stack alongside finasteride, minoxidil, ketoconazole, and microneedling. LLLT works via photobiomodulation.',
    contraindications: '',
    purchase_url: '',
    notes: '500 diodes, triple wavelength'
  },
  {
    name: 'Dr. Pen Ultima A6',
    brand: 'Dr. Pen',
    model: 'Ultima A6',
    category: 'microneedling',
    purpose: 'Scalp microneedling - creates microchannels that enhance minoxidil absorption ~2x',
    usage_frequency: 'Weekly',
    usage_timing: 'Evening',
    usage_duration: '10-15 minutes',
    usage_protocol: '1.0-1.5mm depth. Clinical data: 82% achieved moderate-to-marked regrowth with combo vs 39% minoxidil alone. Replace needle cartridges regularly.',
    contraindications: 'No minoxidil on microneedling day; resume 24 hours after',
    purchase_url: '',
    notes: 'Adjustable depth'
  },
  {
    name: 'Eight Sleep Pod',
    brand: 'Eight Sleep',
    model: 'Pod Pro',
    category: 'sleep',
    purpose: 'Sleep temperature regulation - addresses core body temperature for optimal sleep',
    usage_frequency: 'Daily',
    usage_timing: 'All night',
    usage_duration: 'All night',
    usage_protocol: 'Maintains optimal sleep temperature. Works synergistically with glycine (also lowers core temp). Can track sleep data.',
    contraindications: '',
    purchase_url: '',
    notes: 'Bed cooling/heating system'
  },
  {
    name: 'LED Face Mask',
    brand: '',
    model: '',
    category: 'skincare',
    purpose: 'Facial skincare - LED light therapy',
    usage_frequency: '3-5x/week',
    usage_timing: 'Evening, after retinol',
    usage_duration: '10-20 minutes',
    usage_protocol: 'Use after retinol application in PM routine.',
    contraindications: 'Stop use 5-7 days before professional laser/microneedling treatments',
    purchase_url: '',
    notes: ''
  }
];

test.describe('Equipment Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');

    // Fill login form
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Navigate to equipment page
    await page.click('a[href="/equipment"]');
    await page.waitForURL('**/equipment', { timeout: 10000 });

    // Wait for page to load
    await page.waitForTimeout(1000);
  });

  test('Add all equipment items', async ({ page }) => {
    for (const equipment of EQUIPMENT_DATA) {
      console.log(`Adding equipment: ${equipment.name}`);

      // Click Add Equipment button
      await page.click('button:has-text("Add Equipment")');

      // Wait for dialog to open
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

      // Fill in the form
      await page.fill('input#name', equipment.name);

      if (equipment.brand) {
        await page.fill('input#brand', equipment.brand);
      }

      if (equipment.model) {
        await page.fill('input#model', equipment.model);
      }

      // Select category
      if (equipment.category) {
        await page.click('[role="dialog"] button:has-text("Select category")');
        await page.waitForTimeout(300);
        // Click the category option
        const categoryLabel = equipment.category.charAt(0).toUpperCase() + equipment.category.slice(1);
        await page.click(`[role="option"]:has-text("${categoryLabel}")`);
      }

      if (equipment.purpose) {
        await page.fill('input#purpose', equipment.purpose);
      }

      if (equipment.usage_frequency) {
        await page.fill('input#usage_frequency', equipment.usage_frequency);
      }

      if (equipment.usage_timing) {
        await page.fill('input#usage_timing', equipment.usage_timing);
      }

      if (equipment.usage_duration) {
        await page.fill('input#usage_duration', equipment.usage_duration);
      }

      if (equipment.usage_protocol) {
        await page.fill('textarea#usage_protocol', equipment.usage_protocol);
      }

      if (equipment.contraindications) {
        await page.fill('textarea#contraindications', equipment.contraindications);
      }

      if (equipment.purchase_url) {
        await page.fill('input#purchase_url', equipment.purchase_url);
      }

      if (equipment.notes) {
        await page.fill('textarea#notes', equipment.notes);
      }

      // Take screenshot before submitting
      await page.screenshot({ path: `tests/screenshots/equipment-form-${equipment.name.replace(/\s+/g, '-').toLowerCase()}.png` });

      // Click Add Equipment button in dialog
      await page.click('[role="dialog"] button:has-text("Add Equipment")');

      // Wait for dialog to close and toast to appear
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });

      // Wait a bit for the equipment to be added
      await page.waitForTimeout(1000);

      console.log(`Successfully added: ${equipment.name}`);
    }

    // Take final screenshot showing all equipment
    await page.screenshot({ path: 'tests/screenshots/equipment-all-added.png' });

    // Verify all equipment items are visible
    for (const equipment of EQUIPMENT_DATA) {
      await expect(page.locator(`text=${equipment.name}`).first()).toBeVisible();
    }

    console.log('All equipment added successfully!');
  });
});
