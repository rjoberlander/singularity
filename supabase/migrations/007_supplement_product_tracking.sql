-- Add product data tracking fields to supplements
-- Tracks whether product data was entered by human or AI, and when product specs were last updated

-- Add product_data_source column ('human' or 'ai'), null by default until data is entered
ALTER TABLE supplements
ADD COLUMN IF NOT EXISTS product_data_source TEXT CHECK (product_data_source IN ('human', 'ai'));

-- Add product_updated_at column for tracking when product specs were last updated
ALTER TABLE supplements
ADD COLUMN IF NOT EXISTS product_updated_at TIMESTAMPTZ;

-- Create index for filtering by data source
CREATE INDEX IF NOT EXISTS idx_supplements_product_data_source ON supplements(product_data_source);

-- Update existing records to have product_updated_at match their created_at if they have product data
UPDATE supplements
SET product_updated_at = updated_at
WHERE product_updated_at IS NULL
  AND (brand IS NOT NULL OR price IS NOT NULL OR servings_per_container IS NOT NULL);
