-- Facial Products (Skincare) Table
-- Structure similar to supplements but adapted for facial skincare products

-- =============================================
-- FACIAL PRODUCTS
-- =============================================
CREATE TABLE IF NOT EXISTS facial_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,

  -- Application details
  step_order INTEGER, -- Order in routine (1, 2, 3, etc.)
  application_form TEXT, -- cream, gel, lotion, oil, serum, liquid, spray, mask, balm, foam, powder
  application_amount TEXT, -- pea-sized, 2-3 drops, generous, etc.
  application_area TEXT, -- full_face, under_eyes, t_zone, targeted, full_face_and_neck
  application_method TEXT, -- pat, massage, apply, layer

  -- Timing (AM/PM routine)
  routines TEXT[] DEFAULT '{}', -- 'am', 'pm' (can be both)

  -- Product details
  size_amount DECIMAL, -- 50, 200, etc.
  size_unit TEXT, -- ml, oz, g
  price DECIMAL,
  purchase_url TEXT,

  -- Categorization
  category TEXT, -- cleanser, toner, essence_serum, moisturizer, sunscreen, eye_care, treatment, mask, other
  subcategory TEXT, -- oil_cleanser, water_cleanser, retinoid, vitamin_c, aha, bha, niacinamide, etc.

  -- Active ingredients
  key_ingredients TEXT[], -- Main active ingredients

  -- SPF for sunscreens
  spf_rating INTEGER,

  -- Notes and purpose
  purpose TEXT, -- Why using this product
  notes TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  product_data_source TEXT, -- 'ai' or 'human'
  product_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE facial_products ENABLE ROW LEVEL SECURITY;

-- Users can read own facial products + linked users' facial products
CREATE POLICY "Users can read own facial products" ON facial_products
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_links
      WHERE linked_user = auth.uid()
      AND owner_user = facial_products.user_id
      AND status = 'active'
    )
  );

CREATE POLICY "Users can insert own facial products" ON facial_products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own facial products" ON facial_products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own facial products" ON facial_products
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_facial_products_user_id ON facial_products(user_id);
CREATE INDEX IF NOT EXISTS idx_facial_products_is_active ON facial_products(is_active);
CREATE INDEX IF NOT EXISTS idx_facial_products_category ON facial_products(category);
CREATE INDEX IF NOT EXISTS idx_facial_products_routines ON facial_products USING GIN(routines);

-- Updated_at trigger
CREATE TRIGGER update_facial_products_updated_at BEFORE UPDATE ON facial_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
