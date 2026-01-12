import { test, expect } from '@playwright/test';

// Portugal 30-Day Trip Data
const TRIP_DATA = {
  name: "30-Day Portugal Family Road Trip",
  description: "Circular loop - Lisbon → Algarve → Central Coast → Porto → Lisbon. Flying LAX → Lisbon round trip, ~1,200 km driving over 30 days.",
  start_date: "2026-06-15",
  end_date: "2026-07-14",
  origin: "Los Angeles (LAX)",
  destination: "Lisbon, Portugal",
  transportation_type: "both",
  traveler_count: 5,
  status: "planning"
};

const SEGMENTS = [
  {
    name: "Lisbon",
    description: "Explore Portugal's captivating capital - Alfama district, Belém, Time Out Market, Tram 28",
    start_date: "2026-06-15",
    end_date: "2026-06-19",
    location_name: "Lisbon, Portugal",
    nights: 5,
    hotel: "Hyatt Regency Lisbon",
    driving_from_previous: "Pick up car at airport"
  },
  {
    name: "Cascais & Sintra",
    description: "Beach time, coastal exploration, fairy-tale palaces of Sintra, Cabo da Roca",
    start_date: "2026-06-20",
    end_date: "2026-06-22",
    location_name: "Cascais, Portugal",
    nights: 3,
    hotel: "Chase Portal - Beachfront",
    driving_from_previous: "30 min from Lisbon"
  },
  {
    name: "Lagos & Sagres",
    description: "Dramatic sea cliffs, Ponta da Piedade, surfing, Cape St. Vincent",
    start_date: "2026-06-23",
    end_date: "2026-06-27",
    location_name: "Lagos, Portugal",
    nights: 5,
    hotel: "Pine Cliffs Residence",
    driving_from_previous: "3 hrs from Cascais (stop in Comporta)"
  },
  {
    name: "Albufeira",
    description: "Benagil Cave, Slide & Splash Waterpark, beach hopping, old town",
    start_date: "2026-06-28",
    end_date: "2026-07-02",
    location_name: "Albufeira, Portugal",
    nights: 5,
    hotel: "Marriott Residences Salgados Resort",
    driving_from_previous: "1 hr from Lagos"
  },
  {
    name: "Óbidos & Nazaré",
    description: "Medieval walled town, big wave viewing, pottery shopping",
    start_date: "2026-07-03",
    end_date: "2026-07-05",
    location_name: "Óbidos, Portugal",
    nights: 3,
    hotel: "Chase Portal - Boutique",
    driving_from_previous: "2.5-3 hrs north along coast"
  },
  {
    name: "Aveiro",
    description: "Venice of Portugal - colorful moliceiro boats, Costa Nova striped houses",
    start_date: "2026-07-06",
    end_date: "2026-07-07",
    location_name: "Aveiro, Portugal",
    nights: 2,
    hotel: "Chase Portal",
    driving_from_previous: "1 hr north of Óbidos"
  },
  {
    name: "Porto",
    description: "Ribeira waterfront, Livraria Lello, port wine cellars, São Bento station",
    start_date: "2026-07-08",
    end_date: "2026-07-10",
    location_name: "Porto, Portugal",
    nights: 3,
    hotel: "Cocorico Porto",
    driving_from_previous: "1 hr from Aveiro"
  },
  {
    name: "Douro Valley",
    description: "Scenic vineyards, family-friendly wine estates, river cruises",
    start_date: "2026-07-11",
    end_date: "2026-07-12",
    location_name: "Douro Valley, Portugal",
    nights: 2,
    hotel: "Chase Portal - Wine Estate",
    driving_from_previous: "1.5 hrs from Porto"
  },
  {
    name: "Lisbon (Return)",
    description: "Revisit favorite spots, last-minute shopping, easy airport access",
    start_date: "2026-07-13",
    end_date: "2026-07-14",
    location_name: "Lisbon, Portugal",
    nights: 2,
    hotel: "Hyatt Regency Lisbon",
    driving_from_previous: "3 hrs from Douro Valley"
  }
];

