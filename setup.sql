-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS cloudbeds_tokens (
    id int8 PRIMARY KEY, -- Singleton: always 1
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamptz NOT NULL,
    updated_at timestamptz DEFAULT now()
);

-- Optional: Add RLS policies if needed, but this is server-side only usually.
-- ALTER TABLE cloudbeds_tokens ENABLE ROW LEVEL SECURITY;

-- Insert initial row if needed (optional, code handles upsert)
