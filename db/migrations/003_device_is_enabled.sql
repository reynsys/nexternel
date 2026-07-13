-- Device enable/disable without deleting registration
ALTER TABLE devices ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT true;
