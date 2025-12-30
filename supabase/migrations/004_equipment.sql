-- Equipment/Devices Table Migration
-- For tracking health devices like iRestore, Dr. Pen, Eight Sleep, LED masks, etc.

-- =============================================
-- EQUIPMENT TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  category TEXT, -- e.g., 'LLLT', 'microneedling', 'sleep', 'skincare', 'recovery'
  purpose TEXT, -- e.g., 'Hair loss treatment', 'Sleep temperature regulation'
  specs JSONB DEFAULT '{}', -- Flexible key specs like {"diodes": 500, "wavelength": "triple"}

  -- Usage protocol
  usage_frequency TEXT, -- e.g., 'daily', 'weekly', '3-5x/week'
  usage_timing TEXT, -- e.g., 'morning, after shower', 'evening, after retinol'
  usage_duration TEXT, -- e.g., '25 minutes', 'all night'
  usage_protocol TEXT, -- Detailed protocol notes
  contraindications TEXT, -- e.g., 'Skip minoxidil 24hrs after', 'Stop 5-7 days before laser'

  -- Purchase info
  purchase_date DATE,
  purchase_price DECIMAL,
  purchase_url TEXT,
  warranty_expiry DATE,

  -- Status
  is_active BOOLEAN DEFAULT true,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- RLS Policies (matching supplements pattern)
CREATE POLICY "Users can read own equipment" ON equipment
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_links
      WHERE linked_user = auth.uid()
      AND owner_user = equipment.user_id
      AND status = 'active'
    )
  );

CREATE POLICY "Users can insert own equipment" ON equipment
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own equipment" ON equipment
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own equipment" ON equipment
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_equipment_user_id ON equipment(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_is_active ON equipment(is_active);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);

-- Updated at trigger
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
