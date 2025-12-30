/**
 * Comprehensive Biomarker Reference Data
 * Contains standard biomarkers with reference ranges, optimal ranges, and metadata
 */

export interface BiomarkerReference {
  name: string;
  aliases: string[];  // Alternative names for matching
  category: string;
  unit: string;
  alternateUnits?: string[];  // For unit conversion
  referenceRange: { low: number; high: number };
  optimalRange: { low: number; high: number };
  description?: string;
}

export const BIOMARKER_REFERENCE: BiomarkerReference[] = [
  // ==================== METABOLIC ====================
  {
    name: "Fasting Glucose",
    aliases: ["Glucose", "Blood Glucose", "FBG", "Fasting Blood Glucose", "Serum Glucose"],
    category: "metabolic",
    unit: "mg/dL",
    referenceRange: { low: 70, high: 100 },
    optimalRange: { low: 72, high: 88 },
    description: "Blood sugar level after fasting"
  },
  {
    name: "HbA1c",
    aliases: ["Hemoglobin A1c", "Glycated Hemoglobin", "A1C", "Glycohemoglobin"],
    category: "metabolic",
    unit: "%",
    referenceRange: { low: 4.0, high: 5.7 },
    optimalRange: { low: 4.0, high: 5.3 },
    description: "3-month average blood sugar"
  },
  {
    name: "Fasting Insulin",
    aliases: ["Insulin", "Serum Insulin"],
    category: "metabolic",
    unit: "uIU/mL",
    alternateUnits: ["μIU/mL", "mU/L"],
    referenceRange: { low: 2.6, high: 24.9 },
    optimalRange: { low: 2, high: 8 },
    description: "Insulin level after fasting"
  },
  {
    name: "HOMA-IR",
    aliases: ["Homeostatic Model Assessment", "Insulin Resistance Index"],
    category: "metabolic",
    unit: "ratio",
    referenceRange: { low: 0, high: 2.5 },
    optimalRange: { low: 0, high: 1.5 },
    description: "Insulin resistance indicator"
  },

  // ==================== LIPIDS ====================
  {
    name: "Total Cholesterol",
    aliases: ["Cholesterol", "TC", "Serum Cholesterol"],
    category: "lipid",
    unit: "mg/dL",
    referenceRange: { low: 0, high: 200 },
    optimalRange: { low: 150, high: 200 },
    description: "Total blood cholesterol"
  },
  {
    name: "LDL Cholesterol",
    aliases: ["LDL", "LDL-C", "Low Density Lipoprotein", "Bad Cholesterol"],
    category: "lipid",
    unit: "mg/dL",
    referenceRange: { low: 0, high: 100 },
    optimalRange: { low: 0, high: 70 },
    description: "Low-density lipoprotein cholesterol"
  },
  {
    name: "HDL Cholesterol",
    aliases: ["HDL", "HDL-C", "High Density Lipoprotein", "Good Cholesterol"],
    category: "lipid",
    unit: "mg/dL",
    referenceRange: { low: 40, high: 200 },
    optimalRange: { low: 60, high: 100 },
    description: "High-density lipoprotein cholesterol"
  },
  {
    name: "Triglycerides",
    aliases: ["TG", "Trigs", "Triglyceride"],
    category: "lipid",
    unit: "mg/dL",
    referenceRange: { low: 0, high: 150 },
    optimalRange: { low: 0, high: 70 },
    description: "Blood fat level"
  },
  {
    name: "VLDL Cholesterol",
    aliases: ["VLDL", "Very Low Density Lipoprotein"],
    category: "lipid",
    unit: "mg/dL",
    referenceRange: { low: 0, high: 30 },
    optimalRange: { low: 0, high: 20 },
    description: "Very low-density lipoprotein"
  },
  {
    name: "Lp(a)",
    aliases: ["Lipoprotein(a)", "Lipoprotein A", "Lp-a"],
    category: "lipid",
    unit: "nmol/L",
    alternateUnits: ["mg/dL"],
    referenceRange: { low: 0, high: 75 },
    optimalRange: { low: 0, high: 30 },
    description: "Genetic cardiovascular risk marker"
  },
  {
    name: "ApoB",
    aliases: ["Apolipoprotein B", "Apo B", "ApoB-100"],
    category: "lipid",
    unit: "mg/dL",
    referenceRange: { low: 0, high: 100 },
    optimalRange: { low: 0, high: 70 },
    description: "Particle count marker for cardiovascular risk"
  },

  // ==================== THYROID ====================
  {
    name: "TSH",
    aliases: ["Thyroid Stimulating Hormone", "Thyrotropin"],
    category: "thyroid",
    unit: "mIU/L",
    alternateUnits: ["uIU/mL", "μIU/mL"],
    referenceRange: { low: 0.4, high: 4.0 },
    optimalRange: { low: 1.0, high: 2.5 },
    description: "Thyroid function regulator"
  },
  {
    name: "Free T4",
    aliases: ["FT4", "Free Thyroxine", "Thyroxine Free"],
    category: "thyroid",
    unit: "ng/dL",
    referenceRange: { low: 0.8, high: 1.8 },
    optimalRange: { low: 1.0, high: 1.5 },
    description: "Active thyroid hormone"
  },
  {
    name: "Free T3",
    aliases: ["FT3", "Free Triiodothyronine", "Triiodothyronine Free"],
    category: "thyroid",
    unit: "pg/mL",
    referenceRange: { low: 2.3, high: 4.2 },
    optimalRange: { low: 3.0, high: 4.0 },
    description: "Most active thyroid hormone"
  },
  {
    name: "Reverse T3",
    aliases: ["rT3", "RT3"],
    category: "thyroid",
    unit: "ng/dL",
    referenceRange: { low: 9.2, high: 24.1 },
    optimalRange: { low: 9, high: 18 },
    description: "Inactive thyroid hormone"
  },
  {
    name: "TPO Antibodies",
    aliases: ["Thyroid Peroxidase Antibodies", "Anti-TPO", "TPOAb"],
    category: "thyroid",
    unit: "IU/mL",
    referenceRange: { low: 0, high: 34 },
    optimalRange: { low: 0, high: 10 },
    description: "Autoimmune thyroid marker"
  },

  // ==================== HORMONES ====================
  {
    name: "Testosterone",
    aliases: ["Total Testosterone", "Serum Testosterone"],
    category: "hormone",
    unit: "ng/dL",
    referenceRange: { low: 300, high: 1000 },
    optimalRange: { low: 600, high: 900 },
    description: "Primary male sex hormone"
  },
  {
    name: "Free Testosterone",
    aliases: ["Free T", "Testosterone Free"],
    category: "hormone",
    unit: "pg/mL",
    referenceRange: { low: 9, high: 30 },
    optimalRange: { low: 15, high: 25 },
    description: "Bioavailable testosterone"
  },
  {
    name: "Estradiol",
    aliases: ["E2", "Estrogen"],
    category: "hormone",
    unit: "pg/mL",
    referenceRange: { low: 10, high: 40 },
    optimalRange: { low: 20, high: 35 },
    description: "Primary estrogen"
  },
  {
    name: "SHBG",
    aliases: ["Sex Hormone Binding Globulin"],
    category: "hormone",
    unit: "nmol/L",
    referenceRange: { low: 10, high: 57 },
    optimalRange: { low: 20, high: 40 },
    description: "Hormone transport protein"
  },
  {
    name: "DHEA-S",
    aliases: ["DHEA Sulfate", "Dehydroepiandrosterone Sulfate", "DHEAS"],
    category: "hormone",
    unit: "mcg/dL",
    alternateUnits: ["μg/dL", "ug/dL"],
    referenceRange: { low: 80, high: 560 },
    optimalRange: { low: 200, high: 400 },
    description: "Adrenal hormone precursor"
  },
  {
    name: "Cortisol",
    aliases: ["Morning Cortisol", "Serum Cortisol", "AM Cortisol"],
    category: "hormone",
    unit: "mcg/dL",
    alternateUnits: ["μg/dL", "ug/dL"],
    referenceRange: { low: 6, high: 23 },
    optimalRange: { low: 10, high: 18 },
    description: "Stress hormone (AM levels)"
  },
  {
    name: "IGF-1",
    aliases: ["Insulin-like Growth Factor 1", "Somatomedin C"],
    category: "hormone",
    unit: "ng/mL",
    referenceRange: { low: 100, high: 300 },
    optimalRange: { low: 150, high: 250 },
    description: "Growth hormone marker"
  },
  {
    name: "Progesterone",
    aliases: ["Serum Progesterone"],
    category: "hormone",
    unit: "ng/mL",
    referenceRange: { low: 0.1, high: 25 },
    optimalRange: { low: 1, high: 20 },
    description: "Female reproductive hormone"
  },
  {
    name: "LH",
    aliases: ["Luteinizing Hormone"],
    category: "hormone",
    unit: "mIU/mL",
    referenceRange: { low: 1.5, high: 9.3 },
    optimalRange: { low: 3, high: 7 },
    description: "Reproductive hormone"
  },
  {
    name: "FSH",
    aliases: ["Follicle Stimulating Hormone"],
    category: "hormone",
    unit: "mIU/mL",
    referenceRange: { low: 1.5, high: 12.4 },
    optimalRange: { low: 3, high: 9 },
    description: "Reproductive hormone"
  },
  {
    name: "Prolactin",
    aliases: ["PRL"],
    category: "hormone",
    unit: "ng/mL",
    referenceRange: { low: 2, high: 18 },
    optimalRange: { low: 5, high: 15 },
    description: "Pituitary hormone"
  },

  // ==================== VITAMINS ====================
  {
    name: "Vitamin D",
    aliases: ["25-OH Vitamin D", "25-Hydroxyvitamin D", "Vitamin D 25-Hydroxy", "25(OH)D", "Calcidiol"],
    category: "vitamin",
    unit: "ng/mL",
    referenceRange: { low: 30, high: 100 },
    optimalRange: { low: 50, high: 80 },
    description: "Essential vitamin for bone and immune health"
  },
  {
    name: "Vitamin B12",
    aliases: ["B12", "Cobalamin", "Cyanocobalamin"],
    category: "vitamin",
    unit: "pg/mL",
    referenceRange: { low: 200, high: 900 },
    optimalRange: { low: 500, high: 800 },
    description: "Essential for nerve function"
  },
  {
    name: "Folate",
    aliases: ["Folic Acid", "Vitamin B9", "Serum Folate"],
    category: "vitamin",
    unit: "ng/mL",
    referenceRange: { low: 3, high: 20 },
    optimalRange: { low: 10, high: 20 },
    description: "B vitamin for cell division"
  },
  {
    name: "Vitamin A",
    aliases: ["Retinol", "Serum Retinol"],
    category: "vitamin",
    unit: "mcg/dL",
    alternateUnits: ["μg/dL"],
    referenceRange: { low: 30, high: 80 },
    optimalRange: { low: 50, high: 70 },
    description: "Fat-soluble vitamin"
  },
  {
    name: "Vitamin E",
    aliases: ["Alpha Tocopherol", "Tocopherol"],
    category: "vitamin",
    unit: "mg/L",
    referenceRange: { low: 5.5, high: 17 },
    optimalRange: { low: 8, high: 14 },
    description: "Antioxidant vitamin"
  },

  // ==================== MINERALS ====================
  {
    name: "Ferritin",
    aliases: ["Serum Ferritin"],
    category: "mineral",
    unit: "ng/mL",
    referenceRange: { low: 30, high: 400 },
    optimalRange: { low: 50, high: 150 },
    description: "Iron storage marker"
  },
  {
    name: "Iron",
    aliases: ["Serum Iron", "Iron Level"],
    category: "mineral",
    unit: "mcg/dL",
    alternateUnits: ["μg/dL", "ug/dL"],
    referenceRange: { low: 60, high: 170 },
    optimalRange: { low: 80, high: 140 },
    description: "Blood iron level"
  },
  {
    name: "TIBC",
    aliases: ["Total Iron Binding Capacity"],
    category: "mineral",
    unit: "mcg/dL",
    alternateUnits: ["μg/dL", "ug/dL"],
    referenceRange: { low: 250, high: 400 },
    optimalRange: { low: 275, high: 350 },
    description: "Iron transport capacity"
  },
  {
    name: "Transferrin Saturation",
    aliases: ["Iron Saturation", "TSAT", "% Saturation"],
    category: "mineral",
    unit: "%",
    referenceRange: { low: 20, high: 50 },
    optimalRange: { low: 25, high: 45 },
    description: "Iron transport utilization"
  },
  {
    name: "Magnesium",
    aliases: ["Serum Magnesium", "Mg"],
    category: "mineral",
    unit: "mg/dL",
    referenceRange: { low: 1.7, high: 2.2 },
    optimalRange: { low: 2.0, high: 2.4 },
    description: "Essential mineral"
  },
  {
    name: "RBC Magnesium",
    aliases: ["Red Blood Cell Magnesium", "Intracellular Magnesium"],
    category: "mineral",
    unit: "mg/dL",
    referenceRange: { low: 4.2, high: 6.8 },
    optimalRange: { low: 5.5, high: 6.5 },
    description: "Cellular magnesium level"
  },
  {
    name: "Zinc",
    aliases: ["Serum Zinc", "Plasma Zinc"],
    category: "mineral",
    unit: "mcg/dL",
    alternateUnits: ["μg/dL", "ug/dL"],
    referenceRange: { low: 60, high: 120 },
    optimalRange: { low: 80, high: 110 },
    description: "Essential trace mineral"
  },
  {
    name: "Copper",
    aliases: ["Serum Copper"],
    category: "mineral",
    unit: "mcg/dL",
    alternateUnits: ["μg/dL", "ug/dL"],
    referenceRange: { low: 70, high: 155 },
    optimalRange: { low: 80, high: 130 },
    description: "Essential trace mineral"
  },
  {
    name: "Selenium",
    aliases: ["Serum Selenium"],
    category: "mineral",
    unit: "mcg/L",
    alternateUnits: ["μg/L", "ng/mL"],
    referenceRange: { low: 70, high: 150 },
    optimalRange: { low: 100, high: 140 },
    description: "Antioxidant mineral"
  },
  {
    name: "Calcium",
    aliases: ["Serum Calcium", "Total Calcium", "Ca"],
    category: "mineral",
    unit: "mg/dL",
    referenceRange: { low: 8.6, high: 10.2 },
    optimalRange: { low: 9.0, high: 10.0 },
    description: "Essential mineral for bones"
  },
  {
    name: "Phosphorus",
    aliases: ["Phosphate", "Inorganic Phosphorus"],
    category: "mineral",
    unit: "mg/dL",
    referenceRange: { low: 2.5, high: 4.5 },
    optimalRange: { low: 3.0, high: 4.0 },
    description: "Essential mineral"
  },

  // ==================== INFLAMMATION ====================
  {
    name: "hs-CRP",
    aliases: ["C-Reactive Protein", "CRP", "High Sensitivity CRP", "Cardio CRP"],
    category: "inflammation",
    unit: "mg/L",
    referenceRange: { low: 0, high: 3 },
    optimalRange: { low: 0, high: 1 },
    description: "Inflammation marker"
  },
  {
    name: "Homocysteine",
    aliases: ["Plasma Homocysteine", "Hcy"],
    category: "inflammation",
    unit: "umol/L",
    alternateUnits: ["μmol/L", "mcmol/L"],
    referenceRange: { low: 5, high: 15 },
    optimalRange: { low: 6, high: 9 },
    description: "Cardiovascular risk marker"
  },
  {
    name: "ESR",
    aliases: ["Erythrocyte Sedimentation Rate", "Sed Rate"],
    category: "inflammation",
    unit: "mm/hr",
    referenceRange: { low: 0, high: 20 },
    optimalRange: { low: 0, high: 10 },
    description: "General inflammation marker"
  },
  {
    name: "Fibrinogen",
    aliases: ["Plasma Fibrinogen"],
    category: "inflammation",
    unit: "mg/dL",
    referenceRange: { low: 200, high: 400 },
    optimalRange: { low: 200, high: 300 },
    description: "Clotting and inflammation marker"
  },
  {
    name: "Uric Acid",
    aliases: ["Serum Uric Acid"],
    category: "inflammation",
    unit: "mg/dL",
    referenceRange: { low: 3.5, high: 7.2 },
    optimalRange: { low: 4, high: 6 },
    description: "Metabolic byproduct and inflammation marker"
  },

  // ==================== LIVER ====================
  {
    name: "ALT",
    aliases: ["Alanine Aminotransferase", "SGPT", "GPT"],
    category: "liver",
    unit: "U/L",
    referenceRange: { low: 7, high: 56 },
    optimalRange: { low: 10, high: 30 },
    description: "Liver enzyme"
  },
  {
    name: "AST",
    aliases: ["Aspartate Aminotransferase", "SGOT", "GOT"],
    category: "liver",
    unit: "U/L",
    referenceRange: { low: 10, high: 40 },
    optimalRange: { low: 10, high: 26 },
    description: "Liver/muscle enzyme"
  },
  {
    name: "GGT",
    aliases: ["Gamma-Glutamyl Transferase", "GGTP", "Gamma GT"],
    category: "liver",
    unit: "U/L",
    referenceRange: { low: 8, high: 61 },
    optimalRange: { low: 10, high: 30 },
    description: "Liver enzyme"
  },
  {
    name: "ALP",
    aliases: ["Alkaline Phosphatase", "Alk Phos"],
    category: "liver",
    unit: "U/L",
    referenceRange: { low: 44, high: 147 },
    optimalRange: { low: 50, high: 100 },
    description: "Liver/bone enzyme"
  },
  {
    name: "Bilirubin Total",
    aliases: ["Total Bilirubin", "TBIL"],
    category: "liver",
    unit: "mg/dL",
    referenceRange: { low: 0.1, high: 1.2 },
    optimalRange: { low: 0.3, high: 1.0 },
    description: "Liver function marker"
  },
  {
    name: "Albumin",
    aliases: ["Serum Albumin"],
    category: "liver",
    unit: "g/dL",
    referenceRange: { low: 3.5, high: 5.5 },
    optimalRange: { low: 4.2, high: 5.0 },
    description: "Liver protein production"
  },

  // ==================== KIDNEY ====================
  {
    name: "Creatinine",
    aliases: ["Serum Creatinine", "Blood Creatinine"],
    category: "kidney",
    unit: "mg/dL",
    referenceRange: { low: 0.7, high: 1.3 },
    optimalRange: { low: 0.8, high: 1.1 },
    description: "Kidney function marker"
  },
  {
    name: "BUN",
    aliases: ["Blood Urea Nitrogen", "Urea Nitrogen"],
    category: "kidney",
    unit: "mg/dL",
    referenceRange: { low: 7, high: 20 },
    optimalRange: { low: 10, high: 16 },
    description: "Kidney function marker"
  },
  {
    name: "eGFR",
    aliases: ["Estimated GFR", "GFR", "Glomerular Filtration Rate"],
    category: "kidney",
    unit: "mL/min/1.73m2",
    referenceRange: { low: 60, high: 200 },
    optimalRange: { low: 90, high: 120 },
    description: "Kidney filtration rate"
  },
  {
    name: "BUN/Creatinine Ratio",
    aliases: ["BUN:Creatinine", "Urea/Creatinine Ratio"],
    category: "kidney",
    unit: "ratio",
    referenceRange: { low: 10, high: 20 },
    optimalRange: { low: 12, high: 18 },
    description: "Kidney function ratio"
  },

  // ==================== BLOOD/CBC ====================
  {
    name: "Hemoglobin",
    aliases: ["Hgb", "Hb"],
    category: "blood",
    unit: "g/dL",
    referenceRange: { low: 13.5, high: 17.5 },
    optimalRange: { low: 14, high: 16 },
    description: "Oxygen-carrying protein"
  },
  {
    name: "Hematocrit",
    aliases: ["Hct", "HCT"],
    category: "blood",
    unit: "%",
    referenceRange: { low: 38.8, high: 50 },
    optimalRange: { low: 42, high: 48 },
    description: "Red blood cell volume percentage"
  },
  {
    name: "RBC",
    aliases: ["Red Blood Cells", "Red Blood Cell Count", "Erythrocytes"],
    category: "blood",
    unit: "M/uL",
    alternateUnits: ["million/μL", "10^6/μL"],
    referenceRange: { low: 4.5, high: 5.5 },
    optimalRange: { low: 4.7, high: 5.3 },
    description: "Red blood cell count"
  },
  {
    name: "WBC",
    aliases: ["White Blood Cells", "White Blood Cell Count", "Leukocytes"],
    category: "blood",
    unit: "K/uL",
    alternateUnits: ["thousand/μL", "10^3/μL"],
    referenceRange: { low: 4.5, high: 11 },
    optimalRange: { low: 5, high: 8 },
    description: "White blood cell count"
  },
  {
    name: "Platelets",
    aliases: ["Platelet Count", "PLT", "Thrombocytes"],
    category: "blood",
    unit: "K/uL",
    alternateUnits: ["thousand/μL", "10^3/μL"],
    referenceRange: { low: 150, high: 400 },
    optimalRange: { low: 175, high: 300 },
    description: "Blood clotting cells"
  },
  {
    name: "MCV",
    aliases: ["Mean Corpuscular Volume"],
    category: "blood",
    unit: "fL",
    referenceRange: { low: 80, high: 100 },
    optimalRange: { low: 85, high: 95 },
    description: "Average red blood cell size"
  },
  {
    name: "MCH",
    aliases: ["Mean Corpuscular Hemoglobin"],
    category: "blood",
    unit: "pg",
    referenceRange: { low: 27, high: 33 },
    optimalRange: { low: 28, high: 32 },
    description: "Average hemoglobin per red cell"
  },
  {
    name: "MCHC",
    aliases: ["Mean Corpuscular Hemoglobin Concentration"],
    category: "blood",
    unit: "g/dL",
    referenceRange: { low: 32, high: 36 },
    optimalRange: { low: 33, high: 35 },
    description: "Hemoglobin concentration in red cells"
  },
  {
    name: "RDW",
    aliases: ["Red Cell Distribution Width", "RDW-CV"],
    category: "blood",
    unit: "%",
    referenceRange: { low: 11.5, high: 14.5 },
    optimalRange: { low: 11.5, high: 13 },
    description: "Red cell size variation"
  },
  {
    name: "Neutrophils",
    aliases: ["Absolute Neutrophils", "Neutrophil Count", "ANC"],
    category: "blood",
    unit: "K/uL",
    referenceRange: { low: 1.5, high: 8 },
    optimalRange: { low: 2, high: 6 },
    description: "Immune cells (bacteria fighters)"
  },
  {
    name: "Lymphocytes",
    aliases: ["Absolute Lymphocytes", "Lymphocyte Count"],
    category: "blood",
    unit: "K/uL",
    referenceRange: { low: 1, high: 4.8 },
    optimalRange: { low: 1.5, high: 3.5 },
    description: "Immune cells (viral fighters)"
  },
  {
    name: "Monocytes",
    aliases: ["Absolute Monocytes", "Monocyte Count"],
    category: "blood",
    unit: "K/uL",
    referenceRange: { low: 0.2, high: 0.8 },
    optimalRange: { low: 0.2, high: 0.6 },
    description: "Immune cells (tissue repair)"
  },
  {
    name: "Eosinophils",
    aliases: ["Absolute Eosinophils", "Eosinophil Count"],
    category: "blood",
    unit: "K/uL",
    referenceRange: { low: 0, high: 0.5 },
    optimalRange: { low: 0, high: 0.3 },
    description: "Immune cells (allergy/parasite)"
  },
  {
    name: "Basophils",
    aliases: ["Absolute Basophils", "Basophil Count"],
    category: "blood",
    unit: "K/uL",
    referenceRange: { low: 0, high: 0.2 },
    optimalRange: { low: 0, high: 0.1 },
    description: "Immune cells (inflammation)"
  }
];