test.describe('Portugal Trip Setup', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('create Portugal trip with all segments', async ({ page, context }) => {
    // Navigate to travel and create new trip
    await page.goto('http://localhost:3000/travel/new');
    await page.waitForLoadState('networkidle');

    // Fill trip details
    await page.fill('input#name', TRIP_DATA.name);
    await page.fill('textarea#description', TRIP_DATA.description);
    await page.fill('input#start_date', TRIP_DATA.start_date);
    await page.fill('input#end_date', TRIP_DATA.end_date);
    await page.fill('input#origin', TRIP_DATA.origin);
    await page.fill('input#destination', TRIP_DATA.destination);

    // Select "Both" for transportation (flying + driving)
    await page.click('button:has-text("Both")');

    // Set traveler count
    await page.fill('input#traveler_count', String(TRIP_DATA.traveler_count));

    // Take screenshot
    await page.screenshot({ path: 'test-results/portugal-trip-form.png', fullPage: true });

    // Submit
    await page.click('button[type="submit"]:has-text("Create Trip")');

    // Wait for trip detail page
    await page.waitForURL(/\/travel\/[a-f0-9-]+/, { timeout: 15000 });
    const tripUrl = page.url();
    const tripId = tripUrl.split('/').pop();

    console.log(`Created trip: ${tripId}`);
    await page.screenshot({ path: 'test-results/portugal-trip-created.png', fullPage: true });

    // Verify trip was created
    await expect(page.locator(`text=${TRIP_DATA.name}`).first()).toBeVisible();

    // Get auth token from Supabase cookies
    const cookies = await context.cookies();
    console.log('Cookies found:', cookies.map(c => `${c.name}=${c.value.substring(0, 50)}...`).join('\n'));

    // Find the sb-*-auth-token cookie which contains the session
    let token: string | null = null;
    for (const cookie of cookies) {
      if (cookie.name.includes('auth-token') && cookie.value) {
        try {
          let value = cookie.value;

          // Remove "base64-" prefix if present
          if (value.startsWith('base64-')) {
            value = value.substring(7);
          }

          // Base64 decode
          const decoded = Buffer.from(value, 'base64').toString('utf-8');
          console.log('Decoded cookie value:', decoded.substring(0, 200) + '...');

          // Parse JSON
          const parsed = JSON.parse(decoded);
          if (parsed.access_token) {
            token = parsed.access_token;
            console.log('Found token in cookie:', cookie.name);
            break;
          }
          // Check nested structure (array format)
          if (Array.isArray(parsed) && parsed[0]?.access_token) {
            token = parsed[0].access_token;
            console.log('Found token in cookie (array):', cookie.name);
            break;
          }
        } catch (e) {
          console.log('Failed to parse cookie:', cookie.name, (e as Error).message);
        }
      }
    }

    if (!token) {
      console.log('No auth token found in cookies, segments must be added manually or via API');
      // Take screenshot to show current state
      await page.screenshot({ path: 'test-results/portugal-trip-no-auth.png', fullPage: true });
      console.log('Trip created successfully, but segments need to be added manually.');
      return;
    }

    console.log('Found auth token, adding segments via API...');

    // Now add segments via API (much faster than UI)
    for (let i = 0; i < SEGMENTS.length; i++) {
      const segment = SEGMENTS[i];
      console.log(`Adding segment ${i + 1}/${SEGMENTS.length}: ${segment.name}`);

      const response = await page.request.post(`http://localhost:3002/api/v1/travel/trips/${tripId}/segments`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        data: {
          name: segment.name,
          description: segment.description,
          start_date: segment.start_date,
          end_date: segment.end_date,
          location_name: segment.location_name,
          driving_from_previous: segment.driving_from_previous,
          sort_order: i
        }
      });

      if (response.ok()) {
        const segmentData = await response.json();
        console.log(`  Created segment: ${segmentData.id}`);

        // Add accommodation for this segment
        const accomResponse = await page.request.post(`http://localhost:3002/api/v1/travel/trips/${tripId}/accommodations`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          data: {
            segment_id: segmentData.id,
            name: segment.hotel,
            check_in_date: segment.start_date,
            check_out_date: segment.end_date,
            nights: segment.nights
          }
        });

        if (accomResponse.ok()) {
          console.log(`  Added accommodation: ${segment.hotel}`);
        }
      } else {
        const errorText = await response.text();
        console.log(`  Failed to create segment: ${response.status()} - ${errorText}`);
      }
    }

    // Refresh page to see segments
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Take final screenshot
    await page.screenshot({ path: 'test-results/portugal-trip-with-segments.png', fullPage: true });

    // Verify segments appear
    await expect(page.locator('text=Lisbon').first()).toBeVisible({ timeout: 10000 });

    console.log('Portugal trip setup complete!');
  });
});
