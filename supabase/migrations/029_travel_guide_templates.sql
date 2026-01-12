-- Migration: Travel Guide Templates
-- Stores travel planning templates (instructions, JSON schemas) for each phase
-- Allows MCP server to query templates and users to customize them

-- Template storage for travel guide phases
CREATE TABLE travel_guide_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Phase organization (extensible for future phases)
  -- 0 = shared across all phases (e.g., family profile if moved here)
  -- 1 = Trip Planning
  -- 2 = Hotel Research
  -- 3 = Activity Research
  -- 4+ = Future phases
  phase_number integer NOT NULL,

  -- Template identification
  template_key text NOT NULL,           -- e.g., 'instructions', 'skeleton-template', 'card-inventory'
  display_name text NOT NULL,           -- e.g., 'Instructions', 'Skeleton Template'
  filename text NOT NULL,               -- e.g., 'instructions.md', 'skeleton-template.json'

  -- Content metadata
  content_type text NOT NULL CHECK (content_type IN ('json', 'markdown')),
  is_input boolean NOT NULL DEFAULT true,  -- true = input file for Claude, false = output template

  -- Actual content
  content text NOT NULL,                -- JSON string or markdown text

  -- UI organization
  sort_order integer NOT NULL DEFAULT 0,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Each user can only have one template per phase/key combination
  UNIQUE (user_id, phase_number, template_key)
);

-- Indexes for common queries
CREATE INDEX idx_travel_guide_templates_user_id ON travel_guide_templates(user_id);
CREATE INDEX idx_travel_guide_templates_phase ON travel_guide_templates(user_id, phase_number);
CREATE INDEX idx_travel_guide_templates_lookup ON travel_guide_templates(user_id, phase_number, template_key);

-- RLS policies
ALTER TABLE travel_guide_templates ENABLE ROW LEVEL SECURITY;

-- Users can only see their own templates
CREATE POLICY "Users can view own templates"
  ON travel_guide_templates FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own templates
CREATE POLICY "Users can insert own templates"
  ON travel_guide_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON travel_guide_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON travel_guide_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_travel_guide_templates_updated_at
  BEFORE UPDATE ON travel_guide_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Phase metadata table for extensibility
-- This allows adding new phases without code changes
CREATE TABLE travel_guide_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_number integer NOT NULL UNIQUE,
  name text NOT NULL,                    -- e.g., 'Trip Planning', 'Hotel Research'
  description text,                      -- e.g., 'Light research'
  color text,                            -- UI color code
  icon text,                             -- Icon name
  claude_project_name text,              -- Suggested Claude Project name
  claude_project_description text,       -- Description for Claude Project
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default phases
INSERT INTO travel_guide_phases (phase_number, name, description, color, icon, claude_project_name, claude_project_description, sort_order) VALUES
  (1, 'Trip Planning', 'Light research', 'green', 'map', 'Trip Planner', 'Create a new Claude Project with this name', 1),
  (2, 'Hotel Research', 'Medium research', 'orange', 'building', 'Hotel Research', 'One conversation per segment', 2),
  (3, 'Activity Research', 'Heavy research (50+ sources)', 'red', 'search', 'Activity Research', 'Deep research for each segment', 3),
  (4, 'Booking & Logistics', 'Final preparation', 'blue', 'calendar', 'Booking Assistant', 'Help with reservations and logistics', 4),
  (5, 'On-Trip Support', 'Real-time assistance', 'purple', 'compass', 'Trip Companion', 'Real-time help during the trip', 5);

-- RLS for phases (read-only for all authenticated users)
ALTER TABLE travel_guide_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view phases"
  ON travel_guide_phases FOR SELECT
  TO authenticated
  USING (true);

-- Trigger for updated_at on phases
CREATE TRIGGER update_travel_guide_phases_updated_at
  BEFORE UPDATE ON travel_guide_phases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Template definitions table (defines what templates exist for each phase)
-- This is the "schema" of available templates per phase
CREATE TABLE travel_guide_template_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_number integer NOT NULL REFERENCES travel_guide_phases(phase_number) ON DELETE CASCADE,
  template_key text NOT NULL,
  display_name text NOT NULL,
  filename text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('json', 'markdown')),
  is_input boolean NOT NULL DEFAULT true,
  description text,                      -- Help text for UI
  default_content text,                  -- Default template content
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phase_number, template_key)
);

-- RLS for template definitions (read-only for all authenticated users)
ALTER TABLE travel_guide_template_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view template definitions"
  ON travel_guide_template_definitions FOR SELECT
  TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_travel_guide_template_definitions_updated_at
  BEFORE UPDATE ON travel_guide_template_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function: Get template content (user's or default)
-- MCP server and API can use this to get the right content
CREATE OR REPLACE FUNCTION get_travel_template(
  p_user_id uuid,
  p_phase_number integer,
  p_template_key text
) RETURNS text AS $$
DECLARE
  v_content text;
BEGIN
  -- Try user's custom template first
  SELECT content INTO v_content
  FROM travel_guide_templates
  WHERE user_id = p_user_id
    AND phase_number = p_phase_number
    AND template_key = p_template_key;

  -- Fall back to default if no custom template
  IF v_content IS NULL THEN
    SELECT default_content INTO v_content
    FROM travel_guide_template_definitions
    WHERE phase_number = p_phase_number
      AND template_key = p_template_key;
  END IF;

  RETURN v_content;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get all templates for a phase
CREATE OR REPLACE FUNCTION get_travel_phase_templates(
  p_user_id uuid,
  p_phase_number integer
) RETURNS TABLE (
  template_key text,
  display_name text,
  filename text,
  content_type text,
  is_input boolean,
  description text,
  content text,
  is_customized boolean,
  sort_order integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    td.template_key,
    td.display_name,
    td.filename,
    td.content_type,
    td.is_input,
    td.description,
    COALESCE(ut.content, td.default_content) as content,
    ut.id IS NOT NULL as is_customized,
    td.sort_order
  FROM travel_guide_template_definitions td
  LEFT JOIN travel_guide_templates ut
    ON ut.phase_number = td.phase_number
    AND ut.template_key = td.template_key
    AND ut.user_id = p_user_id
  WHERE td.phase_number = p_phase_number
  ORDER BY td.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on tables
COMMENT ON TABLE travel_guide_templates IS 'User-customized travel planning templates';
COMMENT ON TABLE travel_guide_phases IS 'Travel planning workflow phases (extensible)';
COMMENT ON TABLE travel_guide_template_definitions IS 'Template definitions and defaults for each phase';
COMMENT ON FUNCTION get_travel_template IS 'Get template content (user custom or default)';
COMMENT ON FUNCTION get_travel_phase_templates IS 'Get all templates for a phase with customization status';