/**
 * Find matching biomarker reference by name
 */
export function findBiomarkerMatch(name: string): { match: BiomarkerReference | null; confidence: number } {
  const normalizedName = name.toLowerCase().trim();

  // Exact match on name
  for (const ref of BIOMARKER_REFERENCE) {
    if (ref.name.toLowerCase() === normalizedName) {
      return { match: ref, confidence: 1.0 };
    }
  }

  // Exact match on alias
  for (const ref of BIOMARKER_REFERENCE) {
    for (const alias of ref.aliases) {
      if (alias.toLowerCase() === normalizedName) {
        return { match: ref, confidence: 0.95 };
      }
    }
  }

  // Partial match on name
  for (const ref of BIOMARKER_REFERENCE) {
    if (normalizedName.includes(ref.name.toLowerCase()) || ref.name.toLowerCase().includes(normalizedName)) {
      return { match: ref, confidence: 0.8 };
    }
  }

  // Partial match on alias
  for (const ref of BIOMARKER_REFERENCE) {
    for (const alias of ref.aliases) {
      if (normalizedName.includes(alias.toLowerCase()) || alias.toLowerCase().includes(normalizedName)) {
        return { match: ref, confidence: 0.7 };
      }
    }
  }

  return { match: null, confidence: 0 };
}

/**
 * Get all biomarker names for AI prompt
 */
export function getBiomarkerNames(): string[] {
  return BIOMARKER_REFERENCE.map(b => b.name);
}

/**
 * Get biomarker by name
 */
export function getBiomarkerByName(name: string): BiomarkerReference | undefined {
  const { match } = findBiomarkerMatch(name);
  return match || undefined;
}
