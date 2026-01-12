import { test, expect } from '@playwright/test';

// Key activities from each city guide
const CITY_ACTIVITIES: Record<string, { day: number; activities: Array<{ name: string; type: string; description: string; time_block: string }> }[]> = {
  'Lisbon': [
    {
      day: 1,
      activities: [
        { name: 'Arrive at Lisbon Airport', type: 'transport', description: 'Pick up rental car at LIS airport', time_block: 'morning' },
        { name: 'Check into Hyatt Regency Lisbon', type: 'accommodation', description: 'Belém district, river views', time_block: 'midday' },
        { name: 'Pastéis de Belém', type: 'restaurant', description: 'Famous custard tarts since 1837', time_block: 'afternoon' },
        { name: 'Belém Tower', type: 'landmark', description: 'UNESCO World Heritage Site, iconic Manueline architecture', time_block: 'afternoon' },
      ]
    },
    {
      day: 2,
      activities: [
        { name: 'Alfama District Walk', type: 'activity', description: 'Explore medieval streets, viewpoints, and fado houses', time_block: 'morning' },
        { name: 'São Jorge Castle', type: 'landmark', description: 'Moorish castle with panoramic city views', time_block: 'midday' },
        { name: 'Tram 28 Ride', type: 'transport', description: 'Iconic yellow tram through historic neighborhoods', time_block: 'afternoon' },
        { name: 'Time Out Market', type: 'restaurant', description: 'Food hall with best of Lisbon cuisine', time_block: 'evening' },
      ]
    },
    {
      day: 3,
      activities: [
        { name: 'Jerónimos Monastery', type: 'landmark', description: 'Masterpiece of Manueline architecture, UNESCO site', time_block: 'morning' },
        { name: 'Oceanário de Lisboa', type: 'activity', description: 'One of Europe\'s best aquariums, great for kids', time_block: 'afternoon' },
        { name: 'LX Factory', type: 'activity', description: 'Creative hub with shops, restaurants, rooftop views', time_block: 'evening' },
      ]
    },
    {
      day: 4,
      activities: [
        { name: 'Sintra Day Trip', type: 'activity', description: 'Fairy-tale palaces and romantic gardens', time_block: 'morning' },
        { name: 'Pena Palace', type: 'landmark', description: 'Colorful Romanticist castle on hilltop', time_block: 'morning' },
        { name: 'Quinta da Regaleira', type: 'landmark', description: 'Initiation well and mystical gardens', time_block: 'afternoon' },
        { name: 'Sintra National Palace', type: 'landmark', description: 'Medieval royal residence with iconic chimneys', time_block: 'afternoon' },
      ]
    },
    {
      day: 5,
      activities: [
        { name: 'Belém Cultural Circuit', type: 'activity', description: 'MAAT, CCB, Monument to Discoveries', time_block: 'morning' },
        { name: 'Jardim da Estrela', type: 'activity', description: 'Beautiful park, great for kids to play', time_block: 'afternoon' },
        { name: 'Fado Show', type: 'activity', description: 'Traditional Portuguese music in Alfama', time_block: 'evening' },
      ]
    },
  ],
  'Cascais & Sintra': [
    {
      day: 6,
      activities: [
        { name: 'Drive to Cascais', type: 'transport', description: '30 min coastal drive from Lisbon', time_block: 'morning' },
        { name: 'Cascais Beach', type: 'beach', description: 'Relax at the main town beach', time_block: 'afternoon' },
        { name: 'Old Town Exploration', type: 'activity', description: 'Charming streets, shops, seafood restaurants', time_block: 'evening' },
      ]
    },
    {
      day: 7,
      activities: [
        { name: 'Cabo da Roca', type: 'landmark', description: 'Westernmost point of continental Europe', time_block: 'morning' },
        { name: 'Guincho Beach', type: 'beach', description: 'Wild Atlantic beach, popular with surfers', time_block: 'afternoon' },
        { name: 'Boca do Inferno', type: 'landmark', description: 'Hell\'s Mouth - dramatic coastal cliffs', time_block: 'afternoon' },
      ]
    },
    {
      day: 8,
      activities: [
        { name: 'Bike Path to Lisbon', type: 'activity', description: 'Scenic coastal cycling route', time_block: 'morning' },
        { name: 'Estoril Casino Gardens', type: 'activity', description: 'James Bond inspiration, beautiful gardens', time_block: 'afternoon' },
        { name: 'Seafood Dinner', type: 'restaurant', description: 'Fresh catch at local restaurant', time_block: 'evening' },
      ]
    },
  ],
  'Lagos & Sagres': [
    {
      day: 9,
      activities: [
        { name: 'Drive to Lagos', type: 'transport', description: '3 hrs from Cascais via A2, lunch stop in Comporta', time_block: 'morning' },
        { name: 'Lagos Old Town', type: 'activity', description: 'Explore historic center within 16th-century walls', time_block: 'afternoon' },
        { name: 'Praia da Batata', type: 'beach', description: 'Town beach with golden cliffs', time_block: 'afternoon' },
      ]
    },
    {
      day: 10,
      activities: [
        { name: 'Ponta da Piedade', type: 'landmark', description: 'Spectacular golden cliffs and sea stacks', time_block: 'morning' },
        { name: 'Boat Tour', type: 'activity', description: 'Explore sea caves and grottoes by boat', time_block: 'morning' },
        { name: 'Praia Dona Ana', type: 'beach', description: 'One of Europe\'s most beautiful beaches', time_block: 'afternoon' },
        { name: 'Praia do Camilo', type: 'beach', description: '200-step stairway to paradise cove', time_block: 'afternoon' },
      ]
    },
    {
      day: 11,
      activities: [
        { name: 'Sagres Day Trip', type: 'activity', description: 'End of the world exploration', time_block: 'morning' },
        { name: 'Cape St. Vincent', type: 'landmark', description: 'Southwesternmost point of Europe', time_block: 'morning' },
        { name: 'Sagres Fortress', type: 'landmark', description: 'Prince Henry the Navigator\'s school', time_block: 'afternoon' },
        { name: 'Surfing Lesson', type: 'activity', description: 'Beginner-friendly waves at Sagres beaches', time_block: 'afternoon' },
      ]
    },
    {
      day: 12,
      activities: [
        { name: 'Meia Praia', type: 'beach', description: '5km stretch of golden sand, water sports', time_block: 'morning' },
        { name: 'Lagos Zoo', type: 'activity', description: 'Family-friendly zoo experience', time_block: 'afternoon' },
        { name: 'Slave Market Museum', type: 'museum', description: 'Important historical site, Europe\'s first slave market', time_block: 'afternoon' },
      ]
    },
    {
      day: 13,
      activities: [
        { name: 'Kayaking at Ponta da Piedade', type: 'activity', description: 'Paddle through sea caves and grottoes', time_block: 'morning' },
        { name: 'Igreja de Santo António', type: 'landmark', description: 'Algarve\'s finest baroque church', time_block: 'afternoon' },
        { name: 'Lagos Marina', type: 'activity', description: 'Sunset stroll, restaurants, boat watching', time_block: 'evening' },
      ]
    },
  ],
  'Albufeira': [
    {
      day: 14,
      activities: [
        { name: 'Drive to Albufeira', type: 'transport', description: '1 hr from Lagos along coastal A22', time_block: 'morning' },
        { name: 'Check into Marriott Salgados', type: 'accommodation', description: '10 outdoor pools, kids club', time_block: 'midday' },
        { name: 'Resort Exploration', type: 'activity', description: 'Pool time, kids club orientation', time_block: 'afternoon' },
      ]
    },
    {
      day: 15,
      activities: [
        { name: 'Benagil Cave Boat Tour', type: 'activity', description: 'Famous sea cave with dome ceiling and beach', time_block: 'morning' },
        { name: 'Praia da Marinha', type: 'beach', description: 'One of the most iconic Algarve beaches', time_block: 'afternoon' },
        { name: 'Carvoeiro', type: 'activity', description: 'Charming fishing village, cliff walks', time_block: 'afternoon' },
      ]
    },
    {
      day: 16,
      activities: [
        { name: 'Slide & Splash Waterpark', type: 'activity', description: 'Major attraction for kids, full day fun', time_block: 'morning' },
        { name: 'Resort Pool Time', type: 'activity', description: 'Relax at one of 10 pools', time_block: 'afternoon' },
      ]
    },
    {
      day: 17,
      activities: [
        { name: 'Praia da Falésia', type: 'beach', description: '6km of dramatic red-cliff beaches', time_block: 'morning' },
        { name: 'Albufeira Old Town', type: 'activity', description: 'Cobblestone streets, whitewashed buildings', time_block: 'afternoon' },
        { name: 'Praia dos Pescadores', type: 'beach', description: 'Fisherman\'s Beach in town center', time_block: 'afternoon' },
      ]
    },
    {
      day: 18,
      activities: [
        { name: 'Zoomarine', type: 'activity', description: 'Marine theme park with dolphins', time_block: 'morning' },
        { name: 'Ria Formosa Boat Trip', type: 'activity', description: 'Nature reserve, flamingos, clam picking', time_block: 'afternoon' },
      ]
    },
  ],
  'Óbidos & Nazaré': [
    {
      day: 19,
      activities: [
        { name: 'Drive to Óbidos', type: 'transport', description: '2.5-3 hrs north along coast', time_block: 'morning' },
        { name: 'Óbidos Medieval Town', type: 'activity', description: 'Walk the walls, chocolate shops, ginjinha', time_block: 'afternoon' },
        { name: 'Castle Walls Walk', type: 'activity', description: '1.5km walk atop medieval fortifications', time_block: 'afternoon' },
      ]
    },
    {
      day: 20,
      activities: [
        { name: 'Nazaré Day Trip', type: 'activity', description: 'Big wave surfing capital', time_block: 'morning' },
        { name: 'Farol da Nazaré', type: 'landmark', description: 'Lighthouse with big wave viewing platform', time_block: 'morning' },
        { name: 'Nazaré Beach', type: 'beach', description: 'Traditional fishing village beach', time_block: 'afternoon' },
        { name: 'Sítio Funicular', type: 'activity', description: 'Funicular to cliff-top old town', time_block: 'afternoon' },
      ]
    },
    {
      day: 21,
      activities: [
        { name: 'Caldas da Rainha', type: 'activity', description: 'Pottery shopping, Bordallo Pinheiro ceramics', time_block: 'morning' },
        { name: 'Óbidos Lagoon', type: 'activity', description: 'Kitesurfing spot, nature walks', time_block: 'afternoon' },
      ]
    },
  ],
  'Aveiro': [
    {
      day: 22,
      activities: [
        { name: 'Drive to Aveiro', type: 'transport', description: '1 hr north of Óbidos', time_block: 'morning' },
        { name: 'Moliceiro Boat Ride', type: 'activity', description: 'Colorful traditional boats on canals', time_block: 'afternoon' },
        { name: 'Art Nouveau Architecture', type: 'activity', description: 'Walk to see beautiful buildings', time_block: 'afternoon' },
        { name: 'Ovos Moles', type: 'restaurant', description: 'Try famous local egg yolk sweets', time_block: 'afternoon' },
      ]
    },
    {
      day: 23,
      activities: [
        { name: 'Costa Nova', type: 'activity', description: 'Famous striped beach houses, photo ops', time_block: 'morning' },
        { name: 'Costa Nova Beach', type: 'beach', description: 'Wide sandy beach with colorful backdrop', time_block: 'morning' },
        { name: 'Fish Market', type: 'activity', description: 'Fresh seafood, local atmosphere', time_block: 'afternoon' },
      ]
    },
  ],
  'Porto': [
    {
      day: 24,
      activities: [
        { name: 'Drive to Porto', type: 'transport', description: '1 hr from Aveiro', time_block: 'morning' },
        { name: 'Ribeira District', type: 'activity', description: 'UNESCO waterfront, colorful houses', time_block: 'afternoon' },
        { name: 'Dom Luís I Bridge', type: 'landmark', description: 'Walk the iconic double-deck iron bridge', time_block: 'afternoon' },
        { name: 'Port Wine Tasting', type: 'activity', description: 'Vila Nova de Gaia cellars', time_block: 'evening' },
      ]
    },
    {
      day: 25,
      activities: [
        { name: 'Livraria Lello', type: 'landmark', description: 'Harry Potter inspiration, stunning bookstore', time_block: 'morning' },
        { name: 'Clérigos Tower', type: 'landmark', description: '225 steps to panoramic city views', time_block: 'morning' },
        { name: 'São Bento Station', type: 'landmark', description: '20,000 azulejo tiles depicting history', time_block: 'afternoon' },
        { name: 'Francesinha Lunch', type: 'restaurant', description: 'Porto\'s famous sandwich', time_block: 'midday' },
      ]
    },
    {
      day: 26,
      activities: [
        { name: 'Douro River Cruise', type: 'activity', description: '6 bridges cruise, wine country views', time_block: 'morning' },
        { name: 'Crystal Palace Gardens', type: 'activity', description: 'Beautiful park with river views', time_block: 'afternoon' },
        { name: 'Foz do Douro', type: 'activity', description: 'Beach district, sunset walk', time_block: 'evening' },
      ]
    },
  ],
  'Douro Valley': [
    {
      day: 27,
      activities: [
        { name: 'Drive to Douro Valley', type: 'transport', description: '1.5 hrs from Porto, scenic route', time_block: 'morning' },
        { name: 'Quinta Visit', type: 'activity', description: 'Wine estate tour and tasting', time_block: 'afternoon' },
        { name: 'Vineyard Views', type: 'activity', description: 'UNESCO terraced vineyards', time_block: 'afternoon' },
      ]
    },
    {
      day: 28,
      activities: [
        { name: 'Pinhão', type: 'activity', description: 'Heart of port wine region, azulejo station', time_block: 'morning' },
        { name: 'River Activities', type: 'activity', description: 'Kayaking, boat rides on Douro', time_block: 'afternoon' },
        { name: 'Wine Estate Dinner', type: 'restaurant', description: 'Farm-to-table at quinta', time_block: 'evening' },
      ]
    },
  ],
  'Lisbon (Return)': [
    {
      day: 29,
      activities: [
        { name: 'Drive to Lisbon', type: 'transport', description: '3 hrs from Douro Valley via A1', time_block: 'morning' },
        { name: 'Revisit Favorites', type: 'activity', description: 'Return to best spots from Day 1-5', time_block: 'afternoon' },
        { name: 'Last Shopping', type: 'activity', description: 'Souvenirs, azulejo tiles, cork products', time_block: 'afternoon' },
      ]
    },
    {
      day: 30,
      activities: [
        { name: 'Pack and Checkout', type: 'activity', description: 'Prepare for departure', time_block: 'morning' },
        { name: 'Airport Return', type: 'transport', description: 'Return rental car, check-in for flight', time_block: 'afternoon' },
        { name: 'Fly Home', type: 'transport', description: 'LIS → LAX', time_block: 'evening' },
      ]
    },
  ],
};

