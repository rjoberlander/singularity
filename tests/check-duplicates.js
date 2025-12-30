const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.getByLabel(/email/i).fill('rjoberlander@gmail.com');
    await page.getByLabel(/password/i).fill('Cookie123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('Logged in');

    // Go to biomarkers to get auth context
    await page.goto('http://localhost:3000/biomarkers');
    await page.waitForLoadState('networkidle');

    // Get auth token
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name.includes('auth-token'));

    if (authCookie) {
      const decodedValue = decodeURIComponent(authCookie.value);
      let base64Part = decodedValue.startsWith('base64-') ? decodedValue.substring(7) : decodedValue;
      const padded = base64Part + '='.repeat((4 - base64Part.length % 4) % 4);
      const decoded = Buffer.from(padded, 'base64').toString();
      const parsed = JSON.parse(decoded);
      const token = parsed.access_token;

      // Fetch biomarkers
      const response = await page.evaluate(async (token) => {
        const res = await fetch('http://localhost:3001/api/v1/biomarkers?limit=1000', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        return res.json();
      }, token);

      if (response.success && response.data) {
        const biomarkers = response.data;
        console.log('\nTotal biomarkers in database:', biomarkers.length);

        // Check 1: Exact duplicates (same name + date + value)
        const exactGroups = new Map();
        biomarkers.forEach(b => {
          const key = b.name.toLowerCase() + '|' + b.date_tested + '|' + b.value;
          if (!exactGroups.has(key)) exactGroups.set(key, []);
          exactGroups.get(key).push(b);
        });

        let exactDupCount = 0;
        console.log('\n=== EXACT DUPLICATES (same name + date + value) ===');
        exactGroups.forEach((entries, key) => {
          if (entries.length > 1) {
            const [name, date, value] = key.split('|');
            console.log(`- ${entries[0].name} | Date: ${date} | Value: ${value} | ${entries.length} copies`);
            exactDupCount += entries.length - 1;
          }
        });
        if (exactDupCount === 0) console.log('None found');
        else console.log(`Total: ${exactDupCount} duplicates to remove`);

        // Check 2: Same name + date (possibly different values)
        const sameDateGroups = new Map();
        biomarkers.forEach(b => {
          const key = b.name.toLowerCase() + '|' + b.date_tested;
          if (!sameDateGroups.has(key)) sameDateGroups.set(key, []);
          sameDateGroups.get(key).push(b);
        });

        let sameDateCount = 0;
        console.log('\n=== SAME NAME + SAME DATE (may have different values) ===');
        sameDateGroups.forEach((entries, key) => {
          if (entries.length > 1) {
            const [name, date] = key.split('|');
            const values = entries.map(e => e.value).join(', ');
            console.log(`- ${entries[0].name} | Date: ${date} | Values: [${values}] | ${entries.length} entries`);
            sameDateCount += entries.length - 1;
          }
        });
        if (sameDateCount === 0) console.log('None found');
        else console.log(`Total: ${sameDateCount} potential duplicates`);

        // Show sample of biomarkers
        console.log('\n=== SAMPLE OF BIOMARKERS ===');
        const sample = biomarkers.slice(0, 10);
        sample.forEach(b => {
          console.log(`${b.name} | ${b.date_tested} | ${b.value} ${b.unit}`);
        });
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }

  await browser.close();
})();
