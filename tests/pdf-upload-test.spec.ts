import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test('should upload PDF and process it', async ({ page }) => {
  // Listen for console errors and logs
  page.on('console', msg => {
    console.log(`Browser ${msg.type()}: ${msg.text()}`);
  });

  // Login first
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('rjoberlander@gmail.com');
  await page.getByLabel(/password/i).fill('Cookie123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // Check if the test PDF exists
  const pdfPath = '/Users/richard/Downloads/Labwork 2024.pdf';

  if (fs.existsSync(pdfPath)) {
    console.log('Found PDF file, attaching...');

    // Attach the PDF
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(pdfPath);

    // Verify file preview appears
    await expect(page.getByText('Labwork 2024.pdf')).toBeVisible({ timeout: 5000 });
    console.log('PDF file attached and visible');

    // Type a message
    const chatInput = page.getByTestId('chat-input');
    await chatInput.fill('help me save these vitals');

    // Click send
    await page.getByTestId('send-button').click();
    console.log('Send button clicked');

    // Wait for user message to appear
    await expect(page.getByTestId('message-user')).toBeVisible({ timeout: 5000 });
    console.log('User message visible');

    // Wait for AI response or error (longer timeout for processing)
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/pdf-processing-result.png', fullPage: true });

    // Check what messages are on the page
    const messages = await page.locator('[data-testid^="message-"]').all();
    console.log(`Found ${messages.length} messages`);

    for (const msg of messages) {
      const text = await msg.textContent();
      console.log('Message:', text?.slice(0, 200));
    }

    // Check if there's an assistant response
    const hasAssistantMsg = await page.getByTestId('message-assistant').isVisible().catch(() => false);
    console.log('Has assistant message:', hasAssistantMsg);

    if (hasAssistantMsg) {
      const assistantText = await page.getByTestId('message-assistant').first().textContent();
      console.log('Assistant response:', assistantText?.slice(0, 500));
    }
  } else {
    console.log('PDF not found, skipping test');
  }
});
