-- MyCorner Database Schema
-- Run this in your Supabase SQL Editor to create all tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Favorites Table
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  neighborhood_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- User Comparison List Table
CREATE TABLE IF NOT EXISTS user_comparison (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  neighborhood_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- User Neighborhood Status Table (shortlist, want_to_visit, visited, living_here, ruled_out)
CREATE TABLE IF NOT EXISTS user_neighborhood_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  neighborhood_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('shortlist', 'want_to_visit', 'visited', 'living_here', 'ruled_out')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, neighborhood_id)
);

-- User Neighborhood Notes Table
CREATE TABLE IF NOT EXISTS user_neighborhood_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  neighborhood_id TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, neighborhood_id)
);

-- User Destinations Table
CREATE TABLE IF NOT EXISTS user_destinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_comparison_user_id ON user_comparison(user_id);
CREATE INDEX IF NOT EXISTS idx_user_neighborhood_status_user_id ON user_neighborhood_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_neighborhood_notes_user_id ON user_neighborhood_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_destinations_user_id ON user_destinations(user_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_comparison ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_neighborhood_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_neighborhood_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_destinations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_favorites
CREATE POLICY "Users can view their own favorites"
  ON user_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
  ON user_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorites"
  ON user_favorites FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON user_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for user_comparison
CREATE POLICY "Users can view their own comparison"
  ON user_comparison FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own comparison"
  ON user_comparison FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comparison"
  ON user_comparison FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comparison"
  ON user_comparison FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for user_neighborhood_status
CREATE POLICY "Users can view their own neighborhood statuses"
  ON user_neighborhood_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own neighborhood statuses"
  ON user_neighborhood_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own neighborhood statuses"
  ON user_neighborhood_status FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own neighborhood statuses"
  ON user_neighborhood_status FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for user_neighborhood_notes
CREATE POLICY "Users can view their own neighborhood notes"
  ON user_neighborhood_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own neighborhood notes"
  ON user_neighborhood_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own neighborhood notes"
  ON user_neighborhood_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own neighborhood notes"
  ON user_neighborhood_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for user_destinations
CREATE POLICY "Users can view their own destinations"
  ON user_destinations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own destinations"
  ON user_destinations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own destinations"
  ON user_destinations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own destinations"
  ON user_destinations FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_user_favorites_updated_at
  BEFORE UPDATE ON user_favorites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_comparison_updated_at
  BEFORE UPDATE ON user_comparison
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_neighborhood_status_updated_at
  BEFORE UPDATE ON user_neighborhood_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_neighborhood_notes_updated_at
  BEFORE UPDATE ON user_neighborhood_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_destinations_updated_at
  BEFORE UPDATE ON user_destinations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
