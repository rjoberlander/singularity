-- Add usage schedule columns to facial_products table
-- Run this migration to add frequency and timing support to facial products

-- Add new columns for usage schedule
ALTER TABLE facial_products ADD COLUMN IF NOT EXISTS usage_frequency TEXT;
ALTER TABLE facial_products ADD COLUMN IF NOT EXISTS usage_timing TEXT;
ALTER TABLE facial_products ADD COLUMN IF NOT EXISTS frequency_days TEXT[];

-- Create index for frequency queries
CREATE INDEX IF NOT EXISTS idx_facial_products_usage_frequency ON facial_products(usage_frequency);
CREATE INDEX IF NOT EXISTS idx_facial_products_usage_timing ON facial_products(usage_timing);

-- Update any existing 'oil' application_form values to 'liquid' (consolidation)
UPDATE facial_products SET application_form = 'liquid' WHERE application_form = 'oil';
