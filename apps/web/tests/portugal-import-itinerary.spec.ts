import { test, expect } from "@playwright/test";

/**
 * Import detailed Portugal itinerary from Compass artifact
 *
 * Flow: Trip > Segment > Day > Activities
 *
 * This test uses the API directly to bulk import activities,
 * which is the same as the UI but faster for large datasets.
 */

const TRIP_ID = "814c38ad-c6d4-4811-acbf-6db049e3ede1";
const API_BASE = "http://localhost:3001/api/v1";

// Segment IDs from the existing trip
const SEGMENTS = {
  lisbon: "bab29454-ed26-462b-baa2-b977000d1db4",
  cascais: "58e610a6-5733-4ce7-98a6-d3aa2064e48e",
};

// Day themes from the markdown
const DAY_THEMES: Record<string, { theme: string; title: string }> = {
  "2026-06-15": { theme: "Arrival & Jet Lag Recovery", title: "Arrival Day" },
  "2026-06-16": { theme: "Belém Monuments & Parque das Nações", title: "Belém & Oceanarium" },
  "2026-06-17": { theme: "São Jorge Castle & Science Museum", title: "Castle & Science" },
  "2026-06-18": { theme: "Monsanto Forest & Beach Preview", title: "Forest & Beach Scout" },
  "2026-06-19": { theme: "Sintra Day Trip (Full Day)", title: "Sintra Adventure" },
  "2026-06-20": { theme: "Cascais Beach Day", title: "Beach Day" },
  "2026-06-21": { theme: "Horseback Riding & Beach Day", title: "Horses & Beach" },
  "2026-06-22": { theme: "Final Cascais Day & Departure Prep", title: "Departure Day" },
};

