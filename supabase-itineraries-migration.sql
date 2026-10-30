-- Add User Itineraries Table
-- Run this in your Supabase SQL Editor to add itinerary cloud sync support
-- (requires the base schema in supabase-schema.sql, which defines
--  update_updated_at_column() and the uuid-ossp extension)

-- User Itineraries Table
-- One row per saved itinerary. `itinerary_id` is the client-generated id from
-- the app (Itinerary.id) and is the sync identity. `client_updated_at` is the
-- app's Itinerary.updatedAt (epoch millis) and is the last-write-wins
-- authority during offline merge; `updated_at` below is DB-side audit only.
CREATE TABLE IF NOT EXISTS user_itineraries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  itinerary_id TEXT NOT NULL,
  neighborhood_id TEXT NOT NULL,
  city_id TEXT NOT NULL,
  name TEXT NOT NULL,
  stops JSONB NOT NULL DEFAULT '[]',
  total_walk_time TEXT,
  total_distance DOUBLE PRECISION,
  client_updated_at BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, itinerary_id)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_itineraries_user_id ON user_itineraries(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_itineraries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_itineraries
CREATE POLICY "Users can view their own itineraries"
  ON user_itineraries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own itineraries"
  ON user_itineraries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own itineraries"
  ON user_itineraries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own itineraries"
  ON user_itineraries FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_user_itineraries_updated_at
  BEFORE UPDATE ON user_itineraries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
