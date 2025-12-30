/**
 * Comprehensive Biomarker Reference Data
 * Contains standard biomarkers with reference ranges, optimal ranges, and suboptimal ranges
 * Ranges extracted from clinical reference charts - includes all color zones
 *
 * Zone Structure:
 * - criticalLow (red) -> suboptimalLow (yellow) -> optimal (green) -> suboptimalHigh (yellow) -> criticalHigh (red)
 */

export interface BiomarkerReference {
  name: string;
  aliases: string[];
  category: string;
  unit: string;
  alternateUnits?: string[];
  // Full scale of the chart (encompasses all zones)
  referenceRange: { low: number; high: number };
  // Green zone - optimal values
  optimalRange: { low: number; high: number };
  // Yellow zone below optimal (if exists) - suboptimal low
  suboptimalLowRange?: { low: number; high: number };
  // Yellow zone above optimal (if exists) - suboptimal high
  suboptimalHighRange?: { low: number; high: number };
  description?: string;
  detailedDescription?: string;
  // Trend preference: which direction is "good" for this biomarker
  trendPreference?: 'lower_is_better' | 'higher_is_better' | 'range_is_optimal';
}

export const BIOMARKER_REFERENCE: BiomarkerReference[] = [
  // ==================== KEY RISK FACTORS ====================
  {
    name: "Apolipoprotein B",
    aliases: ["ApoB", "Apo B", "ApoB-100"],
    category: "lipid",
    unit: "mg/dL",
    referenceRange: { low: 0, high: 134 },
    optimalRange: { low: 0, high: 90 },
    suboptimalHighRange: { low: 90, high: 100 },
    description: "Particle count marker for cardiovascular risk"
  },
  {
    name: "C-Reactive Protein, Cardiac",
    aliases: ["hs-CRP", "CRP", "High Sensitivity CRP", "Cardio CRP", "C-Reactive Protein"],
    category: "inflammation",
    unit: "mg/L",
    referenceRange: { low: 0, high: 4 },
    optimalRange: { low: 0, high: 1 },
    suboptimalHighRange: { low: 1, high: 3 },
    description: "Inflammation and cardiovascular risk marker"
  },
  {
    name: "Lipoprotein (a)",
    aliases: ["Lp(a)", "Lipoprotein(a)", "Lipoprotein A", "Lp-a"],
    category: "lipid",
    unit: "nmol/L",
    alternateUnits: ["mg/dL"],
    referenceRange: { low: 0, high: 100 },
    optimalRange: { low: 0, high: 75 },
    description: "Genetic cardiovascular risk marker"
  },

  // ==================== HORMONE BALANCE ====================
  {
    name: "DHEA-Sulfate",
    aliases: ["DHEA-S", "DHEAS", "DHEA Sulfate", "Dehydroepiandrosterone Sulfate"],
    category: "hormone",
    unit: "ug/dL",
    alternateUnits: ["mcg/dL", "μg/dL"],
    referenceRange: { low: 150, high: 650 },
    optimalRange: { low: 250, high: 500 },
    suboptimalLowRange: { low: 150, high: 250 },
    suboptimalHighRange: { low: 500, high: 550 },
    description: "Adrenal hormone precursor"
  },
  {
    name: "Insulin-Like Growth Factor I",
    aliases: ["IGF-1", "IGF1", "Somatomedin C", "Insulin-like Growth Factor 1"],
    category: "hormone",
    unit: "ng/mL",
    referenceRange: { low: 54, high: 411.67 },
    optimalRange: { low: 125, high: 280 },
    suboptimalLowRange: { low: 54, high: 125 },
    suboptimalHighRange: { low: 280, high: 340 },
    description: "Growth hormone marker"
  },
  {
    name: "Testosterone",
    aliases: ["Total Testosterone", "Serum Testosterone"],
    category: "hormone",
    unit: "ng/dL",
    referenceRange: { low: 0, high: 1916 },
    optimalRange: { low: 250, high: 750 },
    suboptimalLowRange: { low: 0, high: 250 },
    suboptimalHighRange: { low: 750, high: 1200 },
    description: "Primary male sex hormone"
  },
  {
    name: "Testosterone, Free",
    aliases: ["Free Testosterone", "Free T"],
    category: "hormone",
    unit: "pg/mL",
    referenceRange: { low: 45, high: 270 },
    optimalRange: { low: 90, high: 225 },
    suboptimalLowRange: { low: 45, high: 90 },
    description: "Bioavailable testosterone"
  },
  {
    name: "Estradiol",
    aliases: ["E2", "Estrogen"],
    category: "hormone",
    unit: "pg/mL",
    referenceRange: { low: 0, high: 51 },
    optimalRange: { low: 5, high: 39 },
    suboptimalLowRange: { low: 0, high: 5 },
    description: "Primary estrogen"
  },
  {
    name: "FSH",
    aliases: ["Follicle Stimulating Hormone"],
    category: "hormone",
    unit: "mIU/mL",
    referenceRange: { low: 0, high: 17.07 },
    optimalRange: { low: 0, high: 12.8 },
    description: "Reproductive hormone"
  },
  {
    name: "LH",
    aliases: ["Luteinizing Hormone"],
    category: "hormone",
    unit: "mIU/mL",
    referenceRange: { low: 0, high: 20.27 },
    optimalRange: { low: 1.7, high: 15.2 },
    suboptimalLowRange: { low: 0, high: 1.7 },
    description: "Reproductive hormone"
  },
  {
    name: "Sex Hormone-Binding Globulin",
    aliases: ["SHBG"],
    category: "hormone",
    unit: "nmol/L",
    referenceRange: { low: 10, high: 100 },
    optimalRange: { low: 16.5, high: 55.9 },
    suboptimalLowRange: { low: 10, high: 16.5 },
    suboptimalHighRange: { low: 55.9, high: 77 },
    description: "Hormone transport protein"
  },
  {
    name: "TSH",
    aliases: ["Thyroid Stimulating Hormone", "Thyrotropin"],
    category: "thyroid",
    unit: "uIU/mL",
    alternateUnits: ["mIU/L", "μIU/mL"],
    referenceRange: { low: 0, high: 5.87 },
    optimalRange: { low: 0.4, high: 2.5 },
    suboptimalLowRange: { low: 0, high: 0.4 },
    suboptimalHighRange: { low: 2.5, high: 4.5 },
    description: "Thyroid function regulator"
  },
  {
    name: "T4, Free",
    aliases: ["Free T4", "FT4", "Free Thyroxine", "Thyroxine Free"],
    category: "thyroid",
    unit: "ng/dL",
    referenceRange: { low: 0.467, high: 2.63 },
    optimalRange: { low: 0.9, high: 2.2 },
    suboptimalLowRange: { low: 0.467, high: 0.9 },
    description: "Active thyroid hormone"
  },
  {
    name: "Prostate Specific Ag",
    aliases: ["PSA", "Prostate Specific Antigen"],
    category: "hormone",
    unit: "ng/mL",
    referenceRange: { low: 0, high: 6 },
    optimalRange: { low: 0, high: 2.5 },
    suboptimalHighRange: { low: 2.5, high: 4 },
    description: "Prostate health marker"
  },
  {
    name: "Cortisol",
    aliases: ["Morning Cortisol", "Serum Cortisol", "AM Cortisol"],
    category: "hormone",
    unit: "mcg/dL",
    alternateUnits: ["μg/dL", "ug/dL"],
    referenceRange: { low: 6, high: 23 },
    optimalRange: { low: 10, high: 18 },
    suboptimalLowRange: { low: 6, high: 10 },
    suboptimalHighRange: { low: 18, high: 23 },
    description: "Stress hormone (AM levels)"
  },
  {
    name: "Progesterone",
    aliases: ["Serum Progesterone"],
    category: "hormone",
    unit: "ng/mL",
    referenceRange: { low: 0.1, high: 25 },
    optimalRange: { low: 1, high: 20 },
    suboptimalLowRange: { low: 0.1, high: 1 },
    suboptimalHighRange: { low: 20, high: 25 },
    description: "Female reproductive hormone"
  },
  {
    name: "Prolactin",
    aliases: ["PRL"],
    category: "hormone",
    unit: "ng/mL",
    referenceRange: { low: 2, high: 18 },
    optimalRange: { low: 5, high: 15 },
    suboptimalLowRange: { low: 2, high: 5 },
    suboptimalHighRange: { low: 15, high: 18 },
    description: "Pituitary hormone"
  },

  // ==================== CRITICAL NUTRIENTS ====================
  {
    name: "Homocyst(e)ine",
    aliases: ["Homocysteine", "Plasma Homocysteine", "Hcy"],
    category: "inflammation",
    unit: "umol/L",
    alternateUnits: ["μmol/L", "mcmol/L"],
    referenceRange: { low: 0, high: 20 },
    optimalRange: { low: 5, high: 10 },
    suboptimalLowRange: { low: 0, high: 5 },
    suboptimalHighRange: { low: 10, high: 15 },
    description: "Cardiovascular and methylation risk marker"
  },
  {
    name: "Vitamin D, 25-Hydroxy",
    aliases: ["Vitamin D", "25-OH Vitamin D", "25-Hydroxyvitamin D", "25(OH)D", "Calcidiol"],
    category: "vitamin",
    unit: "ng/mL",
    referenceRange: { low: 0, high: 150 },
    optimalRange: { low: 50, high: 100 },
    suboptimalLowRange: { low: 30, high: 50 },
    description: "Essential vitamin for bone and immune health"
  },
  {
    name: "Magnesium",
    aliases: ["Serum Magnesium", "Mg"],
    category: "mineral",
    unit: "mg/dL",
    referenceRange: { low: 1.17, high: 2.83 },
    optimalRange: { low: 1.5, high: 2.5 },
    suboptimalLowRange: { low: 1.17, high: 1.5 },
    description: "Essential mineral"
  },

  // ==================== METABOLIC CONDITION ====================
  {
    name: "LDL Cholesterol",
    aliases: ["LDL", "LDL-C", "Low Density Lipoprotein", "Bad Cholesterol"],
    category: "lipid",
    unit: "mg/dL",
    referenceRange: { low: 0, high: 134 },
    optimalRange: { low: 0, high: 90 },
    suboptimalHighRange: { low: 90, high: 100 },
    description: "Low-density lipoprotein cholesterol"
  },
  {
    name: "Cholesterol, Total",
    aliases: ["Total Cholesterol", "Cholesterol", "TC", "Serum Cholesterol"],
    category: "lipid",
    unit: "mg/dL",
    referenceRange: { low: 67, high: 232 },
    optimalRange: { low: 100, high: 170 },
    suboptimalLowRange: { low: 67, high: 100 },
    suboptimalHighRange: { low: 170, high: 199 },
    description: "Total blood cholesterol"
  },
  {
    name: "HDL Cholesterol",
    aliases: ["HDL", "HDL-C", "High Density Lipoprotein", "Good Cholesterol"],
    category: "lipid",
    unit: "mg/dL",
    referenceRange: { low: 14, high: 146.67 },
    optimalRange: { low: 45, high: 120 },
    suboptimalLowRange: { low: 40, high: 45 },
    description: "High-density lipoprotein cholesterol"
  },
  {
    name: "Hemoglobin A1c",
    aliases: ["HbA1c", "A1C", "HgbA1c", "Glycated Hemoglobin", "Glycohemoglobin"],
    category: "metabolic",
    unit: "%",
    referenceRange: { low: 0, high: 7.47 },
    optimalRange: { low: 0, high: 5.3 },
    suboptimalHighRange: { low: 5.3, high: 5.6 },
    description: "3-month average blood sugar"
  },
  {
    name: "Glucose",
    aliases: ["Fasting Glucose", "Blood Glucose", "FBG", "Fasting Blood Glucose", "Serum Glucose"],
    category: "metabolic",
    unit: "mg/dL",
    referenceRange: { low: 53.67, high: 111 },
    optimalRange: { low: 65, high: 90 },
    suboptimalLowRange: { low: 53.67, high: 65 },
    suboptimalHighRange: { low: 90, high: 99 },
    description: "Blood sugar level after fasting"
  },
  {
    name: "Triglycerides",
    aliases: ["TG", "Trigs", "Triglyceride"],
    category: "lipid",
    unit: "mg/dL",
    referenceRange: { low: 0, high: 200 },
    optimalRange: { low: 0, high: 100 },
    suboptimalHighRange: { low: 100, high: 150 },
    description: "Blood fat level"
  },
  {
    name: "VLDL Cholesterol",
    aliases: ["VLDL", "Very Low Density Lipoprotein"],
    category: "lipid",
    unit: "mg/dL",
    referenceRange: { low: 0, high: 54 },
    optimalRange: { low: 0, high: 20 },
    suboptimalHighRange: { low: 20, high: 40 },
    description: "Very low-density lipoprotein"
  },
  {
    name: "Fasting Insulin",
    aliases: ["Insulin", "Serum Insulin"],
    category: "metabolic",
    unit: "uIU/mL",
    alternateUnits: ["μIU/mL", "mU/L"],
    referenceRange: { low: 2.6, high: 24.9 },
    optimalRange: { low: 2, high: 8 },
    suboptimalHighRange: { low: 8, high: 15 },
    description: "Insulin level after fasting"
  },
  {
    name: "HOMA-IR",
    aliases: ["Homeostatic Model Assessment", "Insulin Resistance Index"],
    category: "metabolic",
    unit: "ratio",
    referenceRange: { low: 0, high: 2.5 },
    optimalRange: { low: 0, high: 1.5 },
    suboptimalHighRange: { low: 1.5, high: 2.5 },
    description: "Insulin resistance indicator"
  },

  // ==================== ORGAN HEALTH ====================
  {
    name: "RBC",
    aliases: ["Red Blood Cells", "Red Blood Cell Count", "Erythrocytes"],
    category: "blood",
    unit: "x10E6/uL",
    alternateUnits: ["M/uL", "million/μL", "10^6/μL"],
    referenceRange: { low: 3.27, high: 5.78 },
    optimalRange: { low: 3.77, high: 5.28 },
    suboptimalLowRange: { low: 3.27, high: 3.77 },
    description: "Red blood cell count"
  },
  {
    name: "Albumin",
    aliases: ["Serum Albumin"],
    category: "liver",
    unit: "g/dL",
    referenceRange: { low: 3.1, high: 5.6 },
    optimalRange: { low: 3.6, high: 5.1 },
    suboptimalLowRange: { low: 3.1, high: 3.6 },
    description: "Liver protein production"
  },
  {
    name: "Alkaline Phosphatase",
    aliases: ["ALP", "Alk Phos"],
    category: "liver",
    unit: "IU/L",
    alternateUnits: ["U/L"],
    referenceRange: { low: 0, high: 181 },
    optimalRange: { low: 44, high: 120 },
    suboptimalLowRange: { low: 35, high: 44 },
    suboptimalHighRange: { low: 120, high: 144 },
    description: "Liver/bone enzyme"
  },
  {
    name: "ALT (SGPT)",
    aliases: ["ALT", "Alanine Aminotransferase", "SGPT", "GPT"],
    category: "liver",
    unit: "IU/L",
    alternateUnits: ["U/L"],
    referenceRange: { low: 0, high: 62 },
    optimalRange: { low: 0, high: 46 },
    description: "Liver enzyme"
  },
  {
    name: "AST (SGOT)",
    aliases: ["AST", "Aspartate Aminotransferase", "SGOT", "GOT"],
    category: "liver",
    unit: "IU/L",
    alternateUnits: ["U/L"],
    referenceRange: { low: 1.67, high: 44 },
    optimalRange: { low: 10, high: 35 },
    description: "Liver/muscle enzyme"
  },
  {
    name: "Bilirubin, Total",
    aliases: ["Total Bilirubin", "Bilirubin Total", "TBIL"],
    category: "liver",
    unit: "mg/dL",
    referenceRange: { low: 0, high: 1.6 },
    optimalRange: { low: 0, high: 1.2 },
    description: "Liver function marker"
  },
  {
    name: "BUN",
    aliases: ["Blood Urea Nitrogen", "Urea Nitrogen"],
    category: "kidney",
    unit: "mg/dL",
    referenceRange: { low: 1, high: 31 },
    optimalRange: { low: 7, high: 25 },
    suboptimalLowRange: { low: 1, high: 7 },
    description: "Kidney function marker"
  },
  {
    name: "Calcium",
    aliases: ["Serum Calcium", "Total Calcium", "Ca"],
    category: "mineral",
    unit: "mg/dL",
    referenceRange: { low: 8.03, high: 10.87 },
    optimalRange: { low: 8.6, high: 10.3 },
    suboptimalLowRange: { low: 8.03, high: 8.6 },
    description: "Essential mineral for bones"
  },
  {
    name: "Carbon Dioxide, Total",
    aliases: ["CO2", "Bicarbonate", "HCO3", "Total CO2"],
    category: "electrolyte",
    unit: "mmol/L",
    referenceRange: { low: 16, high: 36 },
    optimalRange: { low: 20, high: 32 },
    suboptimalLowRange: { low: 16, high: 20 },
    description: "Blood gas and acid-base balance"
  },
  {
    name: "Chloride",
    aliases: ["Serum Chloride", "Cl"],
    category: "electrolyte",
    unit: "mmol/L",
    referenceRange: { low: 94, high: 114 },
    optimalRange: { low: 98, high: 110 },
    suboptimalLowRange: { low: 94, high: 98 },
    description: "Electrolyte balance"
  },
  {
    name: "Creatinine",
    aliases: ["Serum Creatinine", "Blood Creatinine"],
    category: "kidney",
    unit: "mg/dL",
    referenceRange: { low: 0.5, high: 1.5 },
    optimalRange: { low: 0.7, high: 1.3 },
    suboptimalLowRange: { low: 0.5, high: 0.7 },
    description: "Kidney function marker"
  },
  {
    name: "eGFR",
    aliases: ["Estimated GFR", "GFR", "Glomerular Filtration Rate"],
    category: "kidney",
    unit: "mL/min/1.73",
    alternateUnits: ["mL/min/1.73m2"],
    referenceRange: { low: 30, high: 180 },
    optimalRange: { low: 60, high: 120 },
    suboptimalLowRange: { low: 30, high: 60 },
    suboptimalHighRange: { low: 120, high: 150 },
    description: "Kidney filtration rate"
  },
  {
    name: "Globulin, Total",
    aliases: ["Total Globulin", "Globulin"],
    category: "liver",
    unit: "g/dL",
    referenceRange: { low: 1, high: 6.17 },
    optimalRange: { low: 1.5, high: 4.5 },
    suboptimalLowRange: { low: 1, high: 1.5 },
    suboptimalHighRange: { low: 4.5, high: 5 },
    description: "Immune protein level"
  },
  {
    name: "Hematocrit",
    aliases: ["Hct", "HCT"],
    category: "blood",
    unit: "%",
    referenceRange: { low: 32, high: 59.67 },
    optimalRange: { low: 37, high: 51 },
    suboptimalLowRange: { low: 32, high: 37 },
    suboptimalHighRange: { low: 51, high: 54 },
    description: "Red blood cell volume percentage"
  },
  {
    name: "Hemoglobin",
    aliases: ["Hgb", "Hb"],
    category: "blood",
    unit: "g/dL",
    referenceRange: { low: 11, high: 21 },
    optimalRange: { low: 13, high: 17.7 },
    suboptimalLowRange: { low: 11, high: 13 },
    suboptimalHighRange: { low: 17.7, high: 19 },
    description: "Oxygen-carrying protein"
  },
  {
    name: "Lymphs",
    aliases: ["Lymphocytes %", "Lymph %"],
    category: "blood",
    unit: "%",
    referenceRange: { low: 5, high: 55 },
    optimalRange: { low: 15, high: 40 },
    suboptimalLowRange: { low: 5, high: 15 },
    suboptimalHighRange: { low: 40, high: 45 },
    description: "Lymphocyte percentage"
  },
  {
    name: "Lymphs (Absolute)",
    aliases: ["Lymphocytes", "Absolute Lymphocytes", "Lymphocyte Count"],
    category: "blood",
    unit: "x10E3/uL",
    alternateUnits: ["K/uL", "thousand/μL", "10^3/μL"],
    referenceRange: { low: 0, high: 4.93 },
    optimalRange: { low: 0.8, high: 3.9 },
    suboptimalLowRange: { low: 0, high: 0.8 },
    description: "Immune cells (viral fighters)"
  },
  {
    name: "MCH",
    aliases: ["Mean Corpuscular Hemoglobin"],
    category: "blood",
    unit: "pg",
    referenceRange: { low: 24.47, high: 35.13 },
    optimalRange: { low: 26.6, high: 33 },
    suboptimalLowRange: { low: 24.47, high: 26.6 },
    description: "Average hemoglobin per red cell"
  },
  {
    name: "MCHC",
    aliases: ["Mean Corpuscular Hemoglobin Concentration"],
    category: "blood",
    unit: "g/dL",
    referenceRange: { low: 30.1, high: 37.1 },
    optimalRange: { low: 31.5, high: 35.7 },
    suboptimalLowRange: { low: 30.1, high: 31.5 },
    description: "Hemoglobin concentration in red cells"
  },
  {
    name: "MCV",
    aliases: ["Mean Corpuscular Volume"],
    category: "blood",
    unit: "fL",
    referenceRange: { low: 74, high: 106.67 },
    optimalRange: { low: 80, high: 100 },
    suboptimalLowRange: { low: 74, high: 80 },
    description: "Average red blood cell size"
  },
  {
    name: "Monocytes (Absolute)",
    aliases: ["Monocytes", "Absolute Monocytes", "Monocyte Count"],
    category: "blood",
    unit: "x10E3/uL",
    alternateUnits: ["K/uL", "thousand/μL", "10^3/μL"],
    referenceRange: { low: 0, high: 2 },
    optimalRange: { low: 0, high: 1 },
    description: "Immune cells (tissue repair)"
  },
  {
    name: "Neutrophils (Absolute)",
    aliases: ["Neutrophils", "Absolute Neutrophils", "Neutrophil Count", "ANC"],
    category: "blood",
    unit: "x10E3/uL",
    alternateUnits: ["K/uL", "thousand/μL", "10^3/μL"],
    referenceRange: { low: 0, high: 9.9 },
    optimalRange: { low: 1.5, high: 7.8 },
    suboptimalLowRange: { low: 0, high: 1.5 },
    description: "Immune cells (bacteria fighters)"
  },
  {
    name: "Platelets",
    aliases: ["Platelet Count", "PLT", "Thrombocytes"],
    category: "blood",
    unit: "x10E3/uL",
    alternateUnits: ["K/uL", "thousand/μL", "10^3/μL"],
    referenceRange: { low: 54, high: 486.67 },
    optimalRange: { low: 140, high: 400 },
    suboptimalLowRange: { low: 54, high: 140 },
    description: "Blood clotting cells"
  },
  {
    name: "Potassium",
    aliases: ["Serum Potassium", "K"],
    category: "electrolyte",
    unit: "mmol/L",
    referenceRange: { low: 2.9, high: 5.9 },
    optimalRange: { low: 3.5, high: 5.3 },
    suboptimalLowRange: { low: 2.9, high: 3.5 },
    description: "Electrolyte for heart and muscle function"
  },
  {
    name: "Protein, Total",
    aliases: ["Total Protein", "Serum Protein"],
    category: "liver",
    unit: "g/dL",
    referenceRange: { low: 5.17, high: 10 },
    optimalRange: { low: 6, high: 8.5 },
    suboptimalLowRange: { low: 5.17, high: 6 },
    description: "Total protein in blood"
  },
  {
    name: "RDW",
    aliases: ["Red Cell Distribution Width", "RDW-CV"],
    category: "blood",
    unit: "%",
    referenceRange: { low: 8.2, high: 17.2 },
    optimalRange: { low: 10, high: 15.4 },
    suboptimalLowRange: { low: 8.2, high: 10 },
    description: "Red cell size variation"
  },
  {
    name: "Sodium",
    aliases: ["Serum Sodium", "Na"],
    category: "electrolyte",
    unit: "mmol/L",
    referenceRange: { low: 130.67, high: 148 },
    optimalRange: { low: 134, high: 144 },
    suboptimalLowRange: { low: 130.67, high: 134 },
    description: "Electrolyte for fluid balance"
  },
  {
    name: "WBC",
    aliases: ["White Blood Cells", "White Blood Cell Count", "Leukocytes"],
    category: "blood",
    unit: "x10E3/uL",
    alternateUnits: ["K/uL", "thousand/μL", "10^3/μL"],
    referenceRange: { low: 0.4, high: 14.9 },
    optimalRange: { low: 3.3, high: 10.8 },
    suboptimalLowRange: { low: 0.4, high: 3.3 },
    suboptimalHighRange: { low: 10.8, high: 12 },
    description: "White blood cell count"
  },

  // ==================== ADDITIONAL THYROID ====================
  {
    name: "T3, Free",
    aliases: ["Free T3", "FT3", "Free Triiodothyronine", "Triiodothyronine Free"],
    category: "thyroid",
    unit: "pg/mL",
    referenceRange: { low: 2.3, high: 4.2 },
    optimalRange: { low: 3.0, high: 4.0 },
    suboptimalLowRange: { low: 2.3, high: 3.0 },
    description: "Most active thyroid hormone"
  },
  {
    name: "Reverse T3",
    aliases: ["rT3", "RT3"],
    category: "thyroid",
    unit: "ng/dL",
    referenceRange: { low: 9.2, high: 24.1 },
    optimalRange: { low: 9, high: 15 },
    suboptimalHighRange: { low: 15, high: 20 },
    description: "Inactive thyroid hormone"
  },
  {
    name: "TPO Antibodies",
    aliases: ["Thyroid Peroxidase Antibodies", "Anti-TPO", "TPOAb"],
    category: "thyroid",
    unit: "IU/mL",
    referenceRange: { low: 0, high: 34 },
    optimalRange: { low: 0, high: 10 },
    suboptimalHighRange: { low: 10, high: 20 },
    description: "Autoimmune thyroid marker"
  },

  // ==================== ADDITIONAL VITAMINS ====================
  {
    name: "Vitamin B12",
    aliases: ["B12", "Cobalamin", "Cyanocobalamin"],
    category: "vitamin",
    unit: "pg/mL",
    referenceRange: { low: 200, high: 900 },
    optimalRange: { low: 500, high: 800 },
    suboptimalLowRange: { low: 200, high: 500 },
    description: "Essential for nerve function"
  },
  {
    name: "Folate",
    aliases: ["Folic Acid", "Vitamin B9", "Serum Folate"],
    category: "vitamin",
    unit: "ng/mL",
    referenceRange: { low: 3, high: 20 },
    optimalRange: { low: 10, high: 20 },
    suboptimalLowRange: { low: 3, high: 10 },
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
    suboptimalLowRange: { low: 30, high: 50 },
    description: "Fat-soluble vitamin"
  },
  {
    name: "Vitamin E",
    aliases: ["Alpha Tocopherol", "Tocopherol"],
    category: "vitamin",
    unit: "mg/L",
    referenceRange: { low: 5.5, high: 17 },
    optimalRange: { low: 8, high: 14 },
    suboptimalLowRange: { low: 5.5, high: 8 },
    description: "Antioxidant vitamin"
  },

  // ==================== ADDITIONAL MINERALS ====================
  {
    name: "Ferritin",
    aliases: ["Serum Ferritin"],
    category: "mineral",
    unit: "ng/mL",
    referenceRange: { low: 30, high: 400 },
    optimalRange: { low: 50, high: 150 },
    suboptimalLowRange: { low: 30, high: 50 },
    suboptimalHighRange: { low: 150, high: 300 },
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
    suboptimalLowRange: { low: 60, high: 80 },
    suboptimalHighRange: { low: 140, high: 170 },
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
    suboptimalLowRange: { low: 250, high: 275 },
    suboptimalHighRange: { low: 350, high: 400 },
    description: "Iron transport capacity"
  },
  {
    name: "Transferrin Saturation",
    aliases: ["Iron Saturation", "TSAT", "% Saturation"],
    category: "mineral",
    unit: "%",
    referenceRange: { low: 20, high: 50 },
    optimalRange: { low: 25, high: 45 },
    suboptimalLowRange: { low: 20, high: 25 },
    suboptimalHighRange: { low: 45, high: 50 },
    description: "Iron transport utilization"
  },
  {
    name: "RBC Magnesium",
    aliases: ["Red Blood Cell Magnesium", "Intracellular Magnesium"],
    category: "mineral",
    unit: "mg/dL",
    referenceRange: { low: 4.2, high: 6.8 },
    optimalRange: { low: 5.5, high: 6.5 },
    suboptimalLowRange: { low: 4.2, high: 5.5 },
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
    suboptimalLowRange: { low: 60, high: 80 },
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
    suboptimalLowRange: { low: 70, high: 80 },
    suboptimalHighRange: { low: 130, high: 155 },
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
    suboptimalLowRange: { low: 70, high: 100 },
    description: "Antioxidant mineral"
  },
  {
    name: "Phosphorus",
    aliases: ["Phosphate", "Inorganic Phosphorus"],
    category: "mineral",
    unit: "mg/dL",
    referenceRange: { low: 2.5, high: 4.5 },
    optimalRange: { low: 3.0, high: 4.0 },
    suboptimalLowRange: { low: 2.5, high: 3.0 },
    suboptimalHighRange: { low: 4.0, high: 4.5 },
    description: "Essential mineral"
  },

  // ==================== ADDITIONAL INFLAMMATION ====================
  {
    name: "ESR",
    aliases: ["Erythrocyte Sedimentation Rate", "Sed Rate"],
    category: "inflammation",
    unit: "mm/hr",
    referenceRange: { low: 0, high: 20 },
    optimalRange: { low: 0, high: 10 },
    suboptimalHighRange: { low: 10, high: 15 },
    description: "General inflammation marker"
  },
  {
    name: "Fibrinogen",
    aliases: ["Plasma Fibrinogen"],
    category: "inflammation",
    unit: "mg/dL",
    referenceRange: { low: 200, high: 400 },
    optimalRange: { low: 200, high: 300 },
    suboptimalHighRange: { low: 300, high: 350 },
    description: "Clotting and inflammation marker"
  },
  {
    name: "Uric Acid",
    aliases: ["Serum Uric Acid"],
    category: "inflammation",
    unit: "mg/dL",
    referenceRange: { low: 3.5, high: 7.2 },
    optimalRange: { low: 4, high: 6 },
    suboptimalLowRange: { low: 3.5, high: 4 },
    suboptimalHighRange: { low: 6, high: 7.2 },
    description: "Metabolic byproduct and inflammation marker"
  },

  // ==================== ADDITIONAL LIVER ====================
  {
    name: "GGT",
    aliases: ["Gamma-Glutamyl Transferase", "GGTP", "Gamma GT"],
    category: "liver",
    unit: "U/L",
    referenceRange: { low: 8, high: 61 },
    optimalRange: { low: 10, high: 30 },
    suboptimalLowRange: { low: 8, high: 10 },
    suboptimalHighRange: { low: 30, high: 50 },
    description: "Liver enzyme"
  },

  // ==================== ADDITIONAL KIDNEY ====================
  {
    name: "BUN/Creatinine Ratio",
    aliases: ["BUN:Creatinine", "Urea/Creatinine Ratio"],
    category: "kidney",
    unit: "ratio",
    referenceRange: { low: 10, high: 20 },
    optimalRange: { low: 12, high: 18 },
    suboptimalLowRange: { low: 10, high: 12 },
    suboptimalHighRange: { low: 18, high: 20 },
    description: "Kidney function ratio"
  },

  // ==================== ADDITIONAL BLOOD ====================
  {
    name: "Eosinophils",
    aliases: ["Absolute Eosinophils", "Eosinophil Count"],
    category: "blood",
    unit: "K/uL",
    referenceRange: { low: 0, high: 0.5 },
    optimalRange: { low: 0, high: 0.3 },
    suboptimalHighRange: { low: 0.3, high: 0.5 },
    description: "Immune cells (allergy/parasite)"
  },
  {
    name: "Basophils",
    aliases: ["Absolute Basophils", "Basophil Count"],
    category: "blood",
    unit: "K/uL",
    referenceRange: { low: 0, high: 0.2 },
    optimalRange: { low: 0, high: 0.1 },
    suboptimalHighRange: { low: 0.1, high: 0.2 },
    description: "Immune cells (inflammation)"
  }
];

