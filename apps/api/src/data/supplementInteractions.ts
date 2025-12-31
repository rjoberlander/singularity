/**
 * Supplement-Biomarker Interaction Map
 * Maps supplements to biomarkers they may affect, with direction and mechanism
 * Used by Protocol AI for root cause analysis
 */

export interface SupplementBiomarkerInteraction {
  supplement: string;
  aliases: string[];
  affectedBiomarkers: {
    biomarker: string;
    effect: 'increase' | 'decrease' | 'variable';
    strength: 'strong' | 'moderate' | 'weak';
    mechanism: string;
    evidence: 'strong' | 'moderate' | 'limited' | 'theoretical';
    notes?: string;
  }[];
  hepatotoxicityRisk?: 'high' | 'moderate' | 'low' | 'none';
  commonCategories: string[];
}

export const SUPPLEMENT_INTERACTIONS: SupplementBiomarkerInteraction[] = [
  // ==================== LIVER-AFFECTING SUPPLEMENTS ====================
  {
    supplement: "Ashwagandha",
    aliases: ["Withania somnifera", "KSM-66", "Sensoril"],
    affectedBiomarkers: [
      {
        biomarker: "ALT (SGPT)",
        effect: "increase",
        strength: "moderate",
        mechanism: "Rare hepatotoxicity - NIH Grade B classification",
        evidence: "moderate",
        notes: "Usually reversible; consider cycling 8 weeks on, 2 weeks off"
      },
      {
        biomarker: "AST (SGOT)",
        effect: "increase",
        strength: "moderate",
        mechanism: "Associated liver enzyme elevation in susceptible individuals",
        evidence: "moderate"
      },
      {
        biomarker: "Cortisol",
        effect: "decrease",
        strength: "strong",
        mechanism: "Adaptogenic - modulates HPA axis, reduces cortisol secretion",
        evidence: "strong"
      },
      {
        biomarker: "Testosterone",
        effect: "increase",
        strength: "moderate",
        mechanism: "May support testosterone via stress reduction and LH signaling",
        evidence: "moderate"
      },
      {
        biomarker: "Thyroid Stimulating Hormone",
        effect: "variable",
        strength: "moderate",
        mechanism: "Can stimulate thyroid function - caution in hyperthyroidism",
        evidence: "moderate"
      }
    ],
    hepatotoxicityRisk: "moderate",
    commonCategories: ["adaptogen", "herb", "stress"]
  },
  {
    supplement: "NAC",
    aliases: ["N-Acetyl Cysteine", "N-Acetylcysteine", "Acetylcysteine"],
    affectedBiomarkers: [
      {
        biomarker: "ALT (SGPT)",
        effect: "decrease",
        strength: "moderate",
        mechanism: "Glutathione precursor - supports liver detoxification",
        evidence: "strong"
      },
      {
        biomarker: "AST (SGOT)",
        effect: "decrease",
        strength: "moderate",
        mechanism: "Hepatoprotective via antioxidant pathways",
        evidence: "strong"
      },
      {
        biomarker: "Homocysteine",
        effect: "decrease",
        strength: "weak",
        mechanism: "Indirect support via glutathione and methylation",
        evidence: "limited"
      }
    ],
    hepatotoxicityRisk: "none",
    commonCategories: ["antioxidant", "amino_acid", "liver_support"]
  },
  {
    supplement: "Milk Thistle",
    aliases: ["Silymarin", "Silybum marianum"],
    affectedBiomarkers: [
      {
        biomarker: "ALT (SGPT)",
        effect: "decrease",
        strength: "moderate",
        mechanism: "Hepatoprotective - stabilizes liver cell membranes",
        evidence: "moderate"
      },
      {
        biomarker: "AST (SGOT)",
        effect: "decrease",
        strength: "moderate",
        mechanism: "Antioxidant protection for hepatocytes",
        evidence: "moderate"
      },
      {
        biomarker: "GGT",
        effect: "decrease",
        strength: "weak",
        mechanism: "General liver support",
        evidence: "limited"
      }
    ],
    hepatotoxicityRisk: "none",
    commonCategories: ["herb", "liver_support"]
  },

  // ==================== LIPID-AFFECTING SUPPLEMENTS ====================
  {
    supplement: "Fish Oil",
    aliases: ["Omega-3", "EPA/DHA", "Omega 3 Fatty Acids", "EPA", "DHA"],
    affectedBiomarkers: [
      {
        biomarker: "Triglycerides",
        effect: "decrease",
        strength: "strong",
        mechanism: "Reduces hepatic VLDL synthesis and secretion",
        evidence: "strong",
        notes: "Dose-dependent; 2-4g EPA+DHA for significant effect"
      },
      {
        biomarker: "C-Reactive Protein, Cardiac",
        effect: "decrease",
        strength: "moderate",
        mechanism: "Anti-inflammatory via resolution mediators (resolvins)",
        evidence: "strong"
      },
      {
        biomarker: "HDL Cholesterol",
        effect: "increase",
        strength: "weak",
        mechanism: "Modest HDL elevation in some studies",
        evidence: "moderate"
      },
      {
        biomarker: "LDL Cholesterol",
        effect: "variable",
        strength: "weak",
        mechanism: "May slightly increase LDL particle size (less atherogenic)",
        evidence: "moderate",
        notes: "Can increase LDL-C slightly but improves particle quality"
      }
    ],
    hepatotoxicityRisk: "none",
    commonCategories: ["omega", "cardiovascular", "anti-inflammatory"]
  },
  {
    supplement: "Niacin",
    aliases: ["Vitamin B3", "Nicotinic Acid", "Niacinamide", "Nicotinamide"],
    affectedBiomarkers: [
      {
        biomarker: "HDL Cholesterol",
        effect: "increase",
        strength: "strong",
        mechanism: "Reduces HDL catabolism, most effective HDL-raising agent",
        evidence: "strong",
        notes: "Extended-release form reduces flushing"
      },
      {
        biomarker: "Triglycerides",
        effect: "decrease",
        strength: "strong",
        mechanism: "Inhibits lipolysis and hepatic VLDL secretion",
        evidence: "strong"
      },
      {
        biomarker: "LDL Cholesterol",
        effect: "decrease",
        strength: "moderate",
        mechanism: "Reduces LDL production",
        evidence: "strong"
      },
      {
        biomarker: "Lipoprotein (a)",
        effect: "decrease",
        strength: "strong",
        mechanism: "One of few agents that reduces Lp(a)",
        evidence: "strong"
      },
      {
        biomarker: "ALT (SGPT)",
        effect: "increase",
        strength: "weak",
        mechanism: "High doses can cause liver stress",
        evidence: "moderate",
        notes: "Monitor liver enzymes at doses >1g/day"
      },
      {
        biomarker: "Glucose",
        effect: "increase",
        strength: "weak",
        mechanism: "Can impair glucose tolerance at high doses",
        evidence: "moderate"
      }
    ],
    hepatotoxicityRisk: "moderate",
    commonCategories: ["vitamin", "cardiovascular"]
  },
  {
    supplement: "Red Yeast Rice",
    aliases: ["RYR", "Monascus purpureus"],
    affectedBiomarkers: [
      {
        biomarker: "LDL Cholesterol",
        effect: "decrease",
        strength: "strong",
        mechanism: "Contains monacolin K (natural lovastatin) - HMG-CoA reductase inhibitor",
        evidence: "strong"
      },
      {
        biomarker: "Total Cholesterol",
        effect: "decrease",
        strength: "moderate",
        mechanism: "Statin-like mechanism",
        evidence: "strong"
      },
      {
        biomarker: "ALT (SGPT)",
        effect: "increase",
        strength: "weak",
        mechanism: "Statin-like effects may include rare liver enzyme elevation",
        evidence: "limited"
      }
    ],
    hepatotoxicityRisk: "low",
    commonCategories: ["cardiovascular", "cholesterol"]
  },

  // ==================== METHYLATION SUPPLEMENTS ====================
  {
    supplement: "Vitamin B12",
    aliases: ["Cobalamin", "Methylcobalamin", "Cyanocobalamin", "B12"],
    affectedBiomarkers: [
      {
        biomarker: "Homocysteine",
        effect: "decrease",
        strength: "strong",
        mechanism: "Essential cofactor for homocysteine remethylation to methionine",
        evidence: "strong"
      },
      {
        biomarker: "Vitamin B12",
        effect: "increase",
        strength: "strong",
        mechanism: "Direct supplementation",
        evidence: "strong"
      },
      {
        biomarker: "Mean Corpuscular Volume",
        effect: "decrease",
        strength: "moderate",
        mechanism: "Corrects macrocytic anemia if B12 deficient",
        evidence: "strong",
        notes: "Only if deficiency present"
      }
    ],
    hepatotoxicityRisk: "none",
    commonCategories: ["vitamin", "methylation"]
  },
  {
    supplement: "Folate",
    aliases: ["Folic Acid", "Methylfolate", "5-MTHF", "Vitamin B9", "L-Methylfolate"],
    affectedBiomarkers: [
      {
        biomarker: "Homocysteine",
        effect: "decrease",
        strength: "strong",
        mechanism: "Essential for homocysteine remethylation pathway",
        evidence: "strong"
      },
      {
        biomarker: "Folate",
        effect: "increase",
        strength: "strong",
        mechanism: "Direct supplementation",
        evidence: "strong"
      }
    ],
    hepatotoxicityRisk: "none",
    commonCategories: ["vitamin", "methylation"]
  },
  {
    supplement: "Vitamin B6",
    aliases: ["Pyridoxine", "Pyridoxal-5-Phosphate", "P5P", "B6"],
    affectedBiomarkers: [
      {
        biomarker: "Homocysteine",
        effect: "decrease",
        strength: "moderate",
        mechanism: "Cofactor for transsulfuration pathway (homocysteine to cysteine)",
        evidence: "strong"
      }
    ],
    hepatotoxicityRisk: "none",
    commonCategories: ["vitamin", "methylation"]
  },
  {
    supplement: "Betaine",
    aliases: ["TMG", "Trimethylglycine"],
    affectedBiomarkers: [
      {
        biomarker: "Homocysteine",
        effect: "decrease",
        strength: "strong",
        mechanism: "Alternative methyl donor for homocysteine remethylation",
        evidence: "strong"
      }
    ],
    hepatotoxicityRisk: "none",
    commonCategories: ["amino_acid", "methylation"]
  },

  // ==================== VITAMIN D & MINERALS ====================
  {
    supplement: "Vitamin D3",
    aliases: ["Cholecalciferol", "Vitamin D", "D3"],
    affectedBiomarkers: [
      {
        biomarker: "Vitamin D, 25-Hydroxy",
        effect: "increase",
        strength: "strong",
        mechanism: "Direct supplementation; converted to 25-OH-D in liver",
        evidence: "strong",
        notes: "1000 IU raises serum ~10 ng/mL on average"
      },
      {
        biomarker: "Calcium",
        effect: "increase",
        strength: "weak",
        mechanism: "Enhances intestinal calcium absorption",
        evidence: "strong"
      },
      {
        biomarker: "Parathyroid Hormone",
        effect: "decrease",
        strength: "moderate",
        mechanism: "Adequate D3 suppresses PTH secretion",
        evidence: "strong"
      }
    ],
    hepatotoxicityRisk: "none",
    commonCategories: ["vitamin", "bone"]
  },
  {
    supplement: "Magnesium",
    aliases: ["Mag", "Magnesium Glycinate", "Magnesium Citrate", "Magnesium Threonate"],
    affectedBiomarkers: [
      {
        biomarker: "Magnesium",
        effect: "increase",
        strength: "strong",
        mechanism: "Direct supplementation",
        evidence: "strong"
      },
      {
        biomarker: "Glucose",
        effect: "decrease",
        strength: "weak",
        mechanism: "Improves insulin sensitivity",
        evidence: "moderate"
      },
      {
        biomarker: "Hemoglobin A1c",
        effect: "decrease",
        strength: "weak",
        mechanism: "Long-term glucose regulation improvement",
        evidence: "moderate"
      },
      {
        biomarker: "C-Reactive Protein, Cardiac",
        effect: "decrease",
        strength: "weak",
        mechanism: "Anti-inflammatory effects",
        evidence: "moderate"
      }
    ],
    hepatotoxicityRisk: "none",
    commonCategories: ["mineral", "sleep", "metabolic"]
  },
  {
    supplement: "Zinc",
    aliases: ["Zinc Picolinate", "Zinc Gluconate", "Zinc Citrate"],
    affectedBiomarkers: [
      {
        biomarker: "Zinc",
        effect: "increase",
        strength: "strong",
        mechanism: "Direct supplementation",
        evidence: "strong"
      },
      {
        biomarker: "Testosterone",
        effect: "increase",
        strength: "moderate",
        mechanism: "Essential for testosterone synthesis; corrects deficiency-related low T",
        evidence: "moderate",
        notes: "Effect mainly seen when correcting deficiency"
      },
      {
        biomarker: "Copper",
        effect: "decrease",
        strength: "moderate",
        mechanism: "High zinc intake competes with copper absorption",
        evidence: "strong",
        notes: "Long-term high-dose zinc can cause copper deficiency"
      }
    ],
    hepatotoxicityRisk: "none",
    commonCategories: ["mineral", "immune", "hormone"]
  },
  {
    supplement: "Iron",
    aliases: ["Ferrous Sulfate", "Iron Bisglycinate", "Ferrous Gluconate"],
    affectedBiomarkers: [
      {
        biomarker: "Ferritin",
        effect: "increase",
        strength: "strong",
        mechanism: "Replenishes iron stores",
        evidence: "strong"
      },
      {
        biomarker: "Iron",
        effect: "increase",
        strength: "strong",
        mechanism: "Direct supplementation",
        evidence: "strong"
      },
      {
        biomarker: "Hemoglobin",
        effect: "increase",
        strength: "strong",
        mechanism: "Essential for hemoglobin synthesis",
        evidence: "strong",
        notes: "Effect seen when correcting deficiency"
      },
      {
        biomarker: "ALT (SGPT)",
        effect: "increase",
        strength: "weak",
        mechanism: "Iron overload can cause liver damage",
        evidence: "moderate",
        notes: "Only with excessive supplementation or hemochromatosis"
      }
    ],
    hepatotoxicityRisk: "low",
    commonCategories: ["mineral", "blood"]
  },

  // ==================== PROTEIN & AMINO ACIDS ====================
  {
    supplement: "Whey Protein",
    aliases: ["Whey", "Whey Isolate", "Whey Concentrate"],
    affectedBiomarkers: [
      {
        biomarker: "ALT (SGPT)",
        effect: "increase",
        strength: "weak",
        mechanism: "High protein intake increases liver workload for amino acid processing",
        evidence: "limited",
        notes: "Usually transient; more pronounced at >100g/day"
      },
      {
        biomarker: "AST (SGOT)",
        effect: "increase",
        strength: "weak",
        mechanism: "Amino acid processing load",
        evidence: "limited"
      },
      {
        biomarker: "Blood Urea Nitrogen",
        effect: "increase",
        strength: "moderate",
        mechanism: "Increased protein metabolism produces more urea",
        evidence: "strong"
      },
      {
        biomarker: "Creatinine",
        effect: "variable",
        strength: "weak",
        mechanism: "May increase slightly due to muscle mass gains",
        evidence: "limited"
      }
    ],
    hepatotoxicityRisk: "low",
    commonCategories: ["protein", "amino_acid"]
  },
  {
    supplement: "Creatine",
    aliases: ["Creatine Monohydrate", "Creatine HCL"],
    affectedBiomarkers: [
      {
        biomarker: "Creatinine",
        effect: "increase",
        strength: "moderate",
        mechanism: "Creatine converts to creatinine; benign elevation",
        evidence: "strong",
        notes: "Elevated creatinine from creatine is NOT kidney damage - purely metabolic"
      }
    ],
    hepatotoxicityRisk: "none",
    commonCategories: ["amino_acid", "performance"]
  },

  // ==================== THYROID SUPPLEMENTS ====================
  {
    supplement: "Iodine",
    aliases: ["Potassium Iodide", "Kelp", "Iodoral"],
    affectedBiomarkers: [
      {
        biomarker: "Thyroid Stimulating Hormone",
        effect: "variable",
        strength: "strong",
        mechanism: "Essential for thyroid hormone synthesis; excess can cause hypo or hyper",
        evidence: "strong",
        notes: "Both deficiency and excess disrupt thyroid function"
      },
      {
        biomarker: "Free T4",
        effect: "variable",
        strength: "moderate",
        mechanism: "Required for T4 synthesis",
        evidence: "strong"
      },
      {
        biomarker: "Free T3",
        effect: "variable",
        strength: "moderate",
        mechanism: "Downstream of T4 production",
        evidence: "strong"
      }
    ],
    hepatotoxicityRisk: "none",
    commonCategories: ["mineral", "thyroid"]
  },
  {
    supplement: "Selenium",
    aliases: ["Selenomethionine", "Sodium Selenite"],
    affectedBiomarkers: [
      {
        biomarker: "Free T3",
        effect: "increase",
        strength: "moderate",
        mechanism: "Cofactor for deiodinase enzymes that convert T4 to T3",
        evidence: "strong"
      },
      {
        biomarker: "Thyroid Stimulating Hormone",
        effect: "decrease",
        strength: "weak",
        mechanism: "Improved T4->T3 conversion may reduce TSH",
        evidence: "moderate"
      }
    ],
    hepatotoxicityRisk: "none",
    commonCategories: ["mineral", "thyroid", "antioxidant"]
  },

  // ==================== GLUCOSE/METABOLIC ====================
  {
    supplement: "Berberine",
    aliases: ["Berberine HCL"],
    affectedBiomarkers: [
      {
        biomarker: "Glucose",
        effect: "decrease",
        strength: "strong",
        mechanism: "Activates AMPK; improves insulin sensitivity",
        evidence: "strong",
        notes: "Comparable to metformin in some studies"
      },
      {
        biomarker: "Hemoglobin A1c",
        effect: "decrease",
        strength: "strong",
        mechanism: "Long-term glucose regulation",
        evidence: "strong"
      },
      {
        biomarker: "LDL Cholesterol",
        effect: "decrease",
        strength: "moderate",
        mechanism: "Increases LDL receptor expression",
        evidence: "moderate"
      },
      {
        biomarker: "Triglycerides",
        effect: "decrease",
        strength: "moderate",
        mechanism: "Reduces hepatic lipogenesis",
        evidence: "moderate"
      },
      {
        biomarker: "ALT (SGPT)",
        effect: "decrease",
        strength: "weak",
        mechanism: "May improve fatty liver",
        evidence: "limited"
      }
    ],
    hepatotoxicityRisk: "low",
    commonCategories: ["herb", "metabolic", "cardiovascular"]
  },
  {
    supplement: "Alpha Lipoic Acid",
    aliases: ["ALA", "R-Lipoic Acid", "Lipoic Acid"],
    affectedBiomarkers: [
      {
        biomarker: "Glucose",
        effect: "decrease",
        strength: "moderate",
        mechanism: "Improves insulin sensitivity and glucose uptake",
        evidence: "moderate"
      },
      {
        biomarker: "ALT (SGPT)",
        effect: "decrease",
        strength: "weak",
        mechanism: "Antioxidant support for liver",
        evidence: "limited"
      }
    ],
    hepatotoxicityRisk: "none",
    commonCategories: ["antioxidant", "metabolic"]
  },

  // ==================== INFLAMMATION ====================
  {
    supplement: "Curcumin",
    aliases: ["Turmeric", "Turmeric Extract", "Curcuma longa"],
    affectedBiomarkers: [
      {
        biomarker: "C-Reactive Protein, Cardiac",
        effect: "decrease",
        strength: "moderate",
        mechanism: "Inhibits NF-kB and inflammatory cytokines",
        evidence: "strong"
      },
      {
        biomarker: "ALT (SGPT)",
        effect: "variable",
        strength: "weak",
        mechanism: "Usually hepatoprotective but rare cases of liver injury reported",
        evidence: "limited",
        notes: "Generally safe; rare idiosyncratic reactions"
      }
    ],
    hepatotoxicityRisk: "low",
    commonCategories: ["herb", "anti-inflammatory"]
  },
  {
    supplement: "Boswellia",
    aliases: ["Boswellic Acid", "Frankincense", "5-Loxin"],
    affectedBiomarkers: [
      {
        biomarker: "C-Reactive Protein, Cardiac",
        effect: "decrease",
        strength: "moderate",
        mechanism: "5-LOX inhibition reduces inflammatory mediators",
        evidence: "moderate"
      }
    ],
    hepatotoxicityRisk: "none",
    commonCategories: ["herb", "anti-inflammatory"]
  }
];

