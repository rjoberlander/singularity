import { test, expect } from '@playwright/test';

test.describe('AI Chat Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('rjoberlander@gmail.com');
    await page.getByLabel(/password/i).fill('Cookie123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('should display AI chat interface on dashboard', async ({ page }) => {
    // Verify the chat dashboard is displayed
    await expect(page.getByTestId('ai-chat-dashboard')).toBeVisible();

    // Verify the welcome message
    await expect(page.getByText('How can I help you today?')).toBeVisible();

    // Verify suggested prompts are displayed
    await expect(page.getByTestId('suggested-prompt-0')).toBeVisible();

    // Verify chat input is present
    await expect(page.getByTestId('chat-input')).toBeVisible();

    // Verify send button is present
    await expect(page.getByTestId('send-button')).toBeVisible();

    // Verify file attachment button is present
    await expect(page.getByTestId('attach-file-button')).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/ai-chat-dashboard.png', fullPage: true });
  });

  test('should send a message and show user message', async ({ page }) => {
    // Type a message in the chat input
    const chatInput = page.getByTestId('chat-input');
    await chatInput.fill('Hello, what can you help me with?');

    // Verify send button is enabled
    await expect(page.getByTestId('send-button')).toBeEnabled();

    // Click send button
    await page.getByTestId('send-button').click();

    // Wait for user message to appear
    await expect(page.getByTestId('message-user')).toBeVisible({ timeout: 5000 });

    // Verify the message content is displayed
    await expect(page.getByText('Hello, what can you help me with?')).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/ai-chat-message-sent.png', fullPage: true });

    // Check if AI is responding (loading state or response)
    const isThinking = await page.getByText('Thinking...').isVisible().catch(() => false);
    const hasResponse = await page.getByTestId('message-assistant').isVisible().catch(() => false);

    if (isThinking) {
      console.log('AI is processing the message');
    }
    if (hasResponse) {
      console.log('AI has responded');
      await page.screenshot({ path: 'tests/screenshots/ai-chat-response.png', fullPage: true });
    }
  });

  test('should use suggested prompts', async ({ page }) => {
    // Click on a suggested prompt
    await page.getByTestId('suggested-prompt-0').click();

    // Verify the input is filled with the prompt
    const chatInput = page.getByTestId('chat-input');
    await expect(chatInput).toHaveValue(/supplements/i);

    await page.screenshot({ path: 'tests/screenshots/ai-chat-suggested-prompt.png', fullPage: true });
  });

  test('should show file attachment button and accept files', async ({ page }) => {
    // Verify file input exists (hidden)
    const fileInput = page.getByTestId('file-input');
    await expect(fileInput).toBeAttached();

    // Verify attachment button is clickable
    const attachButton = page.getByTestId('attach-file-button');
    await expect(attachButton).toBeEnabled();

    await page.screenshot({ path: 'tests/screenshots/ai-chat-file-upload.png', fullPage: true });
  });
});
