import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Hardcoded from .env for testing
const SUPABASE_URL = 'https://cymbadkegbibhxbfevuq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWJhZGtlZ2JpYmh4YmZldnVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc3MTQxOCwiZXhwIjoyMDg5MzQ3NDE4fQ.ugP-03Gv2buAILoeEt3HM7kKzYyP8EFmVlUTMPsAB1w';

console.log('SUPABASE_URL:', SUPABASE_URL ? 'found' : 'missing');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  // Sign in as test user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'rjoberlander@gmail.com',
    password: 'Cookie123!'
  });

  if (authError) {
    console.log('Auth error:', authError);
    return;
  }

  const token = authData.session.access_token;
  console.log('Got auth token, calling assemble-schedule...');
  console.log('This may take several minutes. Watching for progress...\n');

  const startTime = Date.now();

  // Call assemble-schedule with extended timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 600000); // 10 minute timeout

  // Skip enrichment since Google API key is invalid, just generate schedule
  const response = await fetch('http://localhost:3002/api/v1/travel/trips/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/assemble-schedule?skip_enrichment=true', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    signal: controller.signal
  });

  clearTimeout(timeout);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const result = await response.json();
  console.log(`\n=== RESPONSE (after ${elapsed}s) ===`);
  console.log('Status:', response.status);
  console.log('Result:', JSON.stringify(result, null, 2));
}

test().catch(console.error);
