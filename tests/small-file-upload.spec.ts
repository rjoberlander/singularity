import { test, expect } from '@playwright/test';
import * as path from 'path';

test('should upload small text file and get AI response', async ({ page }) => {
  // Listen for console
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`Browser ${msg.type()}: ${msg.text()}`);
    }
  });

  // Login
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('rjoberlander@gmail.com');
  await page.getByLabel(/password/i).fill('Cookie123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // Attach the small text file
  const testFilePath = path.join(__dirname, 'test-lab-results.txt');
  const fileInput = page.getByTestId('file-input');
  await fileInput.setInputFiles(testFilePath);

  // Verify file preview appears
  await expect(page.getByText('test-lab-results.txt')).toBeVisible({ timeout: 5000 });
  console.log('File attached');

  // Type a message
  const chatInput = page.getByTestId('chat-input');
  await chatInput.fill('Please analyze these lab results and tell me if anything needs attention.');

  // Click send
  await page.getByTestId('send-button').click();
  console.log('Sent message');

  // Wait for user message
  await expect(page.getByTestId('message-user')).toBeVisible({ timeout: 5000 });

  // Wait for AI response (longer timeout for API call)
  try {
    await expect(page.getByTestId('message-assistant')).toBeVisible({ timeout: 60000 });
    console.log('Got AI response!');

    const responseText = await page.getByTestId('message-assistant').textContent();
    console.log('AI Response:', responseText?.slice(0, 500));

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/ai-response-success.png', fullPage: true });

    // Verify it's a meaningful response (not an error)
    expect(responseText).not.toContain('trouble processing');
    expect(responseText).not.toContain('API key');
  } catch (error) {
    await page.screenshot({ path: 'tests/screenshots/ai-response-error.png', fullPage: true });
    console.log('Error waiting for AI response');
    throw error;
  }
});
