/**
 * Import Portugal itinerary from Compass markdown artifact
 *
 * Run with: npx ts-node scripts/import-portugal-itinerary.ts
 */

const SUPABASE_URL = "https://fcsiqoebtpfhzreamotp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg";
const TRIP_ID = "814c38ad-c6d4-4811-acbf-6db049e3ede1";

// Day themes from the markdown (Days 1-8 = June 15-22 in the trip)
const DAY_UPDATES: Record<string, { theme: string; title: string }> = {
  "2026-06-15": { theme: "Arrival & Jet Lag Recovery", title: "Arrival Day" },
  "2026-06-16": { theme: "Belém Monuments & Parque das Nações", title: "Belém & Oceanarium" },
  "2026-06-17": { theme: "São Jorge Castle & Science Museum", title: "Castle & Science" },
  "2026-06-18": { theme: "Monsanto Forest & Beach Preview", title: "Forest & Beach Scout" },
  "2026-06-19": { theme: "Sintra Day Trip", title: "Sintra Adventure" },
  "2026-06-20": { theme: "Cascais Beach Day", title: "Beach Day" },
  "2026-06-21": { theme: "Horseback Riding & Beach", title: "Horses & Beach" },
  "2026-06-22": { theme: "Final Day & Departure Prep", title: "Departure Day" },
};

interface Activity {
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
}

