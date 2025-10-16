-- Migration: Drop container_name from tire_consumption
-- Run this in Supabase SQL editor
ALTER TABLE public.tire_consumption
  DROP COLUMN IF EXISTS container_name;

-- Optional: update views or code that referenced this column
