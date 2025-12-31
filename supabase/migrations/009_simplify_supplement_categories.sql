-- Migration: Simplify supplement categories from 10 to 5
-- Old categories: vitamin, mineral, amino_acid, herb, probiotic, omega, antioxidant, hormone, enzyme, other
-- New categories: vitamin_mineral, amino_protein, herb_botanical, probiotic, other

-- Update vitamin and mineral to vitamin_mineral
UPDATE supplements SET category = 'vitamin_mineral' WHERE category IN ('vitamin', 'mineral');

-- Update amino_acid to amino_protein
UPDATE supplements SET category = 'amino_protein' WHERE category = 'amino_acid';

-- Update herb to herb_botanical
UPDATE supplements SET category = 'herb_botanical' WHERE category = 'herb';

-- Update omega, antioxidant, hormone, enzyme to other
UPDATE supplements SET category = 'other' WHERE category IN ('omega', 'antioxidant', 'hormone', 'enzyme');

-- probiotic and other remain unchanged