/**
 * Determine which zone a value falls into for a biomarker
 */
export function getValueZone(value: number, biomarker: BiomarkerReference): 'critical_low' | 'suboptimal_low' | 'optimal' | 'suboptimal_high' | 'critical_high' {
  const { optimalRange, suboptimalLowRange, suboptimalHighRange } = biomarker;

  // Check optimal first (green)
  if (value >= optimalRange.low && value <= optimalRange.high) {
    return 'optimal';
  }

  // Check suboptimal low (yellow below)
  if (suboptimalLowRange && value >= suboptimalLowRange.low && value < optimalRange.low) {
    return 'suboptimal_low';
  }

  // Check suboptimal high (yellow above)
  if (suboptimalHighRange && value > optimalRange.high && value <= suboptimalHighRange.high) {
    return 'suboptimal_high';
  }

  // Below suboptimal low or below optimal (if no suboptimal low exists) = critical low
  if (value < optimalRange.low) {
    return 'critical_low';
  }

  // Above suboptimal high or above optimal (if no suboptimal high exists) = critical high
  return 'critical_high';
}

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

/**
 * Get all unique categories in organized order
 */
export function getCategories(): string[] {
  const categoryOrder = [
    'blood',
    'lipid',
    'metabolic',
    'thyroid',
    'hormone',
    'vitamin',
    'mineral',
    'electrolyte',
    'liver',
    'kidney',
    'inflammation',
  ];

  const existingCategories = new Set(BIOMARKER_REFERENCE.map(b => b.category));
  const ordered = categoryOrder.filter(cat => existingCategories.has(cat));

  existingCategories.forEach(cat => {
    if (!ordered.includes(cat)) {
      ordered.push(cat);
    }
  });

  return ordered;
}
