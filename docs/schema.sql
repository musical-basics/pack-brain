-- PackBrain Database Schema
-- Run this in Supabase SQL Editor (or against your local postgres)
-- Uses a dedicated "packbrain" schema instead of "public"

-- 1. Create the schema
CREATE SCHEMA IF NOT EXISTS packbrain;

-- 2. Tables

CREATE TABLE IF NOT EXISTS packbrain.packing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'My Trip',
  destination TEXT,
  duration_days INTEGER,
  bags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Migration for existing databases: add the bags column if it doesn't exist
ALTER TABLE packbrain.packing_lists ADD COLUMN IF NOT EXISTS bags JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS packbrain.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES packbrain.packing_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  icon TEXT DEFAULT '📦',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS packbrain.items (
  id TEXT PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES packbrain.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  qty INTEGER DEFAULT 1,
  bag TEXT DEFAULT 'checked-bag',
  note TEXT DEFAULT '',
  checked BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS packbrain.phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES packbrain.packing_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  item_ids TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Grant access for the service role (needed for Supabase JS client)
GRANT USAGE ON SCHEMA packbrain TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA packbrain TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA packbrain TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA packbrain GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA packbrain GRANT ALL ON SEQUENCES TO service_role;
