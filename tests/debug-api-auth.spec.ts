import { test, expect } from '@playwright/test';

test('debug API authentication', async ({ page }) => {
  // Capture all network requests
  const requests: { url: string; headers: Record<string, string> }[] = [];

  page.on('request', request => {
    if (request.url().includes('localhost:3001')) {
      requests.push({
        url: request.url(),
        headers: request.headers()
      });
    }
  });

  page.on('response', async response => {
    if (response.url().includes('localhost:3001')) {
      console.log(`API Response: ${response.status()} ${response.url()}`);
      if (response.status() === 401) {
        try {
          const body = await response.json();
          console.log('401 Response body:', JSON.stringify(body, null, 2));
        } catch {}
      }
    }
  });

  // Login
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('rjoberlander@gmail.com');
  await page.getByLabel(/password/i).fill('Cookie123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // Wait for any API calls to complete
  await page.waitForTimeout(2000);

  // Check session in browser
  const sessionInfo = await page.evaluate(async () => {
    // @ts-ignore
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      // @ts-ignore
      window.__NEXT_DATA__?.runtimeConfig?.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      // @ts-ignore
      window.__NEXT_DATA__?.runtimeConfig?.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    const { data } = await supabase.auth.getSession();
    return {
      hasSession: !!data?.session,
      hasToken: !!data?.session?.access_token,
      tokenPreview: data?.session?.access_token?.substring(0, 50) + '...'
    };
  });

  console.log('Session info from browser:', sessionInfo);

  // Log all API requests made
  console.log('API requests made:');
  for (const req of requests) {
    console.log(`  ${req.url}`);
    console.log(`    Authorization: ${req.headers.authorization?.substring(0, 50) || 'NONE'}...`);
  }

  // Type a simple message to trigger an API call
  const chatInput = page.getByTestId('chat-input');
  await chatInput.fill('hello');
  await page.getByTestId('send-button').click();

  // Wait for API call
  await page.waitForTimeout(3000);

  // Log API requests after sending
  console.log('API requests after send:');
  for (const req of requests) {
    console.log(`  ${req.url}`);
    const authHeader = req.headers.authorization;
    if (authHeader) {
      console.log(`    Authorization: Bearer ${authHeader.replace('Bearer ', '').substring(0, 30)}...`);
    } else {
      console.log(`    Authorization: MISSING!`);
    }
  }
});
