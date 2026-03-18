-- PackBrain Database Schema
-- Run this against your local postgres (local-db container)
-- Connection: postgres://postgres:password@localhost:5432/packbrain

-- 1. Create the database (run this first, then connect to it)
-- CREATE DATABASE packbrain;

-- 2. Then run the rest against the packbrain database:

-- Packing lists (trips)
CREATE TABLE IF NOT EXISTS packing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'My Trip',
  destination TEXT,
  duration_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Categories within a list
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES packing_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  icon TEXT DEFAULT '📦',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Items within a category
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY, -- matches the item IDs from the app (e.g. "underwear")
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  qty INTEGER DEFAULT 1,
  bag TEXT DEFAULT 'checked-bag',
  note TEXT DEFAULT '',
  checked BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI-generated phases
CREATE TABLE IF NOT EXISTS phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES packing_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  item_ids TEXT[] DEFAULT '{}', -- array of item IDs
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for common lookups
CREATE INDEX IF NOT EXISTS idx_categories_list ON categories(list_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_phases_list ON phases(list_id);