// Activities organized by day date
const ACTIVITIES_BY_DAY: Record<string, Activity[]> = {
  // DAY 1: Arrival
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
      notes: "Request room with river view; ask about kids welcome amenities",
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
      why_its_great: "Iconic custard tarts since 1837",
      kid_friendliness: "All ages love warm pastéis; 400+ seats inside",
      kid_rating: 5,
      gear_prep: "Go to center doors for sit-down",
      cost_estimate: 15,
      cost_currency: "EUR",
      website: "pasteisdebelem.pt",
      notes: "Get tarts + sandwiches; ask for cinnamon and sugar",
      priority: "recommended",
    },
    {
      name: "Rest time – pool or nap",
      activity_type: "activity",
      start_time: "15:00",
      end_time: "17:00",
      location_name: "Hyatt Regency pool area",
      why_its_great: "Sunlight exposure helps jet lag",
      kid_friendliness: "3yo naps; 5 & 7yo play in pool",
      kid_rating: 5,
      gear_prep: "Bring pool toys; SPF applied",
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
      why_its_great: "Flat, stroller-friendly, iconic landmarks",
      kid_friendliness: "Excellent all ages; 3yo in stroller",
      kid_rating: 5,
      gear_prep: "Stroller; water bottles; light snacks",
      notes: "Photo ops at Monument to Discoveries; MAAT rooftop free",
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
      why_its_great: "Waterfront views; local favorite",
      kid_friendliness: "Spacious seating; grilled fish kids love",
      kid_rating: 4,
      gear_prep: "Call ahead for early seating",
      cost_estimate: 35,
      cost_currency: "EUR",
      reservation_required: true,
      notes: "Views of Belém Tower; order grilled fish for kids",
      priority: "recommended",
    },
  ],

  // DAY 2: Belém & Oceanarium
  "2026-06-16": [
    {
      name: "Breakfast at hotel",
      activity_type: "restaurant",
      start_time: "08:00",
      end_time: "08:30",
      location_name: "Hyatt Regency",
      why_its_great: "Fuel up before heat",
      gear_prep: "Heavy protein breakfast; pack snacks",
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
      kid_friendliness: "7yo appreciates scale; 3yo 30 min max",
      kid_rating: 3,
      gear_prep: "Lisboa Card for free entry; stroller navigable",
      cost_estimate: 0,
      cost_currency: "EUR",
      website: "mosteirojeronimos.gov.pt",
      notes: "45-60 min max; Church entry FREE",
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
      kid_friendliness: "7 & 5yo fascinated; 3yo 30 min",
      kid_rating: 4,
      gear_prep: "Stroller-friendly; air-conditioned",
      cost_estimate: 0,
      cost_currency: "EUR",
      website: "museudoscoches.gov.pt",
      notes: "Cool inside; perfect before lunch",
      priority: "recommended",
    },
    {
      name: "Drive to Parque das Nações + Lunch",
      activity_type: "restaurant",
      start_time: "11:30",
      end_time: "14:30",
      location_name: "Vasco da Gama Shopping Center",
      why_its_great: "Modern waterfront; good food options",
      kid_friendliness: "Food court has variety",
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
      kid_friendliness: "All ages LOVE it; sea otters, sharks",
      kid_rating: 5,
      gear_prep: "Book tickets online; stroller-friendly",
      cost_estimate: 70,
      cost_currency: "EUR",
      website: "oceanario.pt",
      reservation_required: true,
      notes: "2-3 hours ideal; main tank mesmerizing",
      priority: "must_do",
    },
    {
      name: "Rest at hotel pool",
      activity_type: "activity",
      start_time: "17:00",
      end_time: "18:30",
      location_name: "Hyatt Regency",
      why_its_great: "Recovery time",
      notes: "Quick swim; 3yo nap if needed",
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
      kid_friendliness: "Casual; simple grilled fish",
      kid_rating: 4,
      cost_estimate: 50,
      cost_currency: "EUR",
      notes: "Daily specials excellent value",
      priority: "recommended",
    },
  ],

  // DAY 3: Castle & Science
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
      why_its_great: "Medieval walls; peacocks; panoramic views",
      kid_friendliness: "Kids favorite – walls, cannons, birds",
      kid_rating: 5,
      gear_prep: "Baby carrier; buy tickets online; bus 737",
      cost_estimate: 15,
      cost_currency: "EUR",
      website: "castelodesaojorge.pt",
      reservation_required: true,
      notes: "Arrive 9am opening; 2-2.5 hours; supervise near walls",
      priority: "must_do",
    },
    {
      name: "Miradouro de Santa Luzia viewpoint",
      activity_type: "activity",
      start_time: "11:30",
      end_time: "12:15",
      location_name: "Miradouro de Santa Luzia",
      address: "Largo Santa Luzia",
      google_maps_url: "https://maps.google.com/?q=Miradouro+Santa+Luzia",
      why_its_great: "Stunning viewpoint; tiled benches",
      notes: "10-15 min stop; river views; buy cold drinks",
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
      why_its_great: "Circus school restaurant – acrobats practicing!",
      kid_friendliness: "Kids may see performers; huge terrace",
      kid_rating: 5,
      cost_estimate: 80,
      cost_currency: "EUR",
      website: "chapito.org",
      reservation_required: true,
      notes: "Best lunch with kids in Lisbon; vegetarian options",
      priority: "must_do",
    },
    {
      name: "Rest/drive to Parque das Nações",
      activity_type: "transport",
      start_time: "14:30",
      end_time: "15:30",
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
      kid_friendliness: "7yo heaven; 5yo great; 3yo some exhibits",
      kid_rating: 5,
      cost_estimate: 30,
      cost_currency: "EUR",
      website: "pavconhecimento.pt",
      notes: "Circus of Science exhibit is highlight; 2 hours",
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
      name: "Dinner at Nunes Real Marisqueira (splurge)",
      activity_type: "restaurant",
      start_time: "18:30",
      end_time: "19:30",
      location_name: "Nunes Real Marisqueira",
      address: "Rua Bartolomeu Dias 172, 1400-031 Lisboa",
      google_maps_url: "https://maps.google.com/?q=Nunes+Marisqueira+Belem",
      why_its_great: "Art deco seafood temple; special occasion",
      kid_friendliness: "High chairs; grilled fish for kids",
      kid_rating: 4,
      cost_estimate: 150,
      cost_currency: "EUR",
      website: "nunesmarisqueira.pt",
      reservation_required: true,
      notes: "Splurge night; seafood rice to share",
      priority: "must_do",
    },
  ],

  // DAY 4: Forest & Beach Scout
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
      name: "Monsanto Forest Park – Alvito Playground",
      activity_type: "hike",
      start_time: "09:00",
      end_time: "11:30",
      location_name: "Parque do Alvito",
      address: "Monsanto, Lisboa",
      google_maps_url: "https://maps.google.com/?q=Parque+Alvito+Monsanto+Lisboa",
      why_its_great: "Best free activity for young children in Lisbon",
      kid_friendliness: "All ages; huge adventure playground",
      kid_rating: 5,
      cost_estimate: 0,
      cost_currency: "EUR",
      notes: "Park at Alvito (free); 1-2hr playground + 1-2km trail",
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
      notes: "Long rest – Sintra tomorrow",
      priority: "must_do",
    },
    {
      name: "Scout Cascais beaches",
      activity_type: "beach",
      start_time: "16:30",
      end_time: "18:30",
      location_name: "Praia da Conceição",
      address: "Cascais",
      google_maps_url: "https://maps.google.com/?q=Praia+da+Conceicao+Cascais",
      why_its_great: "Best family beach; calm shallow water",
      kid_friendliness: "Perfect all ages; lifeguards; facilities",
      kid_rating: 5,
      cost_estimate: 5,
      cost_currency: "EUR",
      notes: "Preview before move to Cascais",
      priority: "recommended",
    },
    {
      name: "Dinner at Beira Mar",
      activity_type: "restaurant",
      start_time: "18:30",
      end_time: "19:30",
      location_name: "Beira Mar",
      address: "Rua das Flores 6, 2750-348 Cascais",
      google_maps_url: "https://maps.google.com/?q=Beira+Mar+Cascais",
      why_its_great: "45-year family institution; Travelers Choice 2024",
      kid_friendliness: "Perfect for families; wheelchair accessible",
      kid_rating: 5,
      cost_estimate: 80,
      cost_currency: "EUR",
      website: "restaurantebeiramar.pt",
      reservation_required: true,
      notes: "CLOSED TUESDAYS; excellent sole and sea bass",
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

  // DAY 5: Sintra Adventure
  "2026-06-19": [
    {
      name: "Early breakfast",
      activity_type: "restaurant",
      start_time: "07:30",
      end_time: "08:00",
      location_name: "Hyatt Regency",
      gear_prep: "Pack: carrier, jackets, snacks, water, sunscreen",
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
      gear_prep: "Download offline maps; spotty phone signal",
      cost_estimate: 2,
      cost_currency: "EUR",
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
      why_its_great: "BEST PALACE FOR KIDS – tunnels, Initiation Well, caves",
      kid_friendliness: "10/10 – Hide and seek heaven; tunnels are magic",
      kid_rating: 5,
      gear_prep: "Book online; carrier for 3yo; flashlight for tunnels",
      cost_estimate: 30,
      cost_currency: "EUR",
      website: "regaleira.pt",
      reservation_required: true,
      notes: "GO TO INITIATION WELL FIRST; 3+ hours; kids run free",
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
      why_its_great: "Perfect location; excellent petiscos",
      kid_friendliness: "Tapas style; highchairs available",
      kid_rating: 5,
      cost_estimate: 60,
      cost_currency: "EUR",
      website: "tascantiga.pt",
      reservation_required: true,
      notes: "Regional tapas; terrace seating",
      priority: "must_do",
    },
    {
      name: "Cabo da Roca",
      activity_type: "activity",
      start_time: "13:30",
      end_time: "14:30",
      location_name: "Cabo da Roca",
      address: "Estrada do Cabo da Roca, Colares",
      google_maps_url: "https://maps.google.com/?q=Cabo+da+Roca",
      why_its_great: "Westernmost point of Europe – dramatic cliffs",
      kid_friendliness: "HOLD CHILDREN (dangerous cliffs, windy)",
      kid_rating: 3,
      gear_prep: "Jackets – 10°C cooler than Lisbon",
      cost_estimate: 10,
      cost_currency: "EUR",
      notes: "Photo at monument; buy certificate (€5-10)",
      priority: "recommended",
    },
    {
      name: "Drive to Cascais + check-in",
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
      name: "Rest/Pool at hotel",
      activity_type: "activity",
      start_time: "15:30",
      end_time: "17:30",
      location_name: "Hotel pool",
      why_its_great: "Recovery from big morning",
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
      why_its_great: "Beautiful harbor; ice cream shops",
      kid_friendliness: "Easy strolling; watch boats",
      kid_rating: 5,
      notes: "Santini has excellent gelato",
      priority: "recommended",
    },
    {
      name: "Dinner at marina",
      activity_type: "restaurant",
      start_time: "19:00",
      end_time: "20:00",
      location_name: "Marina de Cascais",
      google_maps_url: "https://maps.google.com/?q=Marina+Cascais",
      why_its_great: "Waterfront petiscos; boat watching",
      kid_rating: 4,
      cost_estimate: 70,
      cost_currency: "EUR",
      notes: "Or try Marisco na Praça for seafood",
      priority: "recommended",
    },
  ],

  // DAY 6: Beach Day
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
      why_its_great: "Tiny protected cove; calmest water",
      kid_friendliness: "Crystal clear calm water perfect ages 3-7",
      kid_rating: 5,
      gear_prep: "Arrive early; bring sand toys",
      cost_estimate: 5,
      cost_currency: "EUR",
      notes: "Lifeguards; tide pools to explore",
      priority: "must_do",
    },
    {
      name: "Walk to Cascais center",
      activity_type: "activity",
      start_time: "11:30",
      end_time: "12:00",
      location_name: "Cascais pedestrian streets",
      why_its_great: "Window shopping; gelato",
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
      name: "Pool time",
      activity_type: "activity",
      start_time: "15:00",
      end_time: "16:00",
      location_name: "Hotel",
      notes: "Brief swim before afternoon",
      priority: "recommended",
    },
    {
      name: "Coastal walk to Boca do Inferno",
      activity_type: "hike",
      start_time: "16:30",
      end_time: "18:30",
      location_name: "Boca do Inferno",
      google_maps_url: "https://maps.google.com/?q=Boca+do+Inferno+Cascais",
      why_its_great: "Dramatic sea arch; paved path; stroller-friendly",
      kid_friendliness: "Flat cycle path; 2km one-way",
      kid_rating: 5,
      gear_prep: "Stroller; water; hat",
      notes: "40-min walk; café at destination; KIDS AWAY FROM EDGES",
      priority: "must_do",
    },
    {
      name: "Dinner at Monte Mar",
      activity_type: "restaurant",
      start_time: "18:30",
      end_time: "19:30",
      location_name: "Monte Mar",
      address: "Av. Nossa Senhora do Cabo 2845, Guincho",
      google_maps_url: "https://maps.google.com/?q=Monte+Mar+Cascais",
      why_its_great: "Waves crash beside tables; kids activities weekends",
      kid_friendliness: "Monte Mar Kids menu; entertainment",
      kid_rating: 5,
      cost_estimate: 120,
      cost_currency: "EUR",
      website: "montemar.pt",
      reservation_required: true,
      notes: "Best waterfront dinner; 15-min drive to Guincho",
      priority: "must_do",
    },
  ],

  // DAY 7: Horses & Beach
  "2026-06-21": [
    {
      name: "Early breakfast",
      activity_type: "restaurant",
      start_time: "08:00",
      end_time: "08:30",
      location_name: "Hotel",
      gear_prep: "Closed-toe shoes; long pants for riding",
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
      why_its_great: "BEST FOR 3YO – accepts ages 2-5 on pony Ruca",
      kid_friendliness: "3yo: Pony ride; 5 & 7yo: Lessons",
      kid_rating: 5,
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
      name: "Lunch + Rest",
      activity_type: "restaurant",
      start_time: "12:00",
      end_time: "15:00",
      location_name: "Hotel or beach facilities",
      why_its_great: "Recovery from morning",
      kid_friendliness: "3yo naps; older kids play",
      notes: "Umbrella/shade essential",
      priority: "must_do",
    },
    {
      name: "Extended beach – Praia da Conceição",
      activity_type: "beach",
      start_time: "15:30",
      end_time: "18:00",
      location_name: "Praia da Conceição",
      google_maps_url: "https://maps.google.com/?q=Praia+da+Conceicao+Cascais",
      why_its_great: "Widest beach; calmest water; full facilities",
      kid_friendliness: "Paddle boards, kayaks for 7yo",
      kid_rating: 5,
      cost_estimate: 20,
      cost_currency: "EUR",
      notes: "Sandcastles; lifeguards on duty",
      priority: "must_do",
    },
    {
      name: "Sunset stroll",
      activity_type: "activity",
      start_time: "18:00",
      end_time: "19:00",
      location_name: "Cascais promenade",
      why_its_great: "Golden hour",
      priority: "recommended",
    },
    {
      name: "Casual dinner",
      activity_type: "restaurant",
      start_time: "19:00",
      end_time: "20:00",
      location_name: "Beira Mar or marina",
      cost_estimate: 80,
      cost_currency: "EUR",
      notes: "Beira Mar CLOSED Tuesdays",
      priority: "recommended",
    },
  ],

  // DAY 8: Departure
  "2026-06-22": [
    {
      name: "Breakfast at hotel",
      activity_type: "restaurant",
      start_time: "08:00",
      end_time: "08:30",
      location_name: "Hotel",
      gear_prep: "Pack bags; load car",
      notes: "Check out (leave bags if needed)",
      priority: "must_do",
    },
    {
      name: "Ciclovia do Guincho – Family bike ride",
      activity_type: "activity",
      start_time: "08:45",
      end_time: "11:00",
      location_name: "Cascais Marina coastal path",
      google_maps_url: "https://maps.google.com/?q=Ciclovia+Guincho+Cascais",
      why_its_great: "Flat coastal path; FREE bikes (Bicas program)",
      kid_friendliness: "7yo: Own bike; 5yo: Trailer; 3yo: Seat",
      kid_rating: 5,
      cost_estimate: 0,
      cost_currency: "EUR",
      notes: "First 2km with young kids; 10km total; windy!",
      priority: "recommended",
    },
    {
      name: "Final Cascais exploration",
      activity_type: "activity",
      start_time: "11:00",
      end_time: "12:00",
      location_name: "Cascais pedestrian center",
      why_its_great: "Souvenirs; ice cream",
      notes: "Santini gelato; browse shops",
      priority: "optional",
    },
    {
      name: "Early lunch",
      activity_type: "restaurant",
      start_time: "12:00",
      end_time: "13:00",
      location_name: "Hotel or Cascais center",
      notes: "Quick if traveling onward",
      priority: "must_do",
    },
    {
      name: "Depart for next destination",
      activity_type: "transport",
      start_time: "13:00",
      duration_minutes: 180,
      notes: "Onward to next Portugal adventure!",
      priority: "must_do",
    },
  ],
};