// Activities organized by day date
const ACTIVITIES_BY_DAY: Record<string, Array<{
  name: string;
  activity_type: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  location_name?: string;
  address?: string;
  google_maps_url?: string;
  why_its_great?: string;
  kid_friendliness?: string;
  kid_rating?: number;
  gear_prep?: string;
  cost_estimate?: number;
  cost_currency?: string;
  website?: string;
  phone?: string;
  reservation_required?: boolean;
  notes?: string;
  priority?: string;
}>> = {
  // DAY 1: Tuesday, June 17 (mapped to 2026-06-15 in current trip)
  "2026-06-15": [
    {
      name: "Arrive Lisbon Airport, pick up rental car",
      activity_type: "transport",
      start_time: "10:30",
      end_time: "12:30",
      location_name: "Aeroporto Humberto Delgado",
      address: "Alameda das Comunidades Portuguesas, 1700-111 Lisboa",
      why_its_great: "Smooth start to trip",
      kid_friendliness: "All ages: Car seats ready",
      gear_prep: "Pre-book car + 3 car seats; download Via Verde app",
      cost_estimate: 60,
      cost_currency: "EUR",
      notes: "Confirm Via Verde transponder in windshield; test at first toll",
      priority: "must_do",
    },
    {
      name: "Drive to Hyatt Regency Lisbon + check-in",
      activity_type: "transport",
      start_time: "12:30",
      end_time: "13:30",
      location_name: "Hyatt Regency Lisbon",
      address: "Rua da Junqueira 54, 1349-015 Lisboa",
      google_maps_url: "https://maps.google.com/?q=Hyatt+Regency+Lisbon",
      why_its_great: "Beautiful waterfront property in Belém; pool for recovery days",
      kid_friendliness: "Pool is perfect for all ages",
      gear_prep: "Early check-in request",
      cost_estimate: 250,
      cost_currency: "EUR",
      website: "hyatt.com",
      notes: "Request room with river view; ask about kids' welcome amenities",
      priority: "must_do",
    },
    {
      name: "Light lunch at Pastéis de Belém",
      activity_type: "restaurant",
      start_time: "13:30",
      end_time: "15:00",
      location_name: "Pastéis de Belém",
      address: "Rua de Belém 84-92, 1300-085 Lisboa",
      google_maps_url: "https://maps.google.com/?q=Pasteis+de+Belem",
      why_its_great: "Iconic custard tarts since 1837; takeaway line faster",
      kid_friendliness: "All ages love warm pastéis; 400+ seats inside",
      kid_rating: 5,
      gear_prep: "Go to center doors for sit-down; arrive before 2pm",
      cost_estimate: 15,
      cost_currency: "EUR",
      website: "pasteisdebelem.pt",
      notes: "Get tarts + sandwiches for quick protein; ask for cinnamon and sugar",
      priority: "recommended",
    },
    {
      name: "Rest time – pool or nap",
      activity_type: "activity",
      start_time: "15:00",
      end_time: "17:00",
      location_name: "Hyatt Regency pool area",
      why_its_great: "Sunlight exposure helps jet lag; gentle activity",
      kid_friendliness: "3yo naps; 5 & 7yo play in pool",
      kid_rating: 5,
      gear_prep: "Bring pool toys from home; SPF already applied",
      notes: "Stay hydrated; limit pool to 1-1.5 hours",
      priority: "recommended",
    },
    {
      name: "Sunset walk along Belém Waterfront",
      activity_type: "activity",
      start_time: "17:00",
      end_time: "19:00",
      location_name: "Passeio Marítimo de Belém",
      address: "Torre de Belém to Padrão dos Descobrimentos",
      google_maps_url: "https://maps.google.com/?q=Torre+de+Belem",
      why_its_great: "Flat, stroller-friendly, iconic landmarks visible",
      kid_friendliness: "★★★★★ Excellent all ages; 3yo in stroller, older kids run free",
      kid_rating: 5,
      gear_prep: "Stroller; water bottles; light snacks",
      notes: "Photo ops at Monument to Discoveries; MAAT rooftop is free",
      priority: "must_do",
    },
    {
      name: "Early dinner at Clube Naval de Lisboa",
      activity_type: "restaurant",
      start_time: "19:00",
      end_time: "20:00",
      location_name: "Clube Naval de Lisboa",
      address: "Av. Brasília, 1300-501 Lisboa",
      google_maps_url: "https://maps.google.com/?q=Clube+Naval+Lisboa",
      why_its_great: "Waterfront views; local favorite not touristy",
      kid_friendliness: "Spacious seating; grilled fish/meat kids love",
      kid_rating: 4,
      gear_prep: "Call ahead for early seating",
      cost_estimate: 35,
      cost_currency: "EUR",
      website: "restaurantedoclubenavaldelisboa.pt",
      notes: "Views of Belém Tower; order simple grilled fish for kids",
      reservation_required: true,
      priority: "recommended",
    },
  ],

  // DAY 2: Wednesday, June 18 (mapped to 2026-06-16)
  "2026-06-16": [
    {
      name: "Breakfast at hotel",
      activity_type: "restaurant",
      start_time: "08:00",
      end_time: "08:30",
      location_name: "Hyatt Regency",
      why_its_great: "Fuel up before heat",
      gear_prep: "Heavy protein breakfast; pack snacks for later",
      priority: "must_do",
    },
    {
      name: "Jerónimos Monastery",
      activity_type: "museum",
      start_time: "08:45",
      end_time: "10:30",
      location_name: "Jerónimos Monastery",
      address: "Praça do Império, 1400-206 Lisboa",
      google_maps_url: "https://maps.google.com/?q=Jeronimos+Monastery",
      why_its_great: "UNESCO masterpiece; cloisters are stunning",
      kid_friendliness: "7yo appreciates scale; 5yo okay; 3yo may get bored after 30 min",
      kid_rating: 3,
      gear_prep: "Use Lisboa Card for free entry; stroller navigable",
      cost_estimate: 0,
      cost_currency: "EUR",
      website: "mosteirojeronimos.gov.pt",
      notes: "45-60 min max; Church entry is FREE",
      priority: "must_do",
    },
    {
      name: "National Coach Museum",
      activity_type: "museum",
      start_time: "10:30",
      end_time: "11:30",
      location_name: "Museu Nacional dos Coches",
      address: "Praça Afonso de Albuquerque, 1300-044 Lisboa",
      google_maps_url: "https://maps.google.com/?q=Museu+Nacional+dos+Coches",
      why_its_great: "Royal carriages – kids love the sparkle",
      kid_friendliness: "★★★★ 7 & 5yo fascinated by gold coaches; 3yo enjoys for 30 min",
      kid_rating: 4,
      gear_prep: "Stroller-friendly; air-conditioned",
      cost_estimate: 0,
      cost_currency: "EUR",
      website: "museudoscoches.gov.pt",
      notes: "Cool inside; perfect transition before lunch",
      priority: "recommended",
    },
    {
      name: "Drive to Parque das Nações + Lunch",
      activity_type: "restaurant",
      start_time: "11:30",
      end_time: "14:30",
      location_name: "Vasco da Gama Shopping Center",
      why_its_great: "Modern waterfront district; good food options",
      kid_friendliness: "All ages – food court has variety",
      gear_prep: "15-min drive; parking at Oceanário",
      cost_estimate: 40,
      cost_currency: "EUR",
      notes: "Let kids rest/eat before aquarium",
      priority: "must_do",
    },
    {
      name: "Oceanário de Lisboa",
      activity_type: "museum",
      start_time: "14:30",
      end_time: "17:00",
      location_name: "Oceanário de Lisboa",
      address: "Esplanada Dom Carlos I, 1990-005 Lisboa",
      google_maps_url: "https://maps.google.com/?q=Oceanario+Lisboa",
      why_its_great: "Europe's best aquarium; 8,000+ creatures",
      kid_friendliness: "★★★★★ All ages LOVE it; sea otters, sharks, sunfish",
      kid_rating: 5,
      gear_prep: "Book tickets online in advance; stroller-friendly",
      cost_estimate: 70,
      cost_currency: "EUR",
      website: "oceanario.pt",
      reservation_required: true,
      notes: "2-3 hours ideal; main tank is mesmerizing",
      priority: "must_do",
    },
    {
      name: "Rest at hotel pool",
      activity_type: "activity",
      start_time: "17:00",
      end_time: "18:30",
      location_name: "Hyatt Regency",
      why_its_great: "Recovery time",
      kid_friendliness: "All ages",
      notes: "Quick swim; let 3yo nap if needed",
      priority: "recommended",
    },
    {
      name: "Dinner at O Prado",
      activity_type: "restaurant",
      start_time: "18:30",
      end_time: "19:30",
      location_name: "O Prado",
      address: "Rua da Junqueira 472, 1300-341 Lisboa",
      google_maps_url: "https://maps.google.com/?q=O+Prado+Belem",
      why_its_great: "Authentic neighborhood tasca",
      kid_friendliness: "Casual; simple grilled fish kids enjoy",
      kid_rating: 4,
      gear_prep: "Early arrival for outdoor tables",
      cost_estimate: 50,
      cost_currency: "EUR",
      notes: "Daily specials are excellent value",
      priority: "recommended",
    },
  ],

  // DAY 3: Thursday, June 19 (mapped to 2026-06-17)
  "2026-06-17": [
    {
      name: "Breakfast + pack for day",
      activity_type: "restaurant",
      start_time: "08:00",
      end_time: "08:45",
      location_name: "Hyatt Regency",
      gear_prep: "Pack: carrier for 3yo, water, snacks, sunscreen",
      notes: "Leave stroller – use carrier for castle",
      priority: "must_do",
    },
    {
      name: "São Jorge Castle",
      activity_type: "museum",
      start_time: "09:00",
      end_time: "11:30",
      location_name: "Castelo de São Jorge",
      address: "Rua de Santa Cruz do Castelo, 1100-129 Lisboa",
      google_maps_url: "https://maps.google.com/?q=Castelo+Sao+Jorge",
      why_its_great: "Medieval walls to explore; peacocks roaming; panoramic views",
      kid_friendliness: "★★★★★ Kids' favorite – walls to walk, cannons, birds",
      kid_rating: 5,
      gear_prep: "Baby carrier essential; buy tickets online; take bus 737",
      cost_estimate: 15,
      cost_currency: "EUR",
      website: "castelodesaojorge.pt",
      reservation_required: true,
      notes: "Arrive 9am opening; 2-2.5 hours; supervise carefully near low walls",
      priority: "must_do",
    },
    {
      name: "Quick Alfama exploration - Miradouro",
      activity_type: "activity",
      start_time: "11:30",
      end_time: "12:15",
      location_name: "Miradouro de Santa Luzia",
      address: "Largo Santa Luzia",
      google_maps_url: "https://maps.google.com/?q=Miradouro+Santa+Luzia",
      why_its_great: "Stunning viewpoint; tiled benches",
      kid_friendliness: "Quick stop for photos",
      gear_prep: "Walk downhill from castle",
      notes: "10-15 min stop; beautiful river views; buy cold drinks",
      priority: "recommended",
    },
    {
      name: "Lunch at Chapitô à Mesa",
      activity_type: "restaurant",
      start_time: "12:30",
      end_time: "14:30",
      location_name: "Chapitô à Mesa",
      address: "Costa do Castelo 7, 1149-079 Lisboa",
      google_maps_url: "https://maps.google.com/?q=Chapito+a+Mesa",
      why_its_great: "Circus school restaurant – acrobats practicing; amazing views",
      kid_friendliness: "★★★★★ Kids may see performers; huge terrace",
      kid_rating: 5,
      gear_prep: "Reservations recommended",
      cost_estimate: 80,
      cost_currency: "EUR",
      website: "chapito.org",
      reservation_required: true,
      notes: "Best lunch spot with kids in Lisbon; vegetarian options available",
      priority: "must_do",
    },
    {
      name: "Rest/drive to Parque das Nações",
      activity_type: "transport",
      start_time: "14:30",
      end_time: "15:30",
      why_its_great: "Rest time",
      notes: "3yo naps in car",
      priority: "recommended",
    },
    {
      name: "Pavilhão do Conhecimento (Science Museum)",
      activity_type: "museum",
      start_time: "15:30",
      end_time: "17:30",
      location_name: "Pavilhão do Conhecimento",
      address: "Largo José Mariano Gago 1, 1990-073 Lisboa",
      google_maps_url: "https://maps.google.com/?q=Pavilhao+Conhecimento+Lisboa",
      why_its_great: "Best interactive science museum; 100% hands-on",
      kid_friendliness: "★★★★★ 7yo heaven; 5yo great; 3yo enjoys some exhibits",
      kid_rating: 5,
      gear_prep: "Family ticket best value",
      cost_estimate: 30,
      cost_currency: "EUR",
      website: "pavconhecimento.pt",
      notes: "\"Circus of Science\" exhibit is highlight; 2 hours ideal",
      priority: "must_do",
    },
    {
      name: "Drive back to Belém",
      activity_type: "transport",
      start_time: "17:30",
      end_time: "18:00",
      priority: "must_do",
    },
    {
      name: "Dinner at Nunes Real Marisqueira (splurge night)",
      activity_type: "restaurant",
      start_time: "18:30",
      end_time: "19:30",
      location_name: "Nunes Real Marisqueira",
      address: "Rua Bartolomeu Dias 172, 1400-031 Lisboa",
      google_maps_url: "https://maps.google.com/?q=Nunes+Marisqueira+Belem",
      why_its_great: "Art deco seafood temple; special occasion",
      kid_friendliness: "High chairs available; grilled fish for kids",
      kid_rating: 4,
      gear_prep: "Reservations essential",
      cost_estimate: 150,
      cost_currency: "EUR",
      website: "nunesmarisqueira.pt",
      reservation_required: true,
      notes: "Splurge night; order grilled fish for kids, seafood rice to share",
      priority: "must_do",
    },
  ],

  // DAY 4: Friday, June 20 (mapped to 2026-06-18)
  "2026-06-18": [
    {
      name: "Breakfast",
      activity_type: "restaurant",
      start_time: "08:00",
      end_time: "08:30",
      location_name: "Hyatt Regency",
      gear_prep: "Pack picnic lunch; hiking shoes",
      priority: "must_do",
    },
    {
      name: "Monsanto Forest Park – Alvito Playground + Trail",
      activity_type: "hike",
      start_time: "09:00",
      end_time: "11:30",
      location_name: "Parque do Alvito",
      address: "Monsanto, Lisboa",
      google_maps_url: "https://maps.google.com/?q=Parque+Alvito+Monsanto+Lisboa",
      why_its_great: "\"Best free activity for young children in Lisbon\"; shaded forest trails",
      kid_friendliness: "★★★★★ All ages; Alvito has huge adventure playground",
      kid_rating: 5,
      gear_prep: "AllTrails: Monsanto trails",
      cost_estimate: 0,
      cost_currency: "EUR",
      notes: "Park at Alvito entrance (free); 1-2 hours playground + 1-2km trail",
      priority: "must_do",
    },
    {
      name: "Picnic lunch in park",
      activity_type: "restaurant",
      start_time: "11:30",
      end_time: "12:30",
      location_name: "Monsanto picnic areas",
      why_its_great: "Shaded tables; grills available",
      kid_friendliness: "Perfect for kids to run",
      gear_prep: "Pack sandwiches + fruit",
      notes: "Many picnic spots with shade",
      priority: "recommended",
    },
    {
      name: "Rest at hotel pool",
      activity_type: "activity",
      start_time: "12:30",
      end_time: "16:00",
      location_name: "Hyatt Regency",
      why_its_great: "Recovery; peak UV hours",
      notes: "Long rest – Sintra tomorrow requires energy",
      priority: "must_do",
    },
    {
      name: "Scout Cascais beaches (Praia da Conceição)",
      activity_type: "beach",
      start_time: "16:30",
      end_time: "18:30",
      location_name: "Praia da Conceição",
      address: "Cascais",
      google_maps_url: "https://maps.google.com/?q=Praia+da+Conceicao+Cascais",
      why_its_great: "Best family beach; calm shallow water",
      kid_friendliness: "★★★★★ Perfect for all ages; lifeguards; facilities",
      kid_rating: 5,
      gear_prep: "30-min drive; bring beach gear",
      cost_estimate: 5,
      cost_currency: "EUR",
      notes: "Preview before move to Cascais; calm water, wide sand",
      priority: "recommended",
    },
    {
      name: "Dinner at Cascais – Beira Mar",
      activity_type: "restaurant",
      start_time: "18:30",
      end_time: "19:30",
      location_name: "Beira Mar",
      address: "Rua das Flores 6, 2750-348 Cascais",
      google_maps_url: "https://maps.google.com/?q=Beira+Mar+Cascais",
      why_its_great: "45-year family institution; Travelers' Choice 2024",
      kid_friendliness: "★★★★★ \"Perfect for families\"; wheelchair accessible",
      kid_rating: 5,
      gear_prep: "Reservations recommended; CLOSED TUESDAYS",
      cost_estimate: 80,
      cost_currency: "EUR",
      website: "restaurantebeiramar.pt",
      reservation_required: true,
      notes: "Preview dinner spot for Cascais stay; excellent sole and sea bass",
      priority: "must_do",
    },
    {
      name: "Drive back to Belém",
      activity_type: "transport",
      start_time: "19:30",
      end_time: "20:00",
      notes: "Early night – big Sintra day tomorrow",
      priority: "must_do",
    },
  ],

  // DAY 5: Saturday, June 21 (mapped to 2026-06-19)
  "2026-06-19": [
    {
      name: "Early breakfast",
      activity_type: "restaurant",
      start_time: "07:30",
      end_time: "08:00",
      location_name: "Hyatt Regency",
      gear_prep: "Pack: baby carrier, jackets, snacks, water, sunscreen",
      notes: "LEAVE BY 8AM – critical for parking/crowds",
      priority: "must_do",
    },
    {
      name: "Drive to Sintra + park",
      activity_type: "transport",
      start_time: "08:00",
      end_time: "08:45",
      location_name: "Estacionamento Portela de Sintra",
      google_maps_url: "https://maps.google.com/?q=Portela+Sintra+Parking",
      why_its_great: "Only €1.50/day; avoid traffic nightmare",
      gear_prep: "Download offline maps; no phone signal in some areas",
      cost_estimate: 2,
      cost_currency: "EUR",
      notes: "Or use Sintra train station parking (€5-6)",
      priority: "must_do",
    },
    {
      name: "Quinta da Regaleira",
      activity_type: "museum",
      start_time: "09:00",
      end_time: "12:30",
      location_name: "Quinta da Regaleira",
      address: "Rua Barbosa du Bocage 5, 2710-567 Sintra",
      google_maps_url: "https://maps.google.com/?q=Quinta+da+Regaleira",
      why_its_great: "★★★★★ BEST PALACE FOR KIDS – secret tunnels, Initiation Well, caves, towers",
      kid_friendliness: "10/10 – \"Hide and seek heaven\"; tunnels are magic",
      kid_rating: 5,
      gear_prep: "Book tickets online; carrier for 3yo (stroller difficult); flashlight",
      cost_estimate: 30,
      cost_currency: "EUR",
      website: "regaleira.pt",
      reservation_required: true,
      notes: "GO TO INITIATION WELL FIRST (gets crowded); 3+ hours; kids run free on lawns",
      priority: "must_do",
    },
    {
      name: "Lunch at Tascantiga",
      activity_type: "restaurant",
      start_time: "12:30",
      end_time: "13:30",
      location_name: "Tascantiga",
      address: "Escadinhas da Fonte da Pipa, 2710-557 Sintra",
      google_maps_url: "https://maps.google.com/?q=Tascantiga+Sintra",
      why_its_great: "Perfect location; excellent petiscos; highchairs available",
      kid_friendliness: "★★★★★ Tapas style – try different things; kid-friendly",
      kid_rating: 5,
      gear_prep: "Reservations helpful",
      cost_estimate: 60,
      cost_currency: "EUR",
      website: "tascantiga.pt",
      reservation_required: true,
      notes: "Order regional tapas; kids can share bites; terrace seating",
      priority: "must_do",
    },
    {
      name: "Drive to Cabo da Roca",
      activity_type: "activity",
      start_time: "13:30",
      end_time: "14:30",
      location_name: "Cabo da Roca",
      address: "Estrada do Cabo da Roca, Colares",
      google_maps_url: "https://maps.google.com/?q=Cabo+da+Roca",
      why_its_great: "Westernmost point of Europe – dramatic cliffs",
      kid_friendliness: "Brief stop – 15-20 min; HOLD CHILDREN (dangerous cliffs, very windy)",
      kid_rating: 3,
      gear_prep: "Jackets – can be 10°C cooler than Lisbon",
      cost_estimate: 10,
      cost_currency: "EUR",
      notes: "Photo at monument; buy certificate (€5-10) in tourist office",
      priority: "recommended",
    },
    {
      name: "Drive to Cascais + check into new hotel",
      activity_type: "transport",
      start_time: "14:30",
      end_time: "15:30",
      location_name: "Cascais beachfront hotel",
      cost_estimate: 200,
      cost_currency: "EUR",
      notes: "Check in early; unpack",
      priority: "must_do",
    },
    {
      name: "Rest/Pool at Cascais hotel",
      activity_type: "activity",
      start_time: "15:30",
      end_time: "17:30",
      location_name: "Hotel pool",
      why_its_great: "Recovery from big morning",
      kid_friendliness: "All ages",
      notes: "Essential rest; 3yo naps",
      priority: "must_do",
    },
    {
      name: "Explore Cascais marina + sunset",
      activity_type: "activity",
      start_time: "17:30",
      end_time: "19:00",
      location_name: "Marina de Cascais",
      google_maps_url: "https://maps.google.com/?q=Marina+Cascais",
      why_its_great: "Beautiful harbor; ice cream shops; pedestrian streets",
      kid_friendliness: "Easy strolling; kids can watch boats",
      kid_rating: 5,
      gear_prep: "Stroller-friendly promenade",
      notes: "Santini has excellent gelato; explore pedestrian streets",
      priority: "recommended",
    },
    {
      name: "Dinner at marina – Tasca da Linha",
      activity_type: "restaurant",
      start_time: "19:00",
      end_time: "20:00",
      location_name: "Marina de Cascais",
      google_maps_url: "https://maps.google.com/?q=Marina+Cascais",
      why_its_great: "Waterfront petiscos; boat watching",
      kid_friendliness: "Marina setting; casual sharing plates",
      kid_rating: 4,
      gear_prep: "Walk-in okay at marina",
      cost_estimate: 70,
      cost_currency: "EUR",
      notes: "Or try Marisco na Praça for fresh seafood",
      priority: "recommended",
    },
  ],

  // DAY 6: Sunday, June 22 (mapped to 2026-06-20)
  "2026-06-20": [
    {
      name: "Breakfast at hotel",
      activity_type: "restaurant",
      start_time: "08:00",
      end_time: "08:30",
      location_name: "Cascais hotel",
      gear_prep: "Apply sunscreen before beach",
      priority: "must_do",
    },
    {
      name: "Praia da Rainha (morning beach)",
      activity_type: "beach",
      start_time: "08:45",
      end_time: "11:30",
      location_name: "Praia da Rainha",
      address: "Cascais",
      google_maps_url: "https://maps.google.com/?q=Praia+da+Rainha+Cascais",
      why_its_great: "Tiny protected cove; calmest water; natural shade from cliffs",
      kid_friendliness: "★★★★★ Crystal clear calm water perfect for ages 3-7; enclosed feeling",
      kid_rating: 5,
      gear_prep: "Arrive early – fills fast; bring sand toys; swim gear",
      cost_estimate: 5,
      cost_currency: "EUR",
      notes: "Lifeguards present; restaurants steps away; explore tide pools",
      priority: "must_do",
    },
    {
      name: "Walk to Cascais center",
      activity_type: "activity",
      start_time: "11:30",
      end_time: "12:00",
      location_name: "Cascais pedestrian streets",
      why_its_great: "Window shopping; gelato",
      kid_friendliness: "Easy walk; stroller fine",
      notes: "Stop at Santini for gelato",
      priority: "recommended",
    },
    {
      name: "Lunch + Rest",
      activity_type: "restaurant",
      start_time: "12:00",
      end_time: "15:00",
      location_name: "Hotel or Cascais center",
      why_its_great: "Siesta time",
      kid_friendliness: "3yo naps",
      priority: "must_do",
    },
    {
      name: "Pool time at hotel",
      activity_type: "activity",
      start_time: "15:00",
      end_time: "16:00",
      location_name: "Hotel",
      why_its_great: "Cool off before afternoon adventure",
      notes: "Brief swim",
      priority: "recommended",
    },
    {
      name: "Coastal walk to Boca do Inferno",
      activity_type: "hike",
      start_time: "16:30",
      end_time: "18:30",
      location_name: "Cascais Marina to Boca do Inferno",
      google_maps_url: "https://maps.google.com/?q=Boca+do+Inferno+Cascais",
      why_its_great: "Dramatic sea arch; paved path; stroller-friendly; ice cream stops",
      kid_friendliness: "★★★★★ Flat cycle path; 2km one-way",
      kid_rating: 5,
      gear_prep: "Stroller; water; bring hat",
      notes: "40-min walk each way; café at destination; KEEP KIDS AWAY FROM CLIFF EDGES",
      priority: "must_do",
    },
    {
      name: "Dinner at Monte Mar (beachfront)",
      activity_type: "restaurant",
      start_time: "18:30",
      end_time: "19:30",
      location_name: "Monte Mar",
      address: "Av. Nossa Senhora do Cabo 2845, Guincho",
      google_maps_url: "https://maps.google.com/?q=Monte+Mar+Cascais",
      why_its_great: "Waves crash beside tables; kids' activities on weekends",
      kid_friendliness: "★★★★★ \"Monte Mar Kids\" menu; children's entertainment on weekends",
      kid_rating: 5,
      gear_prep: "Reservations recommended; 15-min drive toward Guincho",
      cost_estimate: 120,
      cost_currency: "EUR",
      website: "montemar.pt",
      reservation_required: true,
      notes: "Best waterfront dinner in area; incredible views",
      priority: "must_do",
    },
  ],

  // DAY 7: Monday, June 23 (mapped to 2026-06-21)
  "2026-06-21": [
    {
      name: "Early breakfast",
      activity_type: "restaurant",
      start_time: "08:00",
      end_time: "08:30",
      location_name: "Hotel",
      gear_prep: "Closed-toe shoes for riding; long pants recommended",
      priority: "must_do",
    },
    {
      name: "MP Beloura Riding School - Pony rides",
      activity_type: "activity",
      start_time: "09:00",
      end_time: "11:00",
      location_name: "MP Beloura Riding School",
      address: "Centro Hípico da Quinta da Beloura II, Sintra",
      google_maps_url: "https://maps.google.com/?q=Quinta+Beloura+Sintra",
      why_its_great: "BEST FOR 3YO – accepts ages 2-5 on pony \"Ruca\"",
      kid_friendliness: "★★★★★ 3yo: Pony ride; 5 & 7yo: Lessons available",
      kid_rating: 5,
      gear_prep: "Call +351 966 000 688 to book",
      phone: "+351 966 000 688",
      website: "escoladeequitacaompbeloura.com",
      reservation_required: true,
      notes: "Most accommodating for youngest child",
      priority: "must_do",
    },
    {
      name: "Drive to beach",
      activity_type: "transport",
      start_time: "11:30",
      end_time: "12:00",
      priority: "must_do",
    },
    {
      name: "Lunch + Rest (beach picnic or hotel)",
      activity_type: "restaurant",
      start_time: "12:00",
      end_time: "15:00",
      location_name: "Hotel or Praia da Conceição facilities",
      why_its_great: "Recovery from morning",
      kid_friendliness: "3yo naps; older kids play",
      gear_prep: "Pack lunch or buy at beach bar",
      notes: "Umbrella/shade essential",
      priority: "must_do",
    },
    {
      name: "Extended beach time – Praia da Conceição",
      activity_type: "beach",
      start_time: "15:30",
      end_time: "18:00",
      location_name: "Praia da Conceição",
      google_maps_url: "https://maps.google.com/?q=Praia+da+Conceicao+Cascais",
      why_its_great: "Widest beach; calmest water; full facilities",
      kid_friendliness: "★★★★★ Paddle boards, kayaks available for 7yo",
      kid_rating: 5,
      gear_prep: "Beach gear; rentals available",
      cost_estimate: 20,
      cost_currency: "EUR",
      notes: "Build sandcastles; paddle in calm water; lifeguards on duty",
      priority: "must_do",
    },
    {
      name: "Sunset at Cascais waterfront",
      activity_type: "activity",
      start_time: "18:00",
      end_time: "19:00",
      location_name: "Cascais promenade",
      why_its_great: "Golden hour stroll",
      kid_friendliness: "Easy walking",
      priority: "recommended",
    },
    {
      name: "Casual dinner in Cascais",
      activity_type: "restaurant",
      start_time: "19:00",
      end_time: "20:00",
      location_name: "Beira Mar or marina restaurants",
      gear_prep: "May need reservations",
      cost_estimate: 80,
      cost_currency: "EUR",
      notes: "Note: Beira Mar CLOSED on Tuesdays",
      priority: "recommended",
    },
  ],

  // DAY 8: Tuesday, June 24 (mapped to 2026-06-22)
  "2026-06-22": [
    {
      name: "Breakfast at hotel",
      activity_type: "restaurant",
      start_time: "08:00",
      end_time: "08:30",
      location_name: "Hotel",
      gear_prep: "Pack bags; load car",
      notes: "Check out (can usually leave bags if needed)",
      priority: "must_do",
    },
    {
      name: "Ciclovia do Guincho – Family bike ride",
      activity_type: "activity",
      start_time: "08:45",
      end_time: "11:00",
      location_name: "Cascais Marina to Boca do Inferno (or further)",
      google_maps_url: "https://maps.google.com/?q=Ciclovia+Guincho+Cascais",
      why_its_great: "Flat coastal bike path; FREE bike rentals in Cascais (Bicas program)",
      kid_friendliness: "7yo: Own bike; 5yo: Trailer or own bike; 3yo: Trailer/seat",
      kid_rating: 5,
      gear_prep: "AllTrails: Ciclovia do Guincho; need ID for free bikes",
      cost_estimate: 0,
      cost_currency: "EUR",
      notes: "Do first 2km with young kids; full route is 10km round trip; windy!",
      priority: "recommended",
    },
    {
      name: "Final Cascais exploration",
      activity_type: "activity",
      start_time: "11:00",
      end_time: "12:00",
      location_name: "Cascais pedestrian center",
      why_its_great: "Last-minute souvenirs; ice cream",
      kid_friendliness: "Easy strolling",
      notes: "Santini gelato; browse shops",
      priority: "optional",
    },
    {
      name: "Early lunch before departure",
      activity_type: "restaurant",
      start_time: "12:00",
      end_time: "13:00",
      location_name: "Hotel restaurant or Cascais center",
      notes: "Keep it quick if traveling onward",
      priority: "must_do",
    },
    {
      name: "Depart for next destination",
      activity_type: "transport",
      start_time: "13:00",
      duration_minutes: 180,
      notes: "Onward to Alentejo/Algarve or wherever next!",
      priority: "must_do",
    },
  ],
};

