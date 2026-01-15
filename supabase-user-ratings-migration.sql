-- Add User Ratings Table
-- Run this in your Supabase SQL Editor to add user ratings support

-- User Ratings Table
CREATE TABLE IF NOT EXISTS user_neighborhood_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  neighborhood_id TEXT NOT NULL,
  affordability INTEGER CHECK (affordability >= 1 AND affordability <= 5),
  safety INTEGER CHECK (safety >= 1 AND safety <= 5),
  transit INTEGER CHECK (transit >= 1 AND transit <= 5),
  green_space INTEGER CHECK (green_space >= 1 AND green_space <= 5),
  nightlife INTEGER CHECK (nightlife >= 1 AND nightlife <= 5),
  family_friendly INTEGER CHECK (family_friendly >= 1 AND family_friendly <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, neighborhood_id)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_neighborhood_ratings_user_id ON user_neighborhood_ratings(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_neighborhood_ratings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_neighborhood_ratings
CREATE POLICY "Users can view their own ratings"
  ON user_neighborhood_ratings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ratings"
  ON user_neighborhood_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON user_neighborhood_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
  ON user_neighborhood_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_user_neighborhood_ratings_updated_at
  BEFORE UPDATE ON user_neighborhood_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
