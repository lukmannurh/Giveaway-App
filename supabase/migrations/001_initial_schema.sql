-- ============================================================
-- Migration 001: Initial Schema
-- Community Giveaway Platform
-- ============================================================

-- ──────────────────────────────────────────────
-- users table
-- Synced from Supabase Auth on first login.
-- id matches auth.uid() for RLS.
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ──────────────────────────────────────────────
-- rooms table
-- Core giveaway room. Drawing metadata is stored
-- inline (no separate table — each room has one drawing).
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 100),
  description TEXT NOT NULL CHECK (char_length(description) >= 10 AND char_length(description) <= 500),
  min_number INT NOT NULL CHECK (min_number >= 1),
  max_number INT NOT NULL CHECK (max_number > min_number),
  deadline TIMESTAMPTZ NOT NULL,
  total_winners INT NOT NULL CHECK (total_winners >= 1 AND total_winners <= 50),
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'drawing', 'finished')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Drawing metadata (populated when drawing executes)
  drawing_algorithm TEXT DEFAULT 'crypto.randomInt',
  drawing_participant_count INT,
  drawing_started_at TIMESTAMPTZ,
  drawing_completed_at TIMESTAMPTZ,

  -- Cross-field constraints
  -- total_winners must not exceed the number range size
  CONSTRAINT total_winners_lte_range CHECK (total_winners <= (max_number - min_number + 1)),
  -- Range size must not exceed 999 numbers
  CONSTRAINT range_size_lte_999 CHECK ((max_number - min_number + 1) <= 999)
);

-- Indexes optimized for common query patterns
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_rooms_state ON rooms(state);
-- Partial index: only active rooms matter for deadline checking (cron job performance)
CREATE INDEX IF NOT EXISTS idx_rooms_deadline_active ON rooms(deadline) WHERE state = 'active';
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at DESC);

-- ──────────────────────────────────────────────
-- participants table
-- One record per user per room.
-- UNIQUE constraints are the primary race condition defense.
-- Immutable by design — no UPDATE/DELETE RLS policies.
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  selected_number INT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One participation per user per room
  UNIQUE(room_id, user_id),
  -- No duplicate numbers in the same room (atomic race condition prevention)
  UNIQUE(room_id, selected_number)
);

-- Note: UNIQUE constraints create implicit indexes, no need to duplicate them
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);

-- ──────────────────────────────────────────────
-- winners table
-- Inserted by the drawing service using admin client (bypasses RLS).
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  selected_number INT NOT NULL,
  sequence INT NOT NULL,   -- 1 = first winner, 2 = second, etc.
  selected_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- No duplicate sequence numbers per room
  UNIQUE(room_id, sequence),
  -- A user can only win once per room
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_winners_room_id ON winners(room_id);
CREATE INDEX IF NOT EXISTS idx_winners_user_id ON winners(user_id);
