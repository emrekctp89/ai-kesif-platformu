-- Phase 13: Add English translation columns to tools table
ALTER TABLE tools 
ADD COLUMN IF NOT EXISTS name_en text,
ADD COLUMN IF NOT EXISTS description_en text;