test.describe("Portugal Itinerary Import", () => {
  let authToken: string;

  test.beforeAll(async ({ browser }) => {
    // Login to get auth token
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|$)/, { timeout: 10000 });

    // Get the auth token from cookies/localStorage
    const cookies = await context.cookies();
    const authCookie = cookies.find((c) => c.name.includes("auth") || c.name.includes("token"));

    // Try localStorage
    const token = await page.evaluate(() => {
      return localStorage.getItem("supabase.auth.token") ||
             sessionStorage.getItem("supabase.auth.token");
    });

    // We'll use the session for API calls instead
    await context.close();
  });

  test("should import activities via API", async ({ page }) => {
    // Login first
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|$)/, { timeout: 10000 });

    // Navigate to the trip
    await page.goto(`http://localhost:3000/travel/${TRIP_ID}/itinerary`);
    await page.waitForLoadState("networkidle");

    // Get existing days
    const daysResponse = await page.evaluate(async (tripId) => {
      const res = await fetch(`http://localhost:3001/api/v1/travel/trips/${tripId}/full`, {
        credentials: "include",
      });
      return res.json();
    }, TRIP_ID);

    const existingDays = daysResponse.data?.days || [];
    console.log(`Found ${existingDays.length} existing days`);

    // Create a map of date to day ID
    const dayIdByDate: Record<string, string> = {};
    for (const day of existingDays) {
      dayIdByDate[day.date] = day.id;
    }

    // Import activities for each day
    let totalActivities = 0;
    let totalCreated = 0;

    for (const [date, activities] of Object.entries(ACTIVITIES_BY_DAY)) {
      const dayId = dayIdByDate[date];
      if (!dayId) {
        console.log(`No day found for date ${date}, skipping...`);
        continue;
      }

      // Update day theme if available
      const dayInfo = DAY_THEMES[date];
      if (dayInfo) {
        await page.evaluate(
          async ({ tripId, dayId, theme, title }) => {
            await fetch(`http://localhost:3001/api/v1/travel/trips/${tripId}/days/${dayId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ theme, title }),
            });
          },
          { tripId: TRIP_ID, dayId, theme: dayInfo.theme, title: dayInfo.title }
        );
      }

      // Create activities for this day
      for (let i = 0; i < activities.length; i++) {
        const activity = activities[i];
        totalActivities++;

        const result = await page.evaluate(
          async ({ tripId, dayId, activity, sortOrder }) => {
            const res = await fetch(`http://localhost:3001/api/v1/travel/trips/${tripId}/activities`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                day_id: dayId,
                ...activity,
                sort_order: sortOrder,
              }),
            });
            return { ok: res.ok, status: res.status };
          },
          { tripId: TRIP_ID, dayId, activity, sortOrder: i }
        );

        if (result.ok) {
          totalCreated++;
          console.log(`✓ Created: ${activity.name}`);
        } else {
          console.log(`✗ Failed: ${activity.name} (${result.status})`);
        }
      }
    }

    console.log(`\n=== Import Complete ===`);
    console.log(`Total activities: ${totalActivities}`);
    console.log(`Successfully created: ${totalCreated}`);

    // Verify by refreshing the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Take screenshot
    await page.screenshot({ path: "test-results/portugal-itinerary-imported.png", fullPage: true });

    expect(totalCreated).toBeGreaterThan(0);
  });
});
