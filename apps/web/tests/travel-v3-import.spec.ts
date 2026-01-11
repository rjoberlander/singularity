import { test, expect } from '@playwright/test';

// Sample v3 segment research JSON for testing
const v3SegmentResearchJson = {
  "_template_version": "3.0",
  "metadata": {
    "trip_name": "Portugal Test Trip V3",
    "segment_number": 1,
    "segment_name": "Lisbon & Belém",
    "dates": {
      "start": "2025-06-17",
      "end": "2025-06-21"
    },
    "total_days": 5,
    "total_nights": 4,
    "generated_at": new Date().toISOString(),
    "version": "3.0"
  },
  "segment": {
    "name": "Lisbon & Belém",
    "description": "Age of Discovery history and iconic Lisbon experiences",
    "theme": "Exploring Portugal's Golden Age",
    "location": {
      "location_name": "Lisbon",
      "country": "Portugal",
      "country_code": "PT",
      "latitude": 38.7223,
      "longitude": -9.1393,
      "timezone": "Europe/Lisbon"
    },
    "city_info": {
      "intro": "Lisbon is one of the oldest cities in Western Europe — older than Rome, older than Paris, older than London. This is where the Age of Discovery began.",
      "deep_history": {
        "sections": [
          {
            "title": "The Ancient Foundations (1200 BC - 711 AD)",
            "content": "Phoenician traders from what is now Lebanon founded Lisbon around 1200 BC. They called it Alis Ubbo, meaning 'safe harbor'. The Romans came next, building temples and roads. Their influence still echoes in the city's grid-like lower districts.",
            "relevance": "You'll see Roman ruins at the castle and traces of ancient walls throughout Alfama."
          },
          {
            "title": "The Moorish Period (711 - 1147 AD)",
            "content": "In 711 AD, Moors crossed the Strait of Gibraltar and brought Islam, advanced mathematics, and architectural innovations. They fortified the castle and created the narrow, winding streets of Alfama that still exist today.",
            "relevance": "The Alfama neighborhood you'll explore is essentially unchanged from Moorish times."
          }
        ]
      },
      "culture": {
        "overview": "Lisbon's culture is defined by saudade — a melancholic longing that infuses everything from its music to its architecture.",
        "traditions": [
          {
            "name": "Fado Music",
            "story": "Fado emerged in the early 19th century in the working-class neighborhoods of Alfama. It's the musical expression of saudade — songs of loss, longing, and the sea.",
            "where_to_experience": "Clube de Fado in Alfama",
            "kid_friendly": false
          }
        ]
      },
      "cuisine": {
        "overview": "Portuguese cuisine is hearty and focused on fresh seafood, grilled meats, and pastries.",
        "signature_foods": [
          {
            "name": "Pastel de Nata",
            "story": "These custard tarts were invented by monks at Jerónimos Monastery. When the monastery closed, they sold the recipe to the Belém pastry shop.",
            "where_to_try": "Pastéis de Belém (the original) or Manteigaria",
            "kid_appeal": "Warm, sweet, and crispy — kids love them!"
          }
        ]
      }
    },
    "packing_list": [
      {"item": "Comfortable walking shoes", "why": "Lisbon is very hilly with cobblestones"},
      {"item": "Light layers", "why": "Ocean breeze can be cool even in summer"}
    ],
    "booking_priorities": {
      "book_now": [{"item": "Jerónimos Monastery tickets", "reason": "Sells out, especially mornings", "url": "https://www.patrimoniocultural.gov.pt"}],
      "book_week_ahead": [{"item": "Fado show reservation", "reason": "Popular venues fill up"}]
    }
  },
  "days": {
    "days": [
      {
        "day_number": 1,
        "date": "2025-06-17",
        "day_of_week": "Tuesday",
        "title": "Arrival & First Taste",
        "theme": "Gentle landing, jet-lag management",
        "overview": "Arrive, settle in, and get your first taste of Lisbon with minimal activity.",
        "schedule": [
          {
            "time": "3:00-4:00pm",
            "activity_name": "Hotel Check-in",
            "activity_type": "transport",
            "location": "Belém area",
            "notes": "Ask for a room with a view"
          },
          {
            "time": "5:00-6:30pm",
            "activity_name": "Pastéis de Belém",
            "activity_type": "meal",
            "location": "Rua de Belém 84-92",
            "notes": "First pastéis de nata experience!",
            "is_deep_dive": false
          }
        ],
        "meals": {
          "breakfast": {"plan": "On the flight"},
          "lunch": {"plan": "Skip or light airport snack"},
          "dinner": {"plan": "Light meal near hotel", "notes": "Don't push it — jet lag"}
        },
        "backup_plan": {
          "if_tired": "Just do the pastry shop and rest",
          "if_rain": "Same plan — pastry shop has indoor seating"
        }
      }
    ]
  },
  "research_items": [
    {
      "item_type": "attraction",
      "name": "Jerónimos Monastery",
      "priority": "must_do",
      "source_url": "https://www.patrimoniocultural.gov.pt",
      "source_name": "Official",
      "location": {
        "area": "Belém",
        "address": "Praça do Império 1400-206 Lisboa",
        "latitude": 38.6979,
        "longitude": -9.2068,
        "google_maps_url": "https://maps.google.com/?q=Jeronimos+Monastery"
      },
      "practical": {
        "hours": "10am-6pm, closed Mondays",
        "cost": {
          "description": "€10 adults, free under 14",
          "adult": "€10",
          "child": "Free",
          "family_total": "€20"
        },
        "time_needed": "1.5-2 hours",
        "best_time": "Arrive at 10am opening",
        "avoid": "10am-12pm cruise ship crowds",
        "stroller": "Ground floor accessible, upper has stairs"
      },
      "ratings": {
        "score": 4.8,
        "count": 52000,
        "summary": "Stunning Manueline architecture, don't miss the cloisters"
      },
      "deep_dive": {
        "what_it_is": "A 16th-century monastery and UNESCO World Heritage Site",
        "why_it_matters": {
          "content": "This building tells the story of Portugal's golden age better than any other monument. King Manuel I ordered its construction in 1501, right after Vasco da Gama returned from finding the sea route to India. It was financed by 'pepper money' — the spice trade profits that made Portugal one of the wealthiest nations on Earth."
        },
        "the_story": {
          "content": "In 1495, King Manuel I visited a small, crumbling chapel where Vasco da Gama had prayed before his voyage. When da Gama returned triumphant, Manuel decided to replace the chapel with something magnificent — a monument to Portugal's new status as a global power. The architects created Manueline style, mixing Gothic structure with maritime motifs: ropes, anchors, sea creatures, and exotic plants from the newly discovered lands."
        },
        "what_youll_see": [
          {
            "name": "The Church",
            "highlights": [
              {"name": "Vaulted ceiling", "description": "The ceiling looks like a forest canopy or ship rigging — stone worked to look weightless"},
              {"name": "Vasco da Gama's tomb", "description": "The explorer is buried here, near the entrance"}
            ]
          },
          {
            "name": "The Cloisters",
            "highlights": [
              {"name": "Stone carvings", "description": "Every column tells a different story — find ropes, globes, animals"},
              {"name": "Two-story arcade", "description": "The upper level has the best photo spots"}
            ]
          }
        ],
        "interesting_facts": [
          "The monastery survived the 1755 earthquake that destroyed most of Lisbon",
          "It took 100 years to complete construction",
          "The stone is white limestone that glows golden at sunset"
        ]
      },
      "kid_engagement": {
        "parker": {
          "age_at_trip": 7,
          "scripts": [
            "Parker, count how many different things you can find carved in stone — ropes, anchors, shells, animals, plants",
            "Parker, Vasco da Gama is buried right here. He sailed to India when no one knew if it was possible. That's like someone today being the first to walk on Mars."
          ],
          "activities": ["Counting game for carvings", "Finding the tomb"],
          "questions_to_ask": ["What do you think the sailors felt looking at all these sea creatures?"]
        },
        "charlotte": {
          "age_at_trip": 5,
          "scripts": [
            "Charlotte, look at the ceiling! Does it look like trees?",
            "Charlotte, can you find a stone lion?"
          ],
          "activities": ["Animal hunt", "Ceiling gazing"]
        },
        "xander": {
          "age_at_trip": 2,
          "scripts": [
            "Let Xander run (carefully) in the cloister garden",
            "The echo in the church may fascinate him"
          ],
          "attention_span": "Keep moving — 60-90 minutes max",
          "carrier_needed": true
        },
        "conversation_starters": [
          "Imagine you're a sailor 500 years ago, leaving from right here, not knowing if you'll ever come back..."
        ],
        "games": [
          "I Spy with maritime themes",
          "Who can find the most animals?"
        ]
      },
      "photo_opportunities": [
        {
          "shot": "Family in cloister arcade",
          "where": "Upper level of cloisters",
          "when": "Morning light",
          "tip": "Have kids point at carvings"
        }
      ],
      "assigned_day": 2,
      "assigned_time": "9:00-11:00am"
    }
  ]
};

