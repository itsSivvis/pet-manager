-- Tokens issued before the last password change are rejected (see middleware/auth.js).
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;