async function supabaseRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.method === "POST" ? "return=representation" : "return=minimal",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase error ${response.status}: ${text}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function main() {
  console.log("🇵🇹 Importing Portugal itinerary...\n");

  // 1. Get existing days
  const days = await supabaseRequest(
    `trip_days?trip_id=eq.${TRIP_ID}&select=id,date,day_number&order=date`
  );
  console.log(`Found ${days.length} days in trip\n`);

  // Create date -> dayId map
  const dayIdByDate: Record<string, string> = {};
  for (const day of days) {
    dayIdByDate[day.date] = day.id;
  }

  // 2. Update day themes and titles
  console.log("📝 Updating day themes...");
  for (const [date, update] of Object.entries(DAY_UPDATES)) {
    const dayId = dayIdByDate[date];
    if (!dayId) continue;

    await supabaseRequest(`trip_days?id=eq.${dayId}`, {
      method: "PATCH",
      body: JSON.stringify(update),
    });
    console.log(`  ✓ ${date}: ${update.title}`);
  }

  // 3. Clear existing activities for these days (to avoid duplicates)
  console.log("\n🗑️  Clearing existing activities...");
  const datesToClear = Object.keys(ACTIVITIES_BY_DAY);
  const dayIdsToClear = datesToClear.map((d) => dayIdByDate[d]).filter(Boolean);

  if (dayIdsToClear.length > 0) {
    await supabaseRequest(
      `trip_activities?day_id=in.(${dayIdsToClear.join(",")})`,
      { method: "DELETE" }
    );
    console.log(`  Cleared activities for ${dayIdsToClear.length} days`);
  }

  // 4. Insert activities
  console.log("\n📅 Importing activities...\n");
  let totalCreated = 0;

  for (const [date, activities] of Object.entries(ACTIVITIES_BY_DAY)) {
    const dayId = dayIdByDate[date];
    if (!dayId) {
      console.log(`⚠️  No day found for ${date}, skipping...`);
      continue;
    }

    console.log(`Day: ${date} (${DAY_UPDATES[date]?.title || "Unknown"})`);

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];

      const activityData = {
        trip_id: TRIP_ID,
        day_id: dayId,
        name: activity.name,
        activity_type: activity.activity_type,
        start_time: activity.start_time,
        end_time: activity.end_time || null,
        duration_minutes: activity.duration_minutes || null,
        location_name: activity.location_name || null,
        address: activity.address || null,
        google_maps_url: activity.google_maps_url || null,
        why_its_great: activity.why_its_great || null,
        kid_friendliness: activity.kid_friendliness || null,
        kid_rating: activity.kid_rating || null,
        gear_prep: activity.gear_prep || null,
        cost_estimate: activity.cost_estimate || null,
        cost_currency: activity.cost_currency || "EUR",
        website: activity.website || null,
        phone: activity.phone || null,
        reservation_required: activity.reservation_required || false,
        notes: activity.notes || null,
        priority: activity.priority || null,
        sort_order: i,
      };

      try {
        await supabaseRequest("trip_activities", {
          method: "POST",
          body: JSON.stringify(activityData),
        });
        console.log(`  ✓ ${activity.start_time} - ${activity.name}`);
        totalCreated++;
      } catch (error) {
        console.log(`  ✗ ${activity.name}: ${error}`);
      }
    }
    console.log("");
  }

  console.log("=".repeat(50));
  console.log(`✅ Import complete! Created ${totalCreated} activities`);
  console.log(`\n🔗 View at: http://localhost:3000/travel/${TRIP_ID}/itinerary`);
}

main().catch(console.error);
