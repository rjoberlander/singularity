-- Add usage amount columns to facial_products table for cost calculations
-- Similar to intake_quantity in supplements

-- Add new columns for usage tracking
ALTER TABLE facial_products ADD COLUMN IF NOT EXISTS usage_amount DECIMAL;
ALTER TABLE facial_products ADD COLUMN IF NOT EXISTS usage_unit TEXT;

-- Comment explaining the fields
COMMENT ON COLUMN facial_products.usage_amount IS 'Amount of product used per application (e.g., 1, 2, 0.5)';
COMMENT ON COLUMN facial_products.usage_unit IS 'Unit for usage amount (e.g., ml, pumps, drops, pea-sized)';