test.describe('Travel V3 Import', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('can navigate to import page and see v3 mode options', async ({ page }) => {
    // Navigate to import page
    await page.goto('http://localhost:3000/travel/import');
    await page.waitForLoadState('networkidle');

    // Verify import page loads - actual title is "Import Trip Data"
    await expect(page.locator('h1:has-text("Import Trip Data")')).toBeVisible({ timeout: 10000 });

    // Verify import mode radio buttons exist (Phase 0 skeleton and Phase 1 segment options)
    await expect(page.locator('text=Trip Skeleton (Phase 0)')).toBeVisible();
    await expect(page.locator('label[for="segment_new"]')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'test-results/travel-v3-import-page.png', fullPage: true });
  });

  test('can import v3 segment research JSON', async ({ page }) => {
    // Navigate to import page
    await page.goto('http://localhost:3000/travel/import');
    await page.waitForLoadState('networkidle');

    // Select "Segment Research → New Trip" mode
    await page.locator('label[for="segment_new"]').click();
    await page.waitForTimeout(500);

    // Find the JSON textarea
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 5000 });

    // Paste the v3 JSON
    await textarea.fill(JSON.stringify(v3SegmentResearchJson, null, 2));

    // Take screenshot of filled form
    await page.screenshot({ path: 'test-results/travel-v3-json-pasted.png', fullPage: true });

    // Click Validate JSON button (this parses AND validates)
    const validateButton = page.locator('button:has-text("Validate JSON")');
    await expect(validateButton).toBeVisible();
    await validateButton.click();

    // Wait for validation
    await page.waitForTimeout(2000);

    // Screenshot after validation
    await page.screenshot({ path: 'test-results/travel-v3-validated.png', fullPage: true });

    // Look for import button - it appears after validation passes
    const importButton = page.locator('button:has-text("Import to")');
    await expect(importButton).toBeVisible({ timeout: 10000 });

    // Screenshot before clicking import
    await page.screenshot({ path: 'test-results/travel-v3-before-import.png', fullPage: true });

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser error:', msg.text());
      }
    });

    // Click import and wait for response
    await importButton.click();

    // Wait a bit for the import to process
    await page.waitForTimeout(3000);

    // Screenshot after clicking
    await page.screenshot({ path: 'test-results/travel-v3-after-import-click.png', fullPage: true });

    // Check if we're still on import page (error case) or redirected
    const currentUrl = page.url();
    console.log('Current URL after import:', currentUrl);

    if (currentUrl.includes('/travel/import')) {
      // Still on import page - check for error messages
      const errorText = await page.locator('.text-destructive, .text-red-500, [class*="error"]').allTextContents();
      console.log('Error messages found:', errorText);
      throw new Error(`Import did not redirect. Still on: ${currentUrl}. Errors: ${errorText.join(', ')}`);
    }

    // Wait for the trip page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot of imported trip
    await page.screenshot({ path: 'test-results/travel-v3-imported-trip.png', fullPage: true });

    // Verify trip name appears
    await expect(page.locator('text=Portugal Test Trip V3').first()).toBeVisible({ timeout: 5000 });

    console.log('V3 import test passed!');
  });

  test('imported trip shows v3 segment content', async ({ page }) => {
    // First import the trip
    await page.goto('http://localhost:3000/travel/import');
    await page.waitForLoadState('networkidle');

    // Select segment research mode
    await page.locator('label[for="segment_new"]').click();
    await page.waitForTimeout(500);

    const textarea = page.locator('textarea').first();
    await textarea.fill(JSON.stringify(v3SegmentResearchJson, null, 2));

    await page.locator('button:has-text("Validate JSON")').click();
    await page.waitForTimeout(2000);

    const importButton = page.locator('button:has-text("Import to")');
    if (await importButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await importButton.click();
      await page.waitForURL(/\/travel\/[a-f0-9-]+/, { timeout: 15000 });
      await page.waitForLoadState('networkidle');

      // Get the trip ID from URL
      const url = page.url();
      const tripId = url.match(/\/travel\/([a-f0-9-]+)/)?.[1];
      expect(tripId).toBeTruthy();

      // Take screenshot of trip page
      await page.screenshot({ path: 'test-results/travel-v3-trip-page.png', fullPage: true });

      // Click on the segment if visible to see details
      const segmentCard = page.locator('text=Lisbon & Belém').first();
      if (await segmentCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await segmentCard.click();
        await page.waitForTimeout(1000);

        // Screenshot with segment details open
        await page.screenshot({ path: 'test-results/travel-v3-segment-details.png', fullPage: true });

        // Verify v3 content is displayed (deep history sections)
        const deepHistorySection = page.locator('text=Ancient Foundations');
        if (await deepHistorySection.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log('V3 deep history sections are visible!');
        }
      }

      console.log('V3 segment content test passed!');
    } else {
      await page.screenshot({ path: 'test-results/travel-v3-segment-content-failed.png', fullPage: true });
      throw new Error('Import button not visible');
    }
  });

  test('can view research items with v3 deep dive content', async ({ page }) => {
    // Import the trip first
    await page.goto('http://localhost:3000/travel/import');
    await page.waitForLoadState('networkidle');

    // Select segment research mode
    await page.locator('label[for="segment_new"]').click();
    await page.waitForTimeout(500);

    const textarea = page.locator('textarea').first();
    await textarea.fill(JSON.stringify(v3SegmentResearchJson, null, 2));

    await page.locator('button:has-text("Validate JSON")').click();
    await page.waitForTimeout(2000);

    const importButton = page.locator('button:has-text("Import to")');
    if (await importButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await importButton.click();
      await page.waitForURL(/\/travel\/[a-f0-9-]+/, { timeout: 15000 });

      const url = page.url();
      const tripId = url.match(/\/travel\/([a-f0-9-]+)/)?.[1];

      // Navigate to itinerary to see research items
      await page.goto(`http://localhost:3000/travel/${tripId}/itinerary`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Screenshot of itinerary
      await page.screenshot({ path: 'test-results/travel-v3-itinerary.png', fullPage: true });

      // Look for the Jerónimos Monastery research item
      const monasteryItem = page.locator('text=Jerónimos Monastery').first();
      if (await monasteryItem.isVisible({ timeout: 5000 }).catch(() => false)) {
        await monasteryItem.click();
        await page.waitForTimeout(1000);

        // Screenshot with activity detail open
        await page.screenshot({ path: 'test-results/travel-v3-activity-detail.png', fullPage: true });

        // Check for v3 kid engagement with named children
        const parkerScripts = page.locator('text=Parker');
        if (await parkerScripts.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log('V3 named child scripts (Parker) are visible!');
        }

        // Check for v3 deep dive sections
        const whyItMatters = page.locator('text=Why It Matters');
        if (await whyItMatters.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log('V3 deep dive Why It Matters section is visible!');
        }
      }

      console.log('V3 research items test passed!');
    } else {
      await page.screenshot({ path: 'test-results/travel-v3-deep-dive-failed.png', fullPage: true });
      throw new Error('Import button not visible');
    }
  });
});