test.describe('Portugal Trip Activities', () => {
  test.setTimeout(180000); // 3 minutes

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('add days and activities to Portugal trip', async ({ page, context }) => {
    // Navigate to travel page
    await page.goto('http://localhost:3000/travel');
    await page.waitForLoadState('networkidle');

    // Find the Portugal trip
    const tripLink = page.locator('text=30-Day Portugal Family Road Trip').first();
    await expect(tripLink).toBeVisible({ timeout: 10000 });
    await tripLink.click();

    // Wait for trip detail page
    await page.waitForURL(/\/travel\/[a-f0-9-]+/, { timeout: 10000 });
    const tripUrl = page.url();
    const tripId = tripUrl.split('/').pop();

    console.log(`Found trip: ${tripId}`);

    // Get auth token
    const cookies = await context.cookies();
    let token: string | null = null;
    for (const cookie of cookies) {
      if (cookie.name.includes('auth-token') && cookie.value) {
        try {
          let value = cookie.value;
          if (value.startsWith('base64-')) {
            value = value.substring(7);
          }
          const decoded = Buffer.from(value, 'base64').toString('utf-8');
          const parsed = JSON.parse(decoded);
          if (parsed.access_token) {
            token = parsed.access_token;
            break;
          }
        } catch (e) {}
      }
    }

    if (!token) {
      console.log('No auth token found');
      return;
    }

    // Get segments
    const segmentsResponse = await page.request.get(`http://localhost:3002/api/v1/travel/trips/${tripId}/segments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!segmentsResponse.ok()) {
      console.log('Failed to get segments');
      return;
    }

    const segmentsResult = await segmentsResponse.json();
    const segments = segmentsResult.data || [];
    console.log(`Found ${segments.length} segments`);

    // Add days and activities for each segment
    let totalDays = 0;
    let totalActivities = 0;

    for (const segment of segments) {
      const cityActivities = CITY_ACTIVITIES[segment.name];
      if (!cityActivities) {
        console.log(`No activities defined for segment: ${segment.name}`);
        continue;
      }

      console.log(`Adding activities for ${segment.name}...`);

      for (const dayData of cityActivities) {
        // Create day
        const dayResponse = await page.request.post(`http://localhost:3002/api/v1/travel/trips/${tripId}/days`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          data: {
            segment_id: segment.id,
            date: new Date(2026, 5, dayData.day + 14).toISOString().split('T')[0], // June 15 + day offset
            day_number: dayData.day,
            title: `Day ${dayData.day}`,
            sort_order: dayData.day
          }
        });

        if (!dayResponse.ok()) {
          console.log(`  Failed to create day ${dayData.day}: ${dayResponse.status()}`);
          continue;
        }

        const dayResult = await dayResponse.json();
        const day = dayResult.data || dayResult;
        totalDays++;
        console.log(`  Created Day ${dayData.day} (${day.id})`);

        // Add activities to day
        for (let i = 0; i < dayData.activities.length; i++) {
          const activity = dayData.activities[i];
          const activityResponse = await page.request.post(`http://localhost:3002/api/v1/travel/trips/${tripId}/activities`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            data: {
              day_id: day.id,
              name: activity.name,
              description: activity.description,
              activity_type: activity.type,
              time_block: activity.time_block,
              sort_order: i
            }
          });

          if (activityResponse.ok()) {
            totalActivities++;
          }
        }
      }
    }

    console.log(`\nTotal: ${totalDays} days, ${totalActivities} activities created`);

    // Refresh and take screenshot
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Click Itinerary tab
    const itineraryTab = page.locator('button:has-text("Itinerary"), [role="tab"]:has-text("Itinerary")').first();
    if (await itineraryTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await itineraryTab.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: 'test-results/portugal-trip-with-activities.png', fullPage: true });

    console.log('Portugal trip activities setup complete!');
  });
});
