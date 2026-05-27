-- ============================================================
-- Migration 003: Reduce Max Participants Limit
-- Community Giveaway Platform
-- ============================================================

-- Drop the old constraint that allowed up to 10,000 numbers
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS range_size_lte_10000;

-- Add the new constraint limiting range size to 999
ALTER TABLE rooms ADD CONSTRAINT range_size_lte_999 CHECK ((max_number - min_number + 1) <= 999);
