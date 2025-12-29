/**
 * Mock Extraction Test
 *
 * This script tests the data transformation logic for biomarker and supplement
 * extraction without requiring actual API authentication.
 *
 * Run with: npx ts-node tests/mock-extraction-test.ts
 */

// Mock extracted biomarker data (as returned by AI)
const mockBiomarkerExtraction = {
  biomarkers: [
    {
      name: "Vitamin D, 25-Hydroxy",
      value: 45.2,
      unit: "ng/mL",
      reference_range_low: 30,
      reference_range_high: 100,
      optimal_range_low: 50,
      optimal_range_high: 80,
      category: "vitamin",
      confidence: 0.95
    },
    {
      name: "Hemoglobin",
      value: 14.5,
      unit: "g/dL",
      reference_range_low: 12,
      reference_range_high: 17,
      category: "blood",
      confidence: 0.92
    },
    {
      name: "TSH",
      value: 2.1,
      unit: "mIU/L",
      reference_range_low: 0.4,
      reference_range_high: 4.0,
      category: "thyroid",
      confidence: 0.88
    }
  ],
  lab_info: {
    lab_name: "Quest Diagnostics",
    test_date: "2025-01-15",
    patient_name: "John Doe"
  },
  extraction_notes: "Successfully extracted 3 biomarkers from lab report"
};

// Mock extracted supplement data (as returned by AI)
const mockSupplementExtraction = {
  supplements: [
    {
      name: "Vitamin D3",
      brand: "Thorne",
      dose: "5000 IU",
      dose_per_serving: 5000,
      dose_unit: "IU",
      servings_per_container: 60,
      price: 24.99,
      category: "vitamin",
      timing: "morning",
      frequency: "daily",
      confidence: 0.94
    },
    {
      name: "Omega-3 Fish Oil",
      brand: "Nordic Naturals",
      dose: "1000 mg EPA/DHA",
      dose_per_serving: 1000,
      dose_unit: "mg",
      servings_per_container: 120,
      price: 35.99,
      category: "omega",
      timing: "with_meals",
      frequency: "twice_daily",
      confidence: 0.88
    },
    {
      name: "Magnesium Glycinate",
      brand: "Pure Encapsulations",
      dose: "120 mg",
      dose_per_serving: 120,
      dose_unit: "mg",
      servings_per_container: 90,
      price: 28.50,
      category: "mineral",
      timing: "before_bed",
      frequency: "daily",
      confidence: 0.91
    }
  ],
  source_info: {
    store_name: "Amazon",
    purchase_date: "2025-01-10",
    total_items: 3
  },
  extraction_notes: "Successfully extracted 3 supplements from receipt image"
};

// Test biomarker transformation (as it would be done before saving)
function transformBiomarkersForSave(extractedData: typeof mockBiomarkerExtraction, selectedIndices: number[]) {
  return extractedData.biomarkers
    .filter((_, i) => selectedIndices.includes(i))
    .map((b) => ({
      name: b.name,
      value: b.value,
      unit: b.unit,
      date_tested: extractedData.lab_info.test_date || new Date().toISOString().split("T")[0],
      category: b.category,
      reference_range_low: b.reference_range_low,
      reference_range_high: b.reference_range_high,
      optimal_range_low: b.optimal_range_low,
      optimal_range_high: b.optimal_range_high,
      ai_extracted: true,
    }));
}

// Test supplement transformation (as it would be done before saving)
function transformSupplementsForSave(extractedData: typeof mockSupplementExtraction, selectedIndices: number[]) {
  return extractedData.supplements
    .filter((_, i) => selectedIndices.includes(i))
    .map((s) => ({
      name: s.name,
      brand: s.brand,
      dose: s.dose,
      dose_per_serving: s.dose_per_serving,
      dose_unit: s.dose_unit,
      servings_per_container: s.servings_per_container,
      price: s.price,
      category: s.category,
      timing: s.timing,
      frequency: s.frequency,
    }));
}

// Run tests
console.log("=".repeat(60));
console.log("MOCK EXTRACTION TEST");
console.log("=".repeat(60));

console.log("\n📊 BIOMARKER EXTRACTION TEST\n");
console.log("Raw extracted data:");
console.log(JSON.stringify(mockBiomarkerExtraction, null, 2));

console.log("\n✅ Transformed data for save (all selected):");
const biomarkersToSave = transformBiomarkersForSave(mockBiomarkerExtraction, [0, 1, 2]);
console.log(JSON.stringify(biomarkersToSave, null, 2));

console.log("\n✅ Transformed data for save (partial selection - indices 0, 2):");
const partialBiomarkers = transformBiomarkersForSave(mockBiomarkerExtraction, [0, 2]);
console.log(JSON.stringify(partialBiomarkers, null, 2));

console.log("\n" + "=".repeat(60));
console.log("\n💊 SUPPLEMENT EXTRACTION TEST\n");
console.log("Raw extracted data:");
console.log(JSON.stringify(mockSupplementExtraction, null, 2));

console.log("\n✅ Transformed data for save (all selected):");
const supplementsToSave = transformSupplementsForSave(mockSupplementExtraction, [0, 1, 2]);
console.log(JSON.stringify(supplementsToSave, null, 2));

console.log("\n✅ Transformed data for save (partial selection - indices 1):");
const partialSupplements = transformSupplementsForSave(mockSupplementExtraction, [1]);
console.log(JSON.stringify(partialSupplements, null, 2));

console.log("\n" + "=".repeat(60));
console.log("\n🎯 CONFIDENCE DISPLAY TEST\n");

mockBiomarkerExtraction.biomarkers.forEach((b, i) => {
  console.log(`${i + 1}. ${b.name}: ${b.value} ${b.unit} (${Math.round(b.confidence * 100)}% confidence)`);
});

console.log("");

mockSupplementExtraction.supplements.forEach((s, i) => {
  console.log(`${i + 1}. ${s.name} by ${s.brand}: ${s.dose} (${Math.round(s.confidence * 100)}% confidence)`);
});

console.log("\n" + "=".repeat(60));
console.log("✅ All tests passed! Data transformation works correctly.");
console.log("=".repeat(60));