/**
 * Find supplements that affect a specific biomarker
 */
export function getSupplementsAffectingBiomarker(biomarkerName: string): {
  supplement: string;
  effect: 'increase' | 'decrease' | 'variable';
  strength: 'strong' | 'moderate' | 'weak';
  mechanism: string;
  evidence: string;
  notes?: string;
}[] {
  const results: any[] = [];
  const normalizedName = biomarkerName.toLowerCase();

  for (const supp of SUPPLEMENT_INTERACTIONS) {
    for (const interaction of supp.affectedBiomarkers) {
      if (interaction.biomarker.toLowerCase().includes(normalizedName) ||
          normalizedName.includes(interaction.biomarker.toLowerCase())) {
        results.push({
          supplement: supp.supplement,
          ...interaction
        });
      }
    }
  }

  return results;
}

/**
 * Find biomarkers affected by a specific supplement
 */
export function getBiomarkersAffectedBySupplement(supplementName: string): {
  biomarker: string;
  effect: 'increase' | 'decrease' | 'variable';
  strength: 'strong' | 'moderate' | 'weak';
  mechanism: string;
  notes?: string;
}[] {
  const normalizedName = supplementName.toLowerCase();

  for (const supp of SUPPLEMENT_INTERACTIONS) {
    if (supp.supplement.toLowerCase().includes(normalizedName) ||
        supp.aliases.some(a => a.toLowerCase().includes(normalizedName))) {
      return supp.affectedBiomarkers;
    }
  }

  return [];
}

