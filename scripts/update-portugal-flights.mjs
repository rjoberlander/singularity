/**
 * Update Portugal trip flight records with segment details from Chase Travel PDF.
 *
 * Usage: node scripts/update-portugal-flights.mjs
 *
 * Requires local Supabase to be running.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://localhost:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

const TRIP_ID = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';

async function main() {
  // Get existing flights
  const { data: flights, error } = await supabase
    .from('trip_flights')
    .select('*')
    .eq('trip_id', TRIP_ID)
    .order('departure_datetime');

  if (error) {
    console.error('Failed to fetch flights:', error);
    return;
  }

  console.log(`Found ${flights.length} flights`);

  for (const flight of flights) {
    console.log(`  ${flight.direction}: ${flight.departure_airport} → ${flight.arrival_airport} (${flight.flight_number})`);
  }

  // Common booking info
  const bookingRef = 'CW9EG7';
  const agencyRef = '29MJUP';
  const cost = 7091.20;
  const pointsUsed = 472746;

  // Seat assignments for all 5 travelers across all 4 legs
  const seatAssignments = [
    // Outbound leg 1: LAX-YYZ
    { name: 'Chi Dang Oberlander', seat: '40B (LAX-YYZ), 35F (YYZ-LIS)' },
    { name: 'Richard Oberlander', seat: '40D (LAX-YYZ), 35H (YYZ-LIS)' },
    { name: 'Parker Oberlander', seat: '40A (LAX-YYZ), 35E (YYZ-LIS)' },
    { name: 'Charlotte Oberlander', seat: '40C (LAX-YYZ), 35G (YYZ-LIS)' },
    { name: 'Xander Oberlander', seat: '40E (LAX-YYZ), 35J (YYZ-LIS)' },
  ];

  const returnSeatAssignments = [
    { name: 'Chi Dang Oberlander', seat: '40F (LIS-YYZ), 35D (YYZ-LAX)' },
    { name: 'Richard Oberlander', seat: '40H (LIS-YYZ), 36D (YYZ-LAX)' },
    { name: 'Parker Oberlander', seat: '40E (LIS-YYZ), 35E (YYZ-LAX)' },
    { name: 'Charlotte Oberlander', seat: '40G (LIS-YYZ), 36F (YYZ-LAX)' },
    { name: 'Xander Oberlander', seat: '40J (LIS-YYZ), 36E (YYZ-LAX)' },
  ];

  // Outbound: LAX → LIS via YYZ (Jun 14)
  const outboundSegments = [
    {
      flight_number: 'AC 786',
      departure_airport: 'LAX',
      arrival_airport: 'YYZ',
      departure_datetime: '2026-06-14T11:55:00-07:00', // 11:55am PT
      arrival_datetime: '2026-06-14T19:29:00-04:00',   // 7:29pm ET
      duration_minutes: 274, // ~4h34m
    },
    {
      flight_number: 'AC 810',
      departure_airport: 'YYZ',
      arrival_airport: 'LIS',
      departure_datetime: '2026-06-14T23:00:00-04:00', // 11:00pm ET
      arrival_datetime: '2026-06-15T11:05:00+01:00',   // 11:05am WET next day
      duration_minutes: 425, // ~7h05m
    },
  ];

  const outboundLayovers = [
    { airport: 'YYZ', duration: '3h 31m', flight_number: 'AC 810' },
  ];

  // Return: LIS → LAX via YYZ (Jul 14)
  const returnSegments = [
    {
      flight_number: 'AC 811',
      departure_airport: 'LIS',
      arrival_airport: 'YYZ',
      departure_datetime: '2026-07-14T13:00:00+01:00', // 1:00pm WET
      arrival_datetime: '2026-07-14T15:55:00-04:00',   // 3:55pm ET
      duration_minutes: 535, // ~8h55m
    },
    {
      flight_number: 'AC 795',
      departure_airport: 'YYZ',
      arrival_airport: 'LAX',
      departure_datetime: '2026-07-14T18:35:00-04:00', // 6:35pm ET
      arrival_datetime: '2026-07-14T20:53:00-07:00',   // 8:53pm PT
      duration_minutes: 318, // ~5h18m
    },
  ];

  const returnLayovers = [
    { airport: 'YYZ', duration: '2h 40m', flight_number: 'AC 795' },
  ];

  // Update outbound flights
  const outbound = flights.filter(f => f.direction === 'outbound');
  for (const f of outbound) {
    console.log(`\nUpdating outbound flight ${f.id}...`);
    const { error: updateError } = await supabase
      .from('trip_flights')
      .update({
        booking_reference: bookingRef,
        agency_reference: agencyRef,
        cost: cost,
        currency: 'USD',
        points_used: pointsUsed,
        flight_segments: outboundSegments,
        layovers: outboundLayovers,
        seat_assignments: seatAssignments,
        flight_number: 'AC 786, AC 810',
      })
      .eq('id', f.id);

    if (updateError) console.error('  Update failed:', updateError);
    else console.log('  Updated successfully');
  }

  // Update return flights
  const returnFlights = flights.filter(f => f.direction === 'return');
  for (const f of returnFlights) {
    console.log(`\nUpdating return flight ${f.id}...`);
    const { error: updateError } = await supabase
      .from('trip_flights')
      .update({
        booking_reference: bookingRef,
        agency_reference: agencyRef,
        cost: cost,
        currency: 'USD',
        points_used: pointsUsed,
        flight_segments: returnSegments,
        layovers: returnLayovers,
        seat_assignments: returnSeatAssignments,
        flight_number: 'AC 811, AC 795',
      })
      .eq('id', f.id);

    if (updateError) console.error('  Update failed:', updateError);
    else console.log('  Updated successfully');
  }

  console.log('\nDone!');
}

main();
