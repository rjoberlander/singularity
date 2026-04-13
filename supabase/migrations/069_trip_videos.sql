-- Trip Videos: stores generated podcast-style video metadata and job state
CREATE TABLE trip_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  segment_id UUID REFERENCES trip_segments(id) ON DELETE SET NULL,
  day_id UUID REFERENCES trip_days(id) ON DELETE SET NULL,
  level VARCHAR(10) NOT NULL CHECK (level IN ('trip','segment','day')),
  title TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','generating_script','generating_audio','rendering','complete','failed')),
  script JSONB,
  audio_files JSONB,
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds NUMERIC,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trip_videos_trip ON trip_videos(trip_id);
CREATE INDEX idx_trip_videos_status ON trip_videos(status);

-- RLS policies
ALTER TABLE trip_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own videos"
  ON trip_videos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own videos"
  ON trip_videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos"
  ON trip_videos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos"
  ON trip_videos FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass for server-side operations
CREATE POLICY "Service role full access"
  ON trip_videos FOR ALL
  USING (auth.role() = 'service_role');
