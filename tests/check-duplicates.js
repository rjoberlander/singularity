const { chromium } = require('playwright');

// Import biomarker reference data (copy the relevant part)
const BIOMARKER_REFERENCE = [
  { name: "Vitamin D, 25-Hydroxy", aliases: ["Vitamin D", "25-OH Vitamin D", "25-Hydroxyvitamin D", "25(OH)D", "Calcidiol"] },
  { name: "Cholesterol, Total", aliases: ["Total Cholesterol", "TC"] },
  { name: "LDL Cholesterol", aliases: ["LDL", "LDL-C", "Low-Density Lipoprotein"] },
  { name: "HDL Cholesterol", aliases: ["HDL", "HDL-C", "High-Density Lipoprotein"] },
];

function normalizeBiomarkerName(name) {
  const lowerName = name.toLowerCase().trim();
  const ref = BIOMARKER_REFERENCE.find(r => {
    if (r.name.toLowerCase() === lowerName) return true;
    return r.aliases.some(alias => alias.toLowerCase() === lowerName);
  });
  return ref ? ref.name : name;
}

function getYearMonth(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3000/login');
    await page.getByLabel(/email/i).fill('rjoberlander@gmail.com');
    await page.getByLabel(/password/i).fill('Cookie123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('Logged in');

    await page.goto('http://localhost:3000/biomarkers');
    await page.waitForLoadState('networkidle');

    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name.includes('auth-token'));

    if (authCookie) {
      const decodedValue = decodeURIComponent(authCookie.value);
      let base64Part = decodedValue.startsWith('base64-') ? decodedValue.substring(7) : decodedValue;
      const padded = base64Part + '='.repeat((4 - base64Part.length % 4) % 4);
      const decoded = Buffer.from(padded, 'base64').toString();
      const parsed = JSON.parse(decoded);
      const token = parsed.access_token;

      const response = await page.evaluate(async (token) => {
        const res = await fetch('http://localhost:3001/api/v1/biomarkers?limit=1000', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        return res.json();
      }, token);

      if (response.success && response.data) {
        const biomarkers = response.data;
        console.log('\nTotal biomarkers:', biomarkers.length);

        // Check with normalized names AND month-based matching
        const groups = new Map();
        biomarkers.forEach(b => {
          const normalizedName = normalizeBiomarkerName(b.name);
          const yearMonth = getYearMonth(b.date_tested);
          const key = `${normalizedName.toLowerCase()}|${yearMonth}|${b.value}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(b);
        });

        console.log('\n=== DUPLICATES DETECTED (same name + month + value) ===');
        let totalDupes = 0;
        groups.forEach((entries, key) => {
          if (entries.length > 1) {
            const [name, yearMonth, value] = key.split('|');
            console.log(`\n${entries[0].name} (normalized: ${normalizeBiomarkerName(entries[0].name)})`);
            console.log(`  Month: ${yearMonth} | Value: ${value}`);
            console.log(`  Entries: ${entries.length}`);
            entries.forEach((e, i) => {
              console.log(`    ${i+1}. "${e.name}" - Date: ${e.date_tested} - ID: ${e.id.substring(0,8)}...`);
            });
            totalDupes += entries.length - 1;
          }
        });

        if (totalDupes === 0) {
          console.log('No duplicates found');
        } else {
          console.log(`\n=== TOTAL DUPLICATES TO REMOVE: ${totalDupes} ===`);
        }
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }

  await browser.close();
})();