/**
 * Get supplements with hepatotoxicity risk
 */
export function getHepatotoxicSupplements(): {
  supplement: string;
  risk: 'high' | 'moderate' | 'low';
  aliases: string[];
}[] {
  return SUPPLEMENT_INTERACTIONS
    .filter(s => s.hepatotoxicityRisk && s.hepatotoxicityRisk !== 'none')
    .map(s => ({
      supplement: s.supplement,
      risk: s.hepatotoxicityRisk as 'high' | 'moderate' | 'low',
      aliases: s.aliases
    }));
}

/**
 * Get related biomarkers (e.g., ALT -> AST, GGT, Bilirubin)
 */
export const RELATED_BIOMARKERS: Record<string, string[]> = {
  // Liver panel
  "ALT (SGPT)": ["AST (SGOT)", "GGT", "Alkaline Phosphatase", "Bilirubin, Total", "Albumin"],
  "AST (SGOT)": ["ALT (SGPT)", "GGT", "Alkaline Phosphatase", "Bilirubin, Total"],
  "GGT": ["ALT (SGPT)", "AST (SGOT)", "Alkaline Phosphatase", "Bilirubin, Total"],
  "Alkaline Phosphatase": ["ALT (SGPT)", "AST (SGOT)", "GGT", "Calcium", "Vitamin D, 25-Hydroxy"],
  "Bilirubin, Total": ["ALT (SGPT)", "AST (SGOT)", "GGT", "Alkaline Phosphatase"],

  // Lipid panel
  "LDL Cholesterol": ["Apolipoprotein B", "Total Cholesterol", "HDL Cholesterol", "Triglycerides", "Lipoprotein (a)"],
  "HDL Cholesterol": ["LDL Cholesterol", "Triglycerides", "Total Cholesterol", "Apolipoprotein B"],
  "Triglycerides": ["HDL Cholesterol", "LDL Cholesterol", "Glucose", "Hemoglobin A1c"],
  "Apolipoprotein B": ["LDL Cholesterol", "Lipoprotein (a)", "Total Cholesterol"],
  "Lipoprotein (a)": ["Apolipoprotein B", "LDL Cholesterol"],

  // Metabolic
  "Glucose": ["Hemoglobin A1c", "Insulin", "Triglycerides", "C-Reactive Protein, Cardiac"],
  "Hemoglobin A1c": ["Glucose", "Insulin", "Triglycerides"],

  // Thyroid
  "Thyroid Stimulating Hormone": ["Free T4", "Free T3", "T3, Total", "T4, Total"],
  "Free T4": ["Thyroid Stimulating Hormone", "Free T3", "T3, Total"],
  "Free T3": ["Thyroid Stimulating Hormone", "Free T4", "T3, Total"],

  // Inflammation
  "C-Reactive Protein, Cardiac": ["Homocysteine", "Ferritin", "Fibrinogen"],
  "Homocysteine": ["C-Reactive Protein, Cardiac", "Vitamin B12", "Folate"],

  // Kidney
  "Creatinine": ["Blood Urea Nitrogen", "eGFR", "Cystatin C"],
  "Blood Urea Nitrogen": ["Creatinine", "eGFR"],

  // Iron/Blood
  "Ferritin": ["Iron", "TIBC", "Hemoglobin", "Hematocrit"],
  "Iron": ["Ferritin", "TIBC", "Hemoglobin"],
  "Hemoglobin": ["Hematocrit", "Ferritin", "Iron", "Vitamin B12"],

  // Hormones
  "Testosterone": ["Free Testosterone", "SHBG", "Estradiol", "LH", "FSH"],
  "Free Testosterone": ["Testosterone", "SHBG", "Estradiol"],
  "Estradiol": ["Testosterone", "Free Testosterone", "SHBG"],

  // Vitamins
  "Vitamin D, 25-Hydroxy": ["Calcium", "Parathyroid Hormone", "Phosphorus"],
  "Vitamin B12": ["Folate", "Homocysteine", "Mean Corpuscular Volume"]
};

/**
 * Get related biomarkers for correlation analysis
 */
export function getRelatedBiomarkers(biomarkerName: string): string[] {
  // Try exact match first
  if (RELATED_BIOMARKERS[biomarkerName]) {
    return RELATED_BIOMARKERS[biomarkerName];
  }

  // Try partial match
  const normalizedName = biomarkerName.toLowerCase();
  for (const [key, related] of Object.entries(RELATED_BIOMARKERS)) {
    if (key.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(key.toLowerCase())) {
      return related;
    }
  }

  return [];
}
