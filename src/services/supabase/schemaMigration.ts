export const EXPECTED_SCHEMA_VERSION = 1;

/**
 * Clean, repeatable, non-destructive SQL setup script for Supabase SQL Editor.
 * Includes Row Level Security (RLS), proper ownership constraints linked to auth.users,
 * indexes, timestamps, and realtime publication.
 */
export const EHSAAN_PLAY_SUPABASE_SQL_MIGRATION = `-- ============================================================================
-- EHSAAN PLAY — Supabase Cloud Database & Cross-Device Sync Setup
-- Version: 1.0.0 (Schema Version 1)
-- Description: Creates private user tables, Row Level Security (RLS) policies,
--              performance indexes, and Realtime sync publications.
-- Safe to re-run: Uses IF NOT EXISTS and repeatable statements.
-- ============================================================================

-- 1. Schema Tracking Table (Publicly readable to verify installation)
CREATE TABLE IF NOT EXISTS public.ehsaan_schema_info (
  version INT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  app_name TEXT NOT NULL DEFAULT 'EHSAAN PLAY',
  notes TEXT
);

-- Insert or update version 1 record
INSERT INTO public.ehsaan_schema_info (version, notes)
VALUES (1, 'Initial EhsaanPlay BYOD Cloud Database Schema')
ON CONFLICT (version) DO UPDATE 
SET applied_at = now();

-- Enable RLS on schema info with public read access
ALTER TABLE public.ehsaan_schema_info ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ehsaan_schema_info' AND policyname = 'Public can verify schema version'
  ) THEN
    CREATE POLICY "Public can verify schema version" 
    ON public.ehsaan_schema_info FOR SELECT 
    USING (true);
  END IF;
END $$;


-- 2. User Personal Media States (Watchlist, Watched, Favorites, Ratings, Notes, Progress)
CREATE TABLE IF NOT EXISTS public.user_media_states (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL,
  in_watchlist BOOLEAN NOT NULL DEFAULT false,
  is_watched BOOLEAN NOT NULL DEFAULT false,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  favorited_at TIMESTAMPTZ,
  personal_rating NUMERIC(4, 1),
  rating_tag TEXT,
  notes TEXT,
  progress_percent INT NOT NULL DEFAULT 0,
  last_watched_at TIMESTAMPTZ,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tv_progress JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_user_media_states_sync 
ON public.user_media_states (user_id, updated_at DESC);

ALTER TABLE public.user_media_states ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can select own media states" ON public.user_media_states;
  CREATE POLICY "Users can select own media states"
  ON public.user_media_states FOR SELECT
  USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can insert own media states" ON public.user_media_states;
  CREATE POLICY "Users can insert own media states"
  ON public.user_media_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can update own media states" ON public.user_media_states;
  CREATE POLICY "Users can update own media states"
  ON public.user_media_states FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can delete own media states" ON public.user_media_states;
  CREATE POLICY "Users can delete own media states"
  ON public.user_media_states FOR DELETE
  USING (auth.uid() = user_id);
END $$;


-- 3. User Custom Collections & Shelves
CREATE TABLE IF NOT EXISTS public.user_custom_lists (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  color_tag TEXT NOT NULL DEFAULT '#4E562F',
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  ai_label TEXT,
  item_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_user_custom_lists_sync 
ON public.user_custom_lists (user_id, updated_at DESC);

ALTER TABLE public.user_custom_lists ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can select own custom lists" ON public.user_custom_lists;
  CREATE POLICY "Users can select own custom lists"
  ON public.user_custom_lists FOR SELECT
  USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can insert own custom lists" ON public.user_custom_lists;
  CREATE POLICY "Users can insert own custom lists"
  ON public.user_custom_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can update own custom lists" ON public.user_custom_lists;
  CREATE POLICY "Users can update own custom lists"
  ON public.user_custom_lists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can delete own custom lists" ON public.user_custom_lists;
  CREATE POLICY "Users can delete own custom lists"
  ON public.user_custom_lists FOR DELETE
  USING (auth.uid() = user_id);
END $$;


-- 4. User Personal Library Media Items (Custom titles & cached metadata)
CREATE TABLE IF NOT EXISTS public.user_media_items (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'movie',
  title TEXT NOT NULL,
  original_title TEXT,
  release_date TEXT,
  year INT,
  runtime INT, -- Canonical media duration in integer seconds (e.g. 1740 = 29 min)
  seasons_count INT,
  episodes_count INT,
  seasons JSONB,
  episodes_list JSONB,
  overview TEXT,
  tagline TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  tmdb_id INT,
  tmdb_rating NUMERIC(4, 2),
  vote_count INT NOT NULL DEFAULT 0,
  genres TEXT[] NOT NULL DEFAULT '{}',
  cast_data JSONB,
  crew_data JSONB,
  trailer_url TEXT,
  providers JSONB,
  country TEXT,
  production_company TEXT,
  status TEXT,
  language TEXT,
  imdb_id TEXT,
  imdb_rating NUMERIC(4, 2),
  popularity NUMERIC(8, 2),
  metadata_source TEXT,
  fallback_poster_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_user_media_items_sync 
ON public.user_media_items (user_id, updated_at DESC);

ALTER TABLE public.user_media_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can select own media items" ON public.user_media_items;
  CREATE POLICY "Users can select own media items"
  ON public.user_media_items FOR SELECT
  USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can insert own media items" ON public.user_media_items;
  CREATE POLICY "Users can insert own media items"
  ON public.user_media_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can update own media items" ON public.user_media_items;
  CREATE POLICY "Users can update own media items"
  ON public.user_media_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can delete own media items" ON public.user_media_items;
  CREATE POLICY "Users can delete own media items"
  ON public.user_media_items FOR DELETE
  USING (auth.uid() = user_id);
END $$;


-- 5. User Cross-Device App Settings (Theme, tweaks, display preferences)
CREATE TABLE IF NOT EXISTS public.user_app_settings (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id)
);

ALTER TABLE public.user_app_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can select own app settings" ON public.user_app_settings;
  CREATE POLICY "Users can select own app settings"
  ON public.user_app_settings FOR SELECT
  USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can insert own app settings" ON public.user_app_settings;
  CREATE POLICY "Users can insert own app settings"
  ON public.user_app_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can update own app settings" ON public.user_app_settings;
  CREATE POLICY "Users can update own app settings"
  ON public.user_app_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can delete own app settings" ON public.user_app_settings;
  CREATE POLICY "Users can delete own app settings"
  ON public.user_app_settings FOR DELETE
  USING (auth.uid() = user_id);
END $$;


-- 6. Enable Realtime Replication for Live Cross-Device Sync
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_media_states;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_custom_lists;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_media_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_app_settings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`;
